using System.Net;
using System.Text.Json;
using Nequi.Finance.Categories;
using Nequi.Finance.Common;
using Nequi.Shared.Data;

namespace Nequi.Tests;

public sealed class CategoriesTests : IDisposable
{
    private readonly Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Nequi.Finance.FinanceMarker> _factory = Env.Finance();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task List_Empty_ReturnsEmptyArray()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var response = await http.GetAsync("/v1/categories");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Array, (await Phase4.BodyAsync(response)).ValueKind);
    }

    [Fact]
    public async Task Create_ValidCategory_Returns201()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var response = await http.PostAsync("/v1/categories", Phase4.Json(new { name = "Mercado", type = "gasto" }));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Phase4.BodyAsync(response);
        Assert.Equal("Mercado", body.GetProperty("name").GetString());
        Assert.Equal("gasto", body.GetProperty("type").GetString());
        Assert.True(body.GetProperty("active").GetBoolean());
        Assert.False(body.GetProperty("isSystem").GetBoolean());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("id").GetString()));
    }

    [Fact]
    public async Task Create_DuplicateName_Returns409_CaseInsensitive()
    {
        using var http = _factory.Client(Phase4.NewClient());

        Assert.Equal(HttpStatusCode.Created,
            (await http.PostAsync("/v1/categories", Phase4.Json(new { name = "Mercado", type = "gasto" }))).StatusCode);

        var duplicate = await http.PostAsync("/v1/categories", Phase4.Json(new { name = "mercado", type = "gasto" }));

        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Equal("CATEGORY_DUPLICATE", await Phase4.ProblemCodeAsync(duplicate));
    }

    [Fact]
    public async Task Create_SameNameDifferentType_IsAllowed()
    {
        using var http = _factory.Client(Phase4.NewClient());

        Assert.Equal(HttpStatusCode.Created,
            (await http.PostAsync("/v1/categories", Phase4.Json(new { name = "Ajuste", type = "gasto" }))).StatusCode);
        Assert.Equal(HttpStatusCode.Created,
            (await http.PostAsync("/v1/categories", Phase4.Json(new { name = "Ajuste", type = "ingreso" }))).StatusCode);
    }

    [Fact]
    public async Task Create_InvalidName_Returns422()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var response = await http.PostAsync("/v1/categories", Phase4.Json(new { name = " ", type = "gasto" }));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("VALIDATION_ERROR", await Phase4.ProblemCodeAsync(response));
    }

    [Fact]
    public async Task Update_ChangesName_AndRejectsTypeChange()
    {
        using var http = _factory.Client(Phase4.NewClient());
        var created = await Phase4.BodyAsync(
            await http.PostAsync("/v1/categories", Phase4.Json(new { name = "Mercado", type = "gasto" })));
        var id = created.GetProperty("id").GetString();

        var renamed = await http.PatchAsync($"/v1/categories/{id}",
            Phase4.Json(new { name = "Supermercado" }));
        Assert.Equal(HttpStatusCode.OK, renamed.StatusCode);
        Assert.Equal("Supermercado", (await Phase4.BodyAsync(renamed)).GetProperty("name").GetString());

        var typeChange = await http.PatchAsync($"/v1/categories/{id}",
            Phase4.Json(new { type = "ingreso" }));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, typeChange.StatusCode);
        Assert.Equal("CATEGORY_TYPE_IMMUTABLE", await Phase4.ProblemCodeAsync(typeChange));
    }

    [Fact]
    public async Task Delete_SoftDeletes_AndReleasesName()
    {
        using var http = _factory.Client(Phase4.NewClient());
        var created = await Phase4.BodyAsync(
            await http.PostAsync("/v1/categories", Phase4.Json(new { name = "Ocio", type = "gasto" })));
        var id = created.GetProperty("id").GetString();

        Assert.Equal(HttpStatusCode.NoContent,
            (await http.DeleteAsync($"/v1/categories/{id}")).StatusCode);

        var active = await Phase4.BodyAsync(await http.GetAsync("/v1/categories"));
        Assert.DoesNotContain(active.EnumerateArray(), c => c.GetProperty("id").GetString() == id);

        var all = await Phase4.BodyAsync(await http.GetAsync("/v1/categories?includeInactive=true"));
        var inactive = all.EnumerateArray().Single(c => c.GetProperty("id").GetString() == id);
        Assert.False(inactive.GetProperty("active").GetBoolean());

        // The name reservation is released: a new active category may reuse it.
        Assert.Equal(HttpStatusCode.Created,
            (await http.PostAsync("/v1/categories", Phase4.Json(new { name = "Ocio", type = "gasto" }))).StatusCode);
    }

    [Fact]
    public async Task CrossClient_AccessToOtherCategory_Returns404()
    {
        using var owner = _factory.Client(Phase4.NewClient());
        using var other = _factory.Client(Phase4.NewClient());

        var created = await Phase4.BodyAsync(
            await owner.PostAsync("/v1/categories", Phase4.Json(new { name = "Mercado", type = "gasto" })));
        var id = created.GetProperty("id").GetString();

        // There is no category detail endpoint (approved contract: GET/POST /v1/categories),
        // so isolation is verified through the list and the mutation endpoints.
        var patch = await other.PatchAsync($"/v1/categories/{id}", Phase4.Json(new { name = "Robada" }));
        Assert.Equal(HttpStatusCode.NotFound, patch.StatusCode);

        var list = await Phase4.BodyAsync(await other.GetAsync("/v1/categories"));
        Assert.DoesNotContain(list.EnumerateArray(), c => c.GetProperty("id").GetString() == id);

        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync($"/v1/categories/{id}")).StatusCode);
    }

    [Fact]
    public async Task SystemCategory_IsReadableButImmutable()
    {
        await Phase4.SeedSystemCategoryAsync(_factory.Services, "sys-salud", "Salud", "gasto");
        using var http = _factory.Client(Phase4.NewClient());

        var list = await Phase4.BodyAsync(await http.GetAsync("/v1/categories"));
        Assert.Contains(list.EnumerateArray(), c => c.GetProperty("id").GetString() == "sys-salud");

        var patch = await http.PatchAsync("/v1/categories/sys-salud", Phase4.Json(new { name = "Otra" }));
        Assert.Equal(HttpStatusCode.Forbidden, patch.StatusCode);
        Assert.Equal("SYSTEM_CATEGORY_IMMUTABLE", await Phase4.ProblemCodeAsync(patch));

        Assert.Equal(HttpStatusCode.Forbidden,
            (await http.DeleteAsync("/v1/categories/sys-salud")).StatusCode);
    }

    [Fact]
    public async Task Unauthenticated_Returns401_AndStaffReturns403()
    {
        using var anonymous = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/v1/categories")).StatusCode);

        using var staff = _factory.Client("staff-1", "SOPORTE");
        Assert.Equal(HttpStatusCode.Forbidden, (await staff.GetAsync("/v1/categories")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await staff.PostAsync("/v1/categories", Phase4.Json(new { name = "Mercado", type = "gasto" }))).StatusCode);
    }

    [Fact]
    public async Task ConcurrentCreate_SameName_OnlyOneSucceeds()
    {
        using var http = _factory.Client(Phase4.NewClient());
        var body = new { name = "Transporte", type = "gasto" };

        var responses = await Task.WhenAll(
            Enumerable.Range(0, 2).Select(async _ =>
            {
                using var response = await http.PostAsync("/v1/categories", Phase4.Json(body));
                return response.StatusCode;
            }));

        var statuses = responses.OrderBy(s => (int)s).ToList();
        Assert.Equal(new[] { HttpStatusCode.Created, HttpStatusCode.Conflict }, statuses);
    }

    [Fact]
    public async Task Create_WhenPersistenceFails_ReleasesNameReservation()
    {
        var inner = new InMemoryDocumentStore();
        var store = new FlakyDocumentStore(inner)
        {
            FailCreate = (collection, _) => collection == CategoryCollections.Categories,
        };
        var service = new CategoryService(store, new MovementReader(store));
        var owner = Phase4.NewClient();

        await Assert.ThrowsAsync<IOException>(() =>
            service.CreateAsync(owner, new CreateCategoryRequest("Mercado", "gasto"), CancellationToken.None));

        var reservations = await inner.QueryEqualsAsync("category_keys", "clientId", owner, 10, CancellationToken.None);
        Assert.Empty(reservations);

        store.FailCreate = null;
        var (outcome, category) = await service.CreateAsync(
            owner, new CreateCategoryRequest("Mercado", "gasto"), CancellationToken.None);
        Assert.Equal(CategoryCreateOutcome.Created, outcome);
        Assert.NotNull(category);
    }
}
