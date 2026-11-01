using System.Net;
using Nequi.Finance.Cash;

namespace Nequi.Tests;

public sealed class CashTests : IDisposable
{
    private readonly Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Nequi.Finance.FinanceMarker> _factory = Env.Finance();

    public void Dispose() => _factory.Dispose();

    private static object Entry(
        string direction, long amountCents, string? note = "cafe", string? categoryId = null,
        string? occurredOn = "2026-10-05") =>
        new { direction, amountCents, note, categoryId, occurredOn };

    private static async Task<HttpResponseMessage> RegisterAsync(
        HttpClient http, object body, string? key = null) =>
        await http.SendAsync(Phase4.Post("/v1/cash/movements", body, key ?? Guid.NewGuid().ToString()));

    [Fact]
    public async Task Balance_StartsAtZero()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var response = await http.GetAsync("/v1/cash/balance");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Phase4.BodyAsync(response);
        Assert.Equal(0, body.GetProperty("availableCents").GetInt64());
        Assert.Equal(0, body.GetProperty("movementCount").GetInt32());
        Assert.Equal("COP", body.GetProperty("currency").GetString());
    }

    [Fact]
    public async Task Income_ThenExpense_UpdatesBalanceAndHistory()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var income = await RegisterAsync(http, Entry("income", 100_000));
        Assert.Equal(HttpStatusCode.Created, income.StatusCode);
        var incomeBody = await Phase4.BodyAsync(income);
        Assert.Equal(100_000, incomeBody.GetProperty("balance").GetProperty("availableCents").GetInt64());

        var expense = await RegisterAsync(http, Entry("expense", 60_000, note: "mercado"));
        Assert.Equal(HttpStatusCode.Created, expense.StatusCode);

        var balance = await Phase4.BodyAsync(await http.GetAsync("/v1/cash/balance"));
        Assert.Equal(40_000, balance.GetProperty("availableCents").GetInt64());
        Assert.Equal(100_000, balance.GetProperty("incomeCents").GetInt64());
        Assert.Equal(60_000, balance.GetProperty("expenseCents").GetInt64());
        Assert.Equal(2, balance.GetProperty("movementCount").GetInt32());

        var history = await Phase4.BodyAsync(await http.GetAsync("/v1/cash/movements"));
        Assert.Equal(2, history.GetArrayLength());
    }

    [Fact]
    public async Task Expense_AboveAvailableCash_Returns422_AndKeepsState()
    {
        using var http = _factory.Client(Phase4.NewClient());
        await RegisterAsync(http, Entry("income", 10_000));

        var response = await RegisterAsync(http, Entry("expense", 25_000));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("CASH_INSUFFICIENT", await Phase4.ProblemCodeAsync(response));

        var balance = await Phase4.BodyAsync(await http.GetAsync("/v1/cash/balance"));
        Assert.Equal(10_000, balance.GetProperty("availableCents").GetInt64());
        Assert.Equal(1, balance.GetProperty("movementCount").GetInt32());
    }

    [Fact]
    public async Task IdenticalEntries_WithDifferentIntentions_AreBothCreated()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var first = await RegisterAsync(http, Entry("income", 10_000));
        var second = await RegisterAsync(http, Entry("income", 10_000));

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Created, second.StatusCode);
        var firstId = (await Phase4.BodyAsync(first)).GetProperty("movement").GetProperty("id").GetString();
        var secondId = (await Phase4.BodyAsync(second)).GetProperty("movement").GetProperty("id").GetString();
        Assert.NotEqual(firstId, secondId);

        var balance = await Phase4.BodyAsync(await http.GetAsync("/v1/cash/balance"));
        Assert.Equal(20_000, balance.GetProperty("availableCents").GetInt64());
        Assert.Equal(2, balance.GetProperty("movementCount").GetInt32());
    }

    [Fact]
    public async Task Store_RepeatedIntentionKey_IsRejected_ButDifferentKeysCreateIndependentEntries()
    {
        var store = new InMemoryCashStore();
        var owner = Phase4.NewClient();

        var first = await store.AppendAsync(owner, Draft("m1", "income", 10_000, "intent-1"), CancellationToken.None);
        var replay = await store.AppendAsync(owner, Draft("m2", "income", 10_000, "intent-1"), CancellationToken.None);
        var independent = await store.AppendAsync(owner, Draft("m3", "income", 10_000, "intent-2"), CancellationToken.None);

        Assert.Equal(CashAppendOutcome.Created, first.Outcome);
        Assert.Equal(CashAppendOutcome.Duplicate, replay.Outcome);
        Assert.Equal(CashAppendOutcome.Created, independent.Outcome);
        Assert.Equal(20_000, (await store.ReadAccountAsync(owner, CancellationToken.None)).AvailableCents);
    }

    [Fact]
    public async Task UnknownOrForeignCategory_Returns404()
    {
        using var owner = _factory.Client(Phase4.NewClient());
        using var other = _factory.Client(Phase4.NewClient());
        var category = await Phase4.BodyAsync(
            await owner.PostAsync("/v1/categories", Phase4.Json(new { name = "Mercado", type = "gasto" })));
        var categoryId = category.GetProperty("id").GetString();

        var foreign = await RegisterAsync(other, Entry("expense", 10_000, categoryId: categoryId));
        Assert.Equal(HttpStatusCode.NotFound, foreign.StatusCode);
        Assert.Equal("CATEGORY_NOT_FOUND", await Phase4.ProblemCodeAsync(foreign));
    }

    [Fact]
    public async Task CategoryName_IsSnapshottedOnEntry()
    {
        using var http = _factory.Client(Phase4.NewClient());
        var category = await Phase4.BodyAsync(
            await http.PostAsync("/v1/categories", Phase4.Json(new { name = "Mercado", type = "gasto" })));
        var categoryId = category.GetProperty("id").GetString();

        await RegisterAsync(http, Entry("income", 5_000, categoryId: categoryId));
        var history = await Phase4.BodyAsync(await http.GetAsync("/v1/cash/movements"));
        var entry = history.EnumerateArray().Single();

        Assert.Equal(categoryId, entry.GetProperty("categoryId").GetString());
        Assert.Equal("Mercado", entry.GetProperty("categoryName").GetString());
    }

    [Fact]
    public async Task FutureDate_Returns422_AndBadFormatReturns422()
    {
        using var http = _factory.Client(Phase4.NewClient());
        var future = DateTimeOffset.UtcNow.AddDays(5).ToString("yyyy-MM-dd");

        var futureResponse = await RegisterAsync(http, Entry("income", 1_000, occurredOn: future));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, futureResponse.StatusCode);

        var badFormat = await RegisterAsync(http, Entry("income", 1_000, occurredOn: "05/10/2026"));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, badFormat.StatusCode);
    }

    [Fact]
    public async Task Post_RequiresIdempotencyKey_ReplaysAndRejectsBodyMismatch()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var missing = await http.PostAsync("/v1/cash/movements", Phase4.Json(Entry("income", 10_000)));
        Assert.Equal(HttpStatusCode.BadRequest, missing.StatusCode);
        Assert.Equal("idempotency_key_required", await Phase4.ProblemCodeAsync(missing));

        var key = Guid.NewGuid().ToString();
        var first = await http.SendAsync(Phase4.Post("/v1/cash/movements", Entry("income", 10_000), key));
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        var firstId = (await Phase4.BodyAsync(first)).GetProperty("movement").GetProperty("id").GetString();

        var replay = await http.SendAsync(Phase4.Post("/v1/cash/movements", Entry("income", 10_000), key));
        Assert.Equal(HttpStatusCode.Created, replay.StatusCode);
        Assert.Equal("true", replay.Headers.GetValues("Idempotent-Replayed").Single());
        var replayId = (await Phase4.BodyAsync(replay)).GetProperty("movement").GetProperty("id").GetString();
        Assert.Equal(firstId, replayId);

        var mismatch = await http.SendAsync(Phase4.Post("/v1/cash/movements", Entry("income", 99_000), key));
        Assert.Equal(HttpStatusCode.Conflict, mismatch.StatusCode);
        Assert.Equal("idempotency_key_conflict", await Phase4.ProblemCodeAsync(mismatch));

        var balance = await Phase4.BodyAsync(await http.GetAsync("/v1/cash/balance"));
        Assert.Equal(10_000, balance.GetProperty("availableCents").GetInt64());
        Assert.Equal(1, balance.GetProperty("movementCount").GetInt32());
    }

    [Fact]
    public async Task CrossClient_CashIsIsolated()
    {
        using var owner = _factory.Client(Phase4.NewClient());
        using var other = _factory.Client(Phase4.NewClient());
        await RegisterAsync(owner, Entry("income", 70_000));

        var otherBalance = await Phase4.BodyAsync(await other.GetAsync("/v1/cash/balance"));
        Assert.Equal(0, otherBalance.GetProperty("availableCents").GetInt64());

        var otherHistory = await Phase4.BodyAsync(await other.GetAsync("/v1/cash/movements"));
        Assert.Equal(0, otherHistory.GetArrayLength());
    }

    [Fact]
    public async Task ConcurrentExpenses_CannotOverdraw()
    {
        using var http = _factory.Client(Phase4.NewClient());
        await RegisterAsync(http, Entry("income", 100_000));

        var statuses = (await Task.WhenAll(
                Enumerable.Range(0, 2).Select(async i =>
                {
                    using var response = await RegisterAsync(http,
                        Entry("expense", 60_000, note: $"gasto-{i}"));
                    return response.StatusCode;
                })))
            .OrderBy(s => (int)s)
            .ToList();

        Assert.Equal(new[] { HttpStatusCode.Created, HttpStatusCode.UnprocessableEntity }, statuses);

        var balance = await Phase4.BodyAsync(await http.GetAsync("/v1/cash/balance"));
        Assert.Equal(40_000, balance.GetProperty("availableCents").GetInt64());
        Assert.Equal(2, balance.GetProperty("movementCount").GetInt32());
    }

    [Fact]
    public async Task Unauthenticated_Returns401_AndStaffReturns403()
    {
        using var anonymous = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/v1/cash/balance")).StatusCode);

        using var staff = _factory.Client("staff-1", "SOPORTE");
        Assert.Equal(HttpStatusCode.Forbidden, (await staff.GetAsync("/v1/cash/balance")).StatusCode);
    }

    [Fact]
    public async Task Store_ConcurrentAppends_AreAtomic()
    {
        var store = new InMemoryCashStore();
        var owner = Phase4.NewClient();

        var income = await store.AppendAsync(owner, Draft("m0", "income", 100_000, "k0"), CancellationToken.None);
        Assert.Equal(CashAppendOutcome.Created, income.Outcome);

        var results = await Task.WhenAll(
            store.AppendAsync(owner, Draft("m1", "expense", 60_000, "k1"), CancellationToken.None),
            store.AppendAsync(owner, Draft("m2", "expense", 60_000, "k2"), CancellationToken.None));

        Assert.Single(results, r => r.Outcome == CashAppendOutcome.Created);
        Assert.Single(results, r => r.Outcome == CashAppendOutcome.InsufficientCash);

        var account = await store.ReadAccountAsync(owner, CancellationToken.None);
        Assert.Equal(40_000, account.AvailableCents);
        Assert.Equal(2, account.MovementCount);
    }

    [Fact]
    public async Task Movements_Empty_NoNextCursorHeader()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var response = await http.GetAsync("/v1/cash/movements");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("X-Next-Cursor"));
    }

    [Fact]
    public async Task Movements_MultiplePages_CursorHeaderCoversAllRowsExactlyOnceInOrder()
    {
        using var http = _factory.Client(Phase4.NewClient());

        // 5 income entries, newest occurredOn first once sorted: day-5 .. day-1.
        for (var i = 1; i <= 5; i++)
            await RegisterAsync(http, Entry("income", 1_000 * i, occurredOn: $"2026-01-0{i}"));

        var seenOccurredOn = new List<string>();
        var seenIds = new List<string>();
        string? cursor = null;
        for (var page = 0; page < 10; page++)
        {
            var url = cursor is null ? "/v1/cash/movements?limit=2" : $"/v1/cash/movements?limit=2&cursor={Uri.EscapeDataString(cursor)}";
            var response = await http.GetAsync(url);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var body = await Phase4.BodyAsync(response);
            foreach (var m in body.EnumerateArray())
            {
                seenIds.Add(m.GetProperty("id").GetString()!);
                seenOccurredOn.Add(m.GetProperty("occurredOn").GetString()!);
            }

            cursor = response.Headers.TryGetValues("X-Next-Cursor", out var values) ? values.First() : null;
            if (cursor is null) break;
        }

        Assert.Equal(5, seenIds.Distinct().Count());
        Assert.Equal(["2026-01-05", "2026-01-04", "2026-01-03", "2026-01-02", "2026-01-01"], seenOccurredOn);
    }

    [Fact]
    public async Task Movements_SameOccurredOn_PaginatesWithoutSkippingOrDuplicating()
    {
        using var http = _factory.Client(Phase4.NewClient());

        await RegisterAsync(http, Entry("income", 1_000, occurredOn: "2026-02-01"));
        await RegisterAsync(http, Entry("income", 2_000, occurredOn: "2026-02-01"));

        var first = await http.GetAsync("/v1/cash/movements?limit=1");
        var firstId = (await Phase4.BodyAsync(first))[0].GetProperty("id").GetString();
        var cursor = first.Headers.TryGetValues("X-Next-Cursor", out var v1) ? v1.First() : null;
        Assert.NotNull(cursor);

        var second = await http.GetAsync($"/v1/cash/movements?limit=1&cursor={Uri.EscapeDataString(cursor!)}");
        var secondId = (await Phase4.BodyAsync(second))[0].GetProperty("id").GetString();

        Assert.NotEqual(firstId, secondId);
        Assert.False(second.Headers.Contains("X-Next-Cursor"));
    }

    [Fact]
    public async Task Movements_InvalidCursor_Returns400()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var response = await http.GetAsync("/v1/cash/movements?cursor=not-valid-base64!!");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_cursor", await Phase4.ProblemCodeAsync(response));
    }

    private static CashMovementDraft Draft(string id, string direction, long amount, string dedupe) =>
        new(id, direction, amount, null, null, null, "2026-10-05", dedupe, DateTimeOffset.UtcNow);
}
