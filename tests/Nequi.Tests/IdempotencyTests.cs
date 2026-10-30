using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Nequi.Shared.Idempotency;
using Nequi.Workers.Idempotency;

namespace Nequi.Tests;

/// <summary>
/// A store wrapper that throws on the first CompleteAsync call, so tests can reproduce the exact
/// failure mode of AUD-001: the business action already succeeded (status &lt; 500) but the
/// filter's own bookkeeping call fails afterwards. Tracks whether AbandonAsync ran so the fix
/// (never abandon after a successful action) is directly observable.
/// </summary>
internal sealed class ThrowOnceOnCompleteStore : IIdempotencyStore
{
    private readonly InMemoryIdempotencyStore _inner = new();
    private bool _thrown;

    public bool AbandonCalled { get; private set; }

    public Task<(BeginOutcome, IdempotencyRecord?)> BeginAsync(string actorId, string scope, string key, string requestHash, CancellationToken ct) =>
        _inner.BeginAsync(actorId, scope, key, requestHash, ct);

    public Task CompleteAsync(string actorId, string scope, string key, int statusCode, string? body, string? contentType, CancellationToken ct)
    {
        if (!_thrown)
        {
            _thrown = true;
            throw new IOException("simulated transient Spanner failure");
        }
        return _inner.CompleteAsync(actorId, scope, key, statusCode, body, contentType, ct);
    }

    public Task AbandonAsync(string actorId, string scope, string key, CancellationToken ct)
    {
        AbandonCalled = true;
        return _inner.AbandonAsync(actorId, scope, key, ct);
    }

    public Task<IReadOnlyList<IdempotencyRecord>> FindStaleInProgressAsync(TimeSpan olderThan, int limit, CancellationToken ct) =>
        _inner.FindStaleInProgressAsync(olderThan, limit, ct);
}

public sealed class IdempotencyFilterTests
{
    private static EndpointFilterInvocationContext BuildContext(IIdempotencyStore store, string key, string body)
    {
        var services = new ServiceCollection().AddSingleton(store).BuildServiceProvider();
        var http = new DefaultHttpContext { RequestServices = services };
        http.Request.Method = "POST";
        http.Request.Path = "/v1/test";
        http.Request.Headers["Idempotency-Key"] = key;
        http.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        http.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("user_id", "client-1")]));
        return EndpointFilterInvocationContext.Create(http);
    }

    [Fact]
    public async Task CompleteAsyncFailureAfterSuccess_DoesNotAbandonKey_AndBlocksRetryInsteadOfReExecuting()
    {
        var store = new ThrowOnceOnCompleteStore();
        var filter = new IdempotencyFilter();
        var executions = 0;
        EndpointFilterDelegate next = _ =>
        {
            executions++;
            return ValueTask.FromResult<object?>(Results.Ok(new { executions }));
        };

        // First attempt: the action succeeds (status 200), then CompleteAsync throws.
        var ctx1 = BuildContext(store, "k1", "{}");
        await Assert.ThrowsAsync<IOException>(() => filter.InvokeAsync(ctx1, next).AsTask());
        Assert.Equal(1, executions);
        Assert.False(store.AbandonCalled, "A CompleteAsync failure after a successful action must never abandon the key.");

        // Retry with the exact same key + body: must be rejected (409, stuck IN_PROGRESS), not
        // re-executed. Before the fix, AbandonAsync ran in the catch block, freeing the key and
        // letting this retry run the action again (double execution of an already-applied effect).
        var ctx2 = BuildContext(store, "k1", "{}");
        var result = await filter.InvokeAsync(ctx2, next);
        var statusResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(409, statusResult.StatusCode);
        Assert.Equal(1, executions);
    }

    [Fact]
    public async Task ServerError_KeepsKeyProtected_WhenEffectOutcomeIsUncertain()
    {
        var store = new InMemoryIdempotencyStore();
        var filter = new IdempotencyFilter();
        EndpointFilterDelegate next = _ => ValueTask.FromResult<object?>(Results.Json(new { error = "boom" }, statusCode: 500));

        var ctx = BuildContext(store, "k2", "{}");
        await filter.InvokeAsync(ctx, next);

        var (outcome, _) = await store.BeginAsync("client-1", "POST:/v1/test", "k2", Hash("{}"), default);
        Assert.Equal(BeginOutcome.InProgress, outcome);
    }

    private static string Hash(string body) =>
        Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(body)));
}

public sealed class IdempotencyReconcilerTests
{
    [Fact]
    public async Task ScanOnce_FindsOnlyRecordsOlderThanThreshold()
    {
        var store = new InMemoryIdempotencyStore();
        await store.BeginAsync("actor-old", "POST:/v1/transfers", "key-old", "hash", default);
        await Task.Delay(50);
        var cutoff = TimeSpan.FromMilliseconds(25);
        await store.BeginAsync("actor-new", "POST:/v1/transfers", "key-new", "hash", default);

        var reconciler = new IdempotencyReconciler(store, NullLogger<IdempotencyReconciler>.Instance);
        var stale = await reconciler.ScanOnceAsync(cutoff, 50, default);

        Assert.Contains(stale, r => r.ActorId == "actor-old" && r.Key == "key-old");
        Assert.DoesNotContain(stale, r => r.ActorId == "actor-new" && r.Key == "key-new");
    }

    [Fact]
    public async Task ScanOnce_IgnoresCompletedRecords()
    {
        var store = new InMemoryIdempotencyStore();
        await store.BeginAsync("actor-1", "POST:/v1/transfers", "key-1", "hash", default);
        await store.CompleteAsync("actor-1", "POST:/v1/transfers", "key-1", 201, "{}", "application/json", default);

        var reconciler = new IdempotencyReconciler(store, NullLogger<IdempotencyReconciler>.Instance);
        var stale = await reconciler.ScanOnceAsync(TimeSpan.Zero, 50, default);

        Assert.DoesNotContain(stale, r => r.Key == "key-1");
    }
}
