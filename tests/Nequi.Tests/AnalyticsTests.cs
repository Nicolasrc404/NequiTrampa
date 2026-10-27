using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Nequi.Shared.Data;
using Nequi.Shared.Events;
using Nequi.Workers.Projection;

namespace Nequi.Tests;

public sealed class AnalyticsTests : IDisposable
{
    private readonly Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Nequi.Finance.FinanceMarker> _factory = Env.Finance();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task Summary_NoMovements_ReturnsZerosAndCurrentPeriod()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var response = await http.GetAsync("/v1/analytics/summary?period=2026-10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Phase4.BodyAsync(response);
        Assert.Equal("2026-10", body.GetProperty("period").GetString());
        Assert.Equal("Octubre de 2026", body.GetProperty("periodLabel").GetString());
        Assert.Equal(0, body.GetProperty("incomeCents").GetInt64());
        Assert.Equal(0, body.GetProperty("expenseCents").GetInt64());
        Assert.Equal(0, body.GetProperty("netCents").GetInt64());
        Assert.Equal(0, body.GetProperty("movementCount").GetInt32());
        Assert.Equal("2026-09", body.GetProperty("previousPeriod").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("incomeChangePercent").ValueKind);
    }

    [Fact]
    public async Task Summary_CountsOnlyCompletedMovements_AndComparesPreviousMonth()
    {
        var owner = Phase4.NewClient();
        using var http = _factory.Client(owner);

        await Phase4.SeedMovementAsync(_factory.Services, owner, "oct-in", 500_000,
            new DateTimeOffset(2026, 10, 3, 15, 0, 0, TimeSpan.Zero));
        await Phase4.SeedMovementAsync(_factory.Services, owner, "oct-out", -200_000,
            new DateTimeOffset(2026, 10, 10, 15, 0, 0, TimeSpan.Zero));
        await Phase4.SeedMovementAsync(_factory.Services, owner, "oct-pending", 999_999,
            new DateTimeOffset(2026, 10, 11, 15, 0, 0, TimeSpan.Zero), status: "PENDING");
        await Phase4.SeedMovementAsync(_factory.Services, owner, "sep-in", 400_000,
            new DateTimeOffset(2026, 9, 10, 15, 0, 0, TimeSpan.Zero));
        await Phase4.SeedMovementAsync(_factory.Services, owner, "sep-out", -100_000,
            new DateTimeOffset(2026, 9, 11, 15, 0, 0, TimeSpan.Zero));

        var body = await Phase4.BodyAsync(await http.GetAsync("/v1/analytics/summary?period=2026-10"));

        Assert.Equal(500_000, body.GetProperty("incomeCents").GetInt64());
        Assert.Equal(200_000, body.GetProperty("expenseCents").GetInt64());
        Assert.Equal(300_000, body.GetProperty("netCents").GetInt64());
        Assert.Equal(2, body.GetProperty("movementCount").GetInt32());
        Assert.Equal(400_000, body.GetProperty("previousIncomeCents").GetInt64());
        Assert.Equal(100_000, body.GetProperty("previousExpenseCents").GetInt64());
        Assert.Equal(25, body.GetProperty("incomeChangePercent").GetInt32());
        Assert.Equal(100, body.GetProperty("expenseChangePercent").GetInt32());
    }

    [Fact]
    public async Task Categories_GroupsConfirmedExpenses_AndKeepsUncategorizedBucket()
    {
        var owner = Phase4.NewClient();
        using var http = _factory.Client(owner);
        var category = await Phase4.BodyAsync(
            await http.PostAsync("/v1/categories", Phase4.Json(new { name = "Mercado", type = "gasto" })));
        var categoryId = category.GetProperty("id").GetString();

        await Phase4.SeedMovementAsync(_factory.Services, owner, "cat-out", -200_000,
            new DateTimeOffset(2026, 10, 4, 15, 0, 0, TimeSpan.Zero), categoryId: categoryId);
        await Phase4.SeedMovementAsync(_factory.Services, owner, "no-cat-out", -50_000,
            new DateTimeOffset(2026, 10, 5, 15, 0, 0, TimeSpan.Zero));
        await Phase4.SeedMovementAsync(_factory.Services, owner, "cat-in", 300_000,
            new DateTimeOffset(2026, 10, 6, 15, 0, 0, TimeSpan.Zero), categoryId: categoryId);

        var body = await Phase4.BodyAsync(await http.GetAsync("/v1/analytics/categories?period=2026-10"));

        Assert.Equal(250_000, body.GetProperty("totalExpenseCents").GetInt64());
        Assert.Equal(50_000, body.GetProperty("uncategorizedCents").GetInt64());
        var bucket = body.GetProperty("categories").EnumerateArray().Single();
        Assert.Equal(categoryId, bucket.GetProperty("categoryId").GetString());
        Assert.Equal("Mercado", bucket.GetProperty("name").GetString());
        Assert.Equal(200_000, bucket.GetProperty("amountCents").GetInt64());
        Assert.Equal(80, bucket.GetProperty("percent").GetInt32());
        Assert.Equal(1, bucket.GetProperty("movementCount").GetInt32());
    }

