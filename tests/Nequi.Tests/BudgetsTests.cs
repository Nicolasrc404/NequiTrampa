using System.Net;
using Nequi.Shared.Data;

namespace Nequi.Tests;

public sealed class BudgetsTests : IDisposable
{
    private readonly Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Nequi.Finance.FinanceMarker> _factory = Env.Finance();

    public void Dispose() => _factory.Dispose();

    private static async Task<string> CreateCategoryAsync(HttpClient http, string name = "Mercado")
    {
        var created = await Phase4.BodyAsync(
            await http.PostAsync("/v1/categories", Phase4.Json(new { name, type = "gasto" })));
        return created.GetProperty("id").GetString()!;
    }

    [Fact]
    public async Task Create_ValidBudget_Returns201_WithComputedFields()
    {
        using var http = _factory.Client(Phase4.NewClient());
        var categoryId = await CreateCategoryAsync(http);

        var response = await http.PostAsync("/v1/budgets", Phase4.Json(new
        {
            categoryId,
            period = "2026-10",
            limitCents = 40_000_000,
        }));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Phase4.BodyAsync(response);
        Assert.Equal(categoryId, body.GetProperty("categoryId").GetString());
        Assert.Equal("Mercado", body.GetProperty("categoryName").GetString());
        Assert.Equal(40_000_000, body.GetProperty("limitCents").GetInt64());
        Assert.Equal(0, body.GetProperty("spentCents").GetInt64());
        Assert.Equal("on-track", body.GetProperty("health").GetString());
    }

    [Fact]
    public async Task Create_DuplicateScope_Returns409()
    {
        using var http = _factory.Client(Phase4.NewClient());
        var categoryId = await CreateCategoryAsync(http);
        var body = new { categoryId, period = "2026-10", limitCents = 10_000_000 };

        Assert.Equal(HttpStatusCode.Created,
            (await http.PostAsync("/v1/budgets", Phase4.Json(body))).StatusCode);

        var duplicate = await http.PostAsync("/v1/budgets", Phase4.Json(body));
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Equal("BUDGET_DUPLICATE", await Phase4.ProblemCodeAsync(duplicate));
    }

    [Fact]
    public async Task Create_InvalidPeriodAndCategory_Return422()
    {
        using var http = _factory.Client(Phase4.NewClient());
        var categoryId = await CreateCategoryAsync(http);

        var badPeriod = await http.PostAsync("/v1/budgets",
            Phase4.Json(new { categoryId, period = "2026-13", limitCents = 1_000_000 }));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, badPeriod.StatusCode);
        Assert.Equal("VALIDATION_ERROR", await Phase4.ProblemCodeAsync(badPeriod));

