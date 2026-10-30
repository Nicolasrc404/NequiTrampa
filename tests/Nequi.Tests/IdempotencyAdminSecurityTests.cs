using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Nequi.Backoffice.Controllers.Financial;
using Nequi.Shared.Data;
using Nequi.Shared.Idempotency;

namespace Nequi.Tests;

public sealed class IdempotencyAdminSecurityTests
{
    // These tests verify temporary containment only. They do not prove CAS, ledger
    // correlation, or durable administrative auditing.
    [Fact]
    public async Task Release_NonexistentReservation_MustNotReportSuccessfulRelease()
    {
        var store = new InMemoryIdempotencyStore();
        var controller = CreateController(store);

        var result = await controller.Release(Request("missing", "review missing reservation"), default);

        await AssertBlocked(result);
    }

    [Fact]
    public async Task Release_ActiveReservation_MustKeepItProtected()
    {
        var store = await ReservedStore("active", "hash");
        var controller = CreateController(store);

        var result = await controller.Release(Request("active", "review active reservation"), default);

        await AssertBlocked(result);
        Assert.Equal(BeginOutcome.InProgress, await Outcome(store, "active", "hash"));
    }

    [Fact]
    public async Task Release_StaleReservationWithoutLedgerEvidence_MustKeepItProtected()
    {
        var store = await ReservedStore("stale", "hash");
        var controller = CreateController(store);

        var result = await controller.Release(Request("stale", "review stale reservation"), default);

        await AssertBlocked(result);
        Assert.Equal(BeginOutcome.InProgress, await Outcome(store, "stale", "hash"));
    }

    [Fact]
    public async Task Release_AuditFailureMustNotLeaveAnInvisibleDeletion()
    {
        var store = await ReservedStore("audit-failure", "hash");
        var documents = new FailingDocumentStore();
        var controller = CreateController(store);

        var result = await controller.Release(Request("audit-failure", "review audit failure"), default);

        await AssertBlocked(result);
        Assert.Equal(0, documents.UpsertCalls);
        Assert.Equal(BeginOutcome.InProgress, await Outcome(store, "audit-failure", "hash"));
    }

    [Fact]
    public async Task Release_RetryKeepsOriginalReservationAndRejectsDifferentHash()
    {
        var store = await ReservedStore("reused", "old-hash");
        var controller = CreateController(store);
        var request = Request("reused", "review reused reservation");

        await AssertBlocked(await controller.Release(request, default));
        Assert.Equal(BeginOutcome.InProgress, await Outcome(store, "reused", "old-hash"));
        await AssertBlocked(await controller.Release(request, default));

        Assert.Equal(BeginOutcome.InProgress, await Outcome(store, "reused", "old-hash"));
        Assert.Equal(BeginOutcome.Conflict, await Outcome(store, "reused", "new-hash"));
    }

    [Fact]
    public async Task Release_ConcurrentOperatorsMustNotRemoveTheReservationWithoutAClaim()
    {
        var store = await ReservedStore("concurrent", "hash");
        var first = CreateController(store);
        var second = CreateController(store);

        var results = await Task.WhenAll(
            first.Release(Request("concurrent", "operator one review"), default),
            second.Release(Request("concurrent", "operator two review"), default));

        foreach (var result in results)
            await AssertBlocked(result);
        Assert.Equal(BeginOutcome.InProgress, await Outcome(store, "concurrent", "hash"));
    }

    private static async Task AssertBlocked(IActionResult result)
    {
        Assert.IsNotType<NoContentResult>(result);
        using var services = new ServiceCollection()
            .AddLogging()
            .AddOptions()
            .AddMvcCore()
            .Services
            .BuildServiceProvider();
        var http = new DefaultHttpContext { RequestServices = services };
        http.Response.Body = new MemoryStream();
        var action = new ActionContext(http, new RouteData(), new ControllerActionDescriptor());

        await result.ExecuteResultAsync(action);

        Assert.Equal(StatusCodes.Status409Conflict, http.Response.StatusCode);
        http.Response.Body.Position = 0;
        using var document = await JsonDocument.ParseAsync(http.Response.Body);
        Assert.Equal("idempotency_release_disabled", document.RootElement.GetProperty("code").GetString());
    }

    private static IdempotencyAdminController CreateController(IIdempotencyStore store)
    {
        var controller = new IdempotencyAdminController(store);
        var http = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([
                new Claim("user_id", "operator"),
                new Claim(ClaimTypes.Role, "OPERADOR_FINANCIERO")
            ], "test"))
        };
        controller.ControllerContext = new ControllerContext { HttpContext = http };
        return controller;
    }

    private static ReleaseIdempotencyKeyRequest Request(string key, string reason) =>
        new("actor", "POST:/v1/test", key, reason);

    private static async Task<InMemoryIdempotencyStore> ReservedStore(string key, string hash)
    {
        var store = new InMemoryIdempotencyStore();
        var (outcome, _) = await store.BeginAsync("actor", "POST:/v1/test", key, hash, default);
        Assert.Equal(BeginOutcome.Started, outcome);
        return store;
    }

    private static async Task<BeginOutcome> Outcome(IIdempotencyStore store, string key, string hash)
    {
        var (outcome, _) = await store.BeginAsync("actor", "POST:/v1/test", key, hash, default);
        return outcome;
    }

    private sealed class FailingDocumentStore : IDocumentStore
    {
        public int UpsertCalls { get; private set; }
        public Task<bool> CreateIfAbsentAsync(string collection, string id, IDictionary<string, object?> data, CancellationToken ct) => throw new IOException("audit unavailable");
        public Task UpsertAsync(string collection, string id, IDictionary<string, object?> data, CancellationToken ct)
        {
            UpsertCalls++;
            throw new IOException("audit unavailable");
        }
        public Task<IDictionary<string, object?>?> GetAsync(string collection, string id, CancellationToken ct) => throw new IOException("audit unavailable");
        public Task<bool> DeleteAsync(string collection, string id, CancellationToken ct) => throw new IOException("audit unavailable");
        public Task<IReadOnlyList<IDictionary<string, object?>>> QueryEqualsAsync(string collection, string field, object value, int limit, CancellationToken ct) => throw new IOException("audit unavailable");
        public Task<IReadOnlyList<IDictionary<string, object?>>> QueryOrderedAsync(string collection, string field, object value, string orderByField, int limit, CancellationToken ct) => throw new IOException("audit unavailable");
        public Task<IReadOnlyList<IDictionary<string, object?>>> ListAsync(string collection, string orderByField, int limit, CancellationToken ct) => throw new IOException("audit unavailable");
        public Task<IReadOnlyList<IDictionary<string, object?>>> QueryOrderedPageAsync(string collection, string field, object value, string orderByField, string tieBreakerField, int limit, string? afterOrderValue, string? afterTieValue, CancellationToken ct) => throw new IOException("audit unavailable");
        public Task PingAsync(CancellationToken ct) => throw new IOException("audit unavailable");
    }
}
