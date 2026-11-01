using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Nequi.Shared.Idempotency;
using Nequi.Workers.Idempotency;

namespace Nequi.Tests;

public sealed class FinancialIdempotencyRegressionTests
{
    [Fact]
    public async Task MinimalFilter_ExceptionAfterFinancialEffect_MustKeepReservationForManualReconciliation()
    {
        var store = new InMemoryIdempotencyStore();
        var filter = new IdempotencyFilter();
        var effects = 0;
        EndpointFilterDelegate next = _ =>
        {
            effects++;
            throw new InvalidOperationException("failure after effect");
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => filter.InvokeAsync(Context(store, "k-ex", "{}"), next).AsTask());
        Assert.Equal(1, effects);
        Assert.Equal(BeginOutcome.InProgress, await BeginOutcomeFor(store, "k-ex", "{}"));
    }

    [Fact]
    public async Task MinimalFilter_ServerErrorAfterFinancialEffect_MustKeepReservationForManualReconciliation()
    {
        var store = new InMemoryIdempotencyStore();
        var filter = new IdempotencyFilter();
        var effects = 0;
        EndpointFilterDelegate next = _ =>
        {
            effects++;
            return ValueTask.FromResult<object?>(Results.StatusCode(500));
        };

        await filter.InvokeAsync(Context(store, "k-5xx", "{}"), next);

        Assert.Equal(1, effects);
        Assert.Equal(BeginOutcome.InProgress, await BeginOutcomeFor(store, "k-5xx", "{}"));
    }

    [Fact]
    public async Task MinimalFilter_SameKeyDifferentBody_IsConflictAndDoesNotRunEffect()
    {
        var store = new InMemoryIdempotencyStore();
        var filter = new IdempotencyFilter();
        var effects = 0;
        EndpointFilterDelegate next = _ =>
        {
            effects++;
            return ValueTask.FromResult<object?>(Results.Ok());
        };

        await filter.InvokeAsync(Context(store, "k-body", "{\"amount\":1}"), next);
        var conflict = await filter.InvokeAsync(Context(store, "k-body", "{\"amount\":2}"), next);

        Assert.Equal(1, effects);
        Assert.Equal(409, Assert.IsAssignableFrom<IStatusCodeHttpResult>(conflict).StatusCode);
    }

    [Fact]
    public async Task MinimalFilter_ConcurrentSameKey_AllowsOnlyOneFinancialEffect()
    {
        var store = new InMemoryIdempotencyStore();
        var filter = new IdempotencyFilter();
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var effects = 0;
        EndpointFilterDelegate next = async _ =>
        {
            Interlocked.Increment(ref effects);
            entered.SetResult();
            await release.Task;
            return Results.Ok();
        };

        var first = filter.InvokeAsync(Context(store, "k-concurrent", "{}"), next).AsTask();
        await entered.Task;
        var second = await filter.InvokeAsync(Context(store, "k-concurrent", "{}"), next);
        release.SetResult();
        await first;

        Assert.Equal(1, effects);
        Assert.Equal(409, Assert.IsAssignableFrom<IStatusCodeHttpResult>(second).StatusCode);
    }

    [Fact]
    public async Task MinimalFilter_DefiniteRejectionBeforeEffect_IsReplayedWithoutExecutingEffect()
    {
        var store = new InMemoryIdempotencyStore();
        var filter = new IdempotencyFilter();
        var effects = 0;
        EndpointFilterDelegate reject = _ => ValueTask.FromResult<object?>(Results.UnprocessableEntity());

        var first = await filter.InvokeAsync(Context(store, "k-reject", "{}"), reject);
        var retry = await filter.InvokeAsync(Context(store, "k-reject", "{}"), _ =>
        {
            effects++;
            return ValueTask.FromResult<object?>(Results.Ok());
        });

        Assert.Equal(0, effects);
        Assert.Equal(422, Assert.IsAssignableFrom<IStatusCodeHttpResult>(first).StatusCode);
        Assert.Equal(422, Assert.IsAssignableFrom<IStatusCodeHttpResult>(retry).StatusCode);
    }

    [Fact]
    public async Task MvcFilter_ExceptionAfterFinancialEffect_MustKeepReservationForManualReconciliation()
    {
        var store = new InMemoryIdempotencyStore();
        var filter = new IdempotencyActionFilter(store, NullLogger<IdempotencyActionFilter>.Instance);
        var effects = 0;
        var first = MvcContext(store, "k-mvc-ex", "{}");
        var executed = new ActionExecutedContext(first, Array.Empty<IFilterMetadata>(), new object())
        {
            Exception = new InvalidOperationException("failure after effect")
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => filter.OnActionExecutionAsync(first, () =>
        {
            effects++;
            return Task.FromResult(executed);
        }));

        Assert.Equal(BeginOutcome.InProgress, await BeginOutcomeFor(store, "k-mvc-ex", "{}"));
        Assert.Equal(1, effects);
    }

