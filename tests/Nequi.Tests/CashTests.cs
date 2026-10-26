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
    public async Task IdenticalEntry_Returns409()
    {
        using var http = _factory.Client(Phase4.NewClient());
        await RegisterAsync(http, Entry("income", 10_000));

        var duplicate = await RegisterAsync(http, Entry("income", 10_000));

        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Equal("CASH_DUPLICATE", await Phase4.ProblemCodeAsync(duplicate));
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

    private static CashMovementDraft Draft(string id, string direction, long amount, string dedupe) =>
        new(id, direction, amount, null, null, null, "2026-10-05", dedupe, DateTimeOffset.UtcNow);
}