        var badCategory = await http.PostAsync("/v1/budgets",
            Phase4.Json(new { categoryId = "does-not-exist", period = "2026-10", limitCents = 1_000_000 }));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, badCategory.StatusCode);
        Assert.Equal("INVALID_CATEGORY", await Phase4.ProblemCodeAsync(badCategory));

        var zeroLimit = await http.PostAsync("/v1/budgets",
            Phase4.Json(new { categoryId, period = "2026-10", limitCents = 0 }));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, zeroLimit.StatusCode);
    }

    [Fact]
    public async Task List_InvalidPeriodFilter_Returns400()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var response = await http.GetAsync("/v1/budgets?period=2026-13");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_period", await Phase4.ProblemCodeAsync(response));
    }

    [Fact]
    public async Task Consumption_UsesOnlyCompletedMovements_AndPatchRecalculates()
    {
        var owner = Phase4.NewClient();
        using var http = _factory.Client(owner);
        var categoryId = await CreateCategoryAsync(http);

        var created = await Phase4.BodyAsync(await http.PostAsync("/v1/budgets", Phase4.Json(new
        {
            categoryId,
            period = "2026-10",
            limitCents = 100_000,
        })));
        var budgetId = created.GetProperty("id").GetString()!;

        await Phase4.SeedMovementAsync(_factory.Services, owner, "mov-1", -80_000,
            new DateTimeOffset(2026, 10, 5, 12, 0, 0, TimeSpan.Zero), categoryId: categoryId);
        await Phase4.SeedMovementAsync(_factory.Services, owner, "mov-pending", -999_999,
            new DateTimeOffset(2026, 10, 6, 12, 0, 0, TimeSpan.Zero), status: "PENDING", categoryId: categoryId);
        await Phase4.SeedMovementAsync(_factory.Services, owner, "mov-sept", -500_000,
            new DateTimeOffset(2026, 9, 20, 12, 0, 0, TimeSpan.Zero), categoryId: categoryId);

        var list = await Phase4.BodyAsync(await http.GetAsync("/v1/budgets?period=2026-10"));
        var budget = list.EnumerateArray().Single(b => b.GetProperty("id").GetString() == budgetId);
        Assert.Equal(80_000, budget.GetProperty("spentCents").GetInt64());
        Assert.Equal(80, budget.GetProperty("percent").GetInt32());
        Assert.Equal("warning", budget.GetProperty("health").GetString());

        var patched = await http.PatchAsync($"/v1/budgets/{budgetId}",
            Phase4.Json(new { limitCents = 50_000 }));
        Assert.Equal(HttpStatusCode.OK, patched.StatusCode);
        var detail = await Phase4.BodyAsync(patched);
        Assert.Equal(160, detail.GetProperty("percent").GetInt32());
        Assert.Equal("exceeded", detail.GetProperty("health").GetString());
        Assert.Equal(-30_000, detail.GetProperty("remainingCents").GetInt64());

        var detailGet = await http.GetAsync($"/v1/budgets/{budgetId}");
        Assert.Equal(HttpStatusCode.OK, detailGet.StatusCode);
        var expenses = (await Phase4.BodyAsync(detailGet)).GetProperty("expenses");
        Assert.Single(expenses.EnumerateArray());
    }

    [Fact]
    public async Task Update_ImmutableScope_Returns422()
    {
        using var http = _factory.Client(Phase4.NewClient());
        var categoryId = await CreateCategoryAsync(http);
        var created = await Phase4.BodyAsync(await http.PostAsync("/v1/budgets", Phase4.Json(new
        {
            categoryId,
            period = "2026-10",
            limitCents = 10_000,
        })));
        var budgetId = created.GetProperty("id").GetString();

        var response = await http.PatchAsync($"/v1/budgets/{budgetId}",
            Phase4.Json(new { period = "2026-11" }));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("BUDGET_SCOPE_IMMUTABLE", await Phase4.ProblemCodeAsync(response));
    }

    [Fact]
    public async Task CrossClient_BudgetAccess_Returns404()
    {
        using var owner = _factory.Client(Phase4.NewClient());
        using var other = _factory.Client(Phase4.NewClient());
        var categoryId = await CreateCategoryAsync(owner);
        var created = await Phase4.BodyAsync(await owner.PostAsync("/v1/budgets", Phase4.Json(new
        {
            categoryId,
            period = "2026-10",
            limitCents = 10_000,
        })));
        var budgetId = created.GetProperty("id").GetString();

        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/v1/budgets/{budgetId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await other.PatchAsync($"/v1/budgets/{budgetId}", Phase4.Json(new { limitCents = 1 }))).StatusCode);

        var otherList = await Phase4.BodyAsync(await other.GetAsync("/v1/budgets"));
        Assert.DoesNotContain(otherList.EnumerateArray(), b => b.GetProperty("id").GetString() == budgetId);
    }

    [Fact]
    public async Task Unauthenticated_Returns401_AndStaffReturns403()
    {
        using var anonymous = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/v1/budgets")).StatusCode);

        using var staff = _factory.Client("staff-1", "ADMIN");
        Assert.Equal(HttpStatusCode.Forbidden, (await staff.GetAsync("/v1/budgets")).StatusCode);
    }
}