    [Fact]
    public async Task MvcFilter_ServerErrorAfterFinancialEffect_MustKeepReservationForManualReconciliation()
    {
        var store = new InMemoryIdempotencyStore();
        var filter = new IdempotencyActionFilter(store, NullLogger<IdempotencyActionFilter>.Instance);
        var context = MvcContext(store, "k-mvc-5xx", "{}");
        var executed = new ActionExecutedContext(context, Array.Empty<IFilterMetadata>(), new object())
        {
            Result = new StatusCodeResult(500)
        };

        await filter.OnActionExecutionAsync(context, () => Task.FromResult(executed));

        Assert.Equal(BeginOutcome.InProgress, await BeginOutcomeFor(store, "k-mvc-5xx", "{}"));
    }

    [Fact]
    public async Task MvcFilter_CompleteFailureAfterEffect_LeavesReservationBlockingRetry()
    {
        var store = new ThrowingCompleteStore();
        var filter = new IdempotencyActionFilter(store, NullLogger<IdempotencyActionFilter>.Instance);
        var context = MvcContext(store, "k-mvc-complete", "{}");
        var executed = new ActionExecutedContext(context, Array.Empty<IFilterMetadata>(), new object())
        {
            Result = new OkResult()
        };

        await Assert.ThrowsAsync<IOException>(() => filter.OnActionExecutionAsync(context, () => Task.FromResult(executed)));
        Assert.False(store.AbandonCalled);
        Assert.Equal(BeginOutcome.InProgress, await BeginOutcomeFor(store, "k-mvc-complete", "{}"));
    }

    [Fact]
    public async Task Reconciler_ReportsStaleReservationButDoesNotReleaseIt()
    {
        var store = new InMemoryIdempotencyStore();
        const string actorId = "actor";
        const string scope = "POST:/v1/test";
        const string key = "k-stale";
        var requestHash = Hash("{}");

        var (created, _) = await store.BeginAsync(actorId, scope, key, requestHash, default);
        Assert.Equal(BeginOutcome.Started, created);

        var reconciler = new IdempotencyReconciler(store, NullLogger<IdempotencyReconciler>.Instance);

        var reported = await reconciler.ScanOnceAsync(TimeSpan.Zero, 50, default);

        Assert.Contains(reported, x =>
            x.ActorId == actorId && x.Scope == scope && x.Key == key);

        var (retry, _) = await store.BeginAsync(actorId, scope, key, requestHash, default);
        Assert.Equal(BeginOutcome.InProgress, retry);
    }

    private static EndpointFilterInvocationContext Context(IIdempotencyStore store, string key, string body)
    {
        var services = new ServiceCollection().AddSingleton(store).BuildServiceProvider();
        var http = new DefaultHttpContext { RequestServices = services };
        http.Request.Method = "POST";
        http.Request.Path = "/v1/test";
        http.Request.Headers[IdempotencyFilter.HeaderName] = key;
        http.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        http.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("user_id", "actor")]));
        return EndpointFilterInvocationContext.Create(http);
    }

    private static ActionExecutingContext MvcContext(IIdempotencyStore store, string key, string body)
    {
        var http = new DefaultHttpContext
        {
            RequestServices = new ServiceCollection().AddSingleton(store).BuildServiceProvider()
        };
        http.Request.Method = "POST";
        http.Request.Path = "/v1/test";
        http.Request.Headers[IdempotencyFilter.HeaderName] = key;
        http.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        http.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("user_id", "actor")]));
        var action = new ActionContext(http, new RouteData(), new ControllerActionDescriptor());
        return new ActionExecutingContext(action, Array.Empty<IFilterMetadata>(), new Dictionary<string, object?>(), new object());
    }

    private static async Task<BeginOutcome> BeginOutcomeFor(IIdempotencyStore store, string key, string body)
    {
        var (outcome, _) = await store.BeginAsync("actor", "POST:/v1/test", key, Hash(body), default);
        return outcome;
    }

    private static string Hash(string body) => Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(body)));

    private sealed class ThrowingCompleteStore : IIdempotencyStore
    {
        private readonly InMemoryIdempotencyStore _inner = new();
        public bool AbandonCalled { get; private set; }
        public Task<(BeginOutcome, IdempotencyRecord?)> BeginAsync(string actorId, string scope, string key, string requestHash, CancellationToken ct) => _inner.BeginAsync(actorId, scope, key, requestHash, ct);
        public Task CompleteAsync(string actorId, string scope, string key, int statusCode, string? body, string? contentType, CancellationToken ct) => throw new IOException("simulated completion failure");
        public Task AbandonAsync(string actorId, string scope, string key, CancellationToken ct) { AbandonCalled = true; return _inner.AbandonAsync(actorId, scope, key, ct); }
        public Task<IReadOnlyList<IdempotencyRecord>> FindStaleInProgressAsync(TimeSpan olderThan, int limit, CancellationToken ct) => _inner.FindStaleInProgressAsync(olderThan, limit, ct);
    }

}