    [Fact]
    public async Task ProjectedCategory_FlowsIntoCategoryBuckets_WhileLegacyExpenseStaysUncategorized()
    {
        var owner = Phase4.NewClient();
        using var http = _factory.Client(owner);
        var category = await Phase4.BodyAsync(
            await http.PostAsync("/v1/categories", Phase4.Json(new { name = "Mercado", type = "gasto" })));
        var categoryId = category.GetProperty("id").GetString();

        var docs = _factory.Services.GetRequiredService<IDocumentStore>();
        var projection = new ProjectionService(docs, NullLogger<ProjectionService>.Instance);

        // Categories travel from the outbox event to the projection. Events written before
        // categorization existed must keep working as "Sin categoría".
        await projection.ApplyAsync(new DomainEvent(
            "evt-cat", EventTypes.TransferCompleted, "op-evt-cat", owner,
            new DateTimeOffset(2026, 10, 4, 15, 0, 0, TimeSpan.Zero), -200_000, "COP",
            CategoryId: categoryId), default);
        await projection.ApplyAsync(new DomainEvent(
            "evt-legacy", EventTypes.TransferCompleted, "op-evt-legacy", owner,
            new DateTimeOffset(2026, 10, 5, 15, 0, 0, TimeSpan.Zero), -50_000, "COP"), default);

        var body = await Phase4.BodyAsync(await http.GetAsync("/v1/analytics/categories?period=2026-10"));

        Assert.Equal(250_000, body.GetProperty("totalExpenseCents").GetInt64());
        Assert.Equal(50_000, body.GetProperty("uncategorizedCents").GetInt64());
        var bucket = body.GetProperty("categories").EnumerateArray().Single();
        Assert.Equal(categoryId, bucket.GetProperty("categoryId").GetString());
        Assert.Equal("Mercado", bucket.GetProperty("name").GetString());
        Assert.Equal(200_000, bucket.GetProperty("amountCents").GetInt64());
        Assert.Equal(1, bucket.GetProperty("movementCount").GetInt32());
    }

    [Fact]
    public async Task Trends_ReturnsWeeklyBucketsInBusinessTimezone()
    {
        var owner = Phase4.NewClient();
        using var http = _factory.Client(owner);

        await Phase4.SeedMovementAsync(_factory.Services, owner, "w1-in", 650_000,
            new DateTimeOffset(2026, 10, 3, 15, 0, 0, TimeSpan.Zero));
        await Phase4.SeedMovementAsync(_factory.Services, owner, "w2-out", -400_000,
            new DateTimeOffset(2026, 10, 10, 15, 0, 0, TimeSpan.Zero));

        var body = await Phase4.BodyAsync(await http.GetAsync("/v1/analytics/trends?period=2026-10"));
        var weeks = body.GetProperty("weeks").EnumerateArray().ToList();

        Assert.Equal(5, weeks.Count);
        Assert.Equal("S1", weeks[0].GetProperty("label").GetString());
        Assert.Equal(650_000, weeks[0].GetProperty("incomeCents").GetInt64());
        Assert.Equal(400_000, weeks[1].GetProperty("expenseCents").GetInt64());
        Assert.Equal(0, weeks[2].GetProperty("incomeCents").GetInt64());
    }

    [Fact]
    public async Task InvalidPeriod_Returns400()
    {
        using var http = _factory.Client(Phase4.NewClient());

        foreach (var path in new[] { "summary", "categories", "trends" })
        {
            var response = await http.GetAsync($"/v1/analytics/{path}?period=2026-13");
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Equal("invalid_period", await Phase4.ProblemCodeAsync(response));
        }
    }

    [Fact]
    public async Task CrossClient_AnalyticsIsIsolated()
    {
        var owner = Phase4.NewClient();
        using var other = _factory.Client(Phase4.NewClient());
        await Phase4.SeedMovementAsync(_factory.Services, owner, "owner-in", 900_000,
            new DateTimeOffset(2026, 10, 3, 15, 0, 0, TimeSpan.Zero));

        var summary = await Phase4.BodyAsync(await other.GetAsync("/v1/analytics/summary?period=2026-10"));
        var categories = await Phase4.BodyAsync(await other.GetAsync("/v1/analytics/categories?period=2026-10"));

        Assert.Equal(0, summary.GetProperty("incomeCents").GetInt64());
        Assert.Equal(0, categories.GetProperty("totalExpenseCents").GetInt64());
    }

    [Fact]
    public async Task Unauthenticated_Returns401_AndStaffReturns403()
    {
        using var anonymous = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await anonymous.GetAsync("/v1/analytics/summary")).StatusCode);

        using var staff = _factory.Client("staff-1", "SOPORTE");
        Assert.Equal(HttpStatusCode.Forbidden,
            (await staff.GetAsync("/v1/analytics/summary")).StatusCode);
    }
}
