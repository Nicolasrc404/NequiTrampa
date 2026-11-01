using Nequi.Shared.Idempotency;

namespace Nequi.Tests;

/// <summary>
/// Idempotency semantics for abandoned IN_PROGRESS records. The key guarantee is that a STALE
/// record is never restarted automatically: the caller must reconcile before a new attempt.
/// </summary>
public sealed class IdempotencyStoreTests
{
    private const string Actor = "actor-1";
    private const string Scope = "POST:/v1/transfers";
    private const string Key = "key-1";

    private static IdempotencyOptions Expired() =>
        new() { InProgressTimeout = TimeSpan.FromMilliseconds(-1) };

    [Fact]
    public async Task NewKey_Starts_ThenCompletedKey_ReplaysStoredResult()
    {
        var store = new InMemoryIdempotencyStore();

        var begin = await store.BeginAsync(Actor, Scope, Key, "hash-a", default);
        Assert.Equal(BeginOutcome.Started, begin.Outcome);

        await store.CompleteAsync(Actor, Scope, Key, 201, "{\"ok\":true}", "application/json", default);

        var replay = await store.BeginAsync(Actor, Scope, Key, "hash-a", default);
        Assert.Equal(BeginOutcome.Replay, replay.Outcome);
        Assert.Equal(201, replay.Record!.StatusCode);
        Assert.Equal("{\"ok\":true}", replay.Record.ResponseBody);
    }

    [Fact]
    public async Task RecentInProgress_DoesNotProcessAgain()
    {
        var store = new InMemoryIdempotencyStore();
        await store.BeginAsync(Actor, Scope, Key, "hash-a", default);

        var second = await store.BeginAsync(Actor, Scope, Key, "hash-a", default);

        Assert.Equal(BeginOutcome.InProgress, second.Outcome);
    }

    [Fact]
    public async Task SameKey_DifferentBody_IsConflict()
    {
        var store = new InMemoryIdempotencyStore();
        await store.BeginAsync(Actor, Scope, Key, "hash-a", default);

        var conflict = await store.BeginAsync(Actor, Scope, Key, "hash-b", default);

        Assert.Equal(BeginOutcome.Conflict, conflict.Outcome);
    }

    [Fact]
    public async Task ExpiredInProgress_IsStale_AndNeverRestarts()
    {
        var store = new InMemoryIdempotencyStore(Expired());
        var first = await store.BeginAsync(Actor, Scope, Key, "hash-a", default);
        Assert.Equal(BeginOutcome.Started, first.Outcome);

        // The process died after Begin: a retry with the same key must not execute again.
        var retry = await store.BeginAsync(Actor, Scope, Key, "hash-a", default);
        var retryAgain = await store.BeginAsync(Actor, Scope, Key, "hash-a", default);

        Assert.Equal(BeginOutcome.Stale, retry.Outcome);
        Assert.Equal(BeginOutcome.Stale, retryAgain.Outcome);
        Assert.NotEqual(BeginOutcome.Started, retry.Outcome);
    }

    [Fact]
    public async Task StaleRecord_DoesNotBlockForever_ButRequiresANewKey()
    {
        var store = new InMemoryIdempotencyStore(Expired());
        await store.BeginAsync(Actor, Scope, Key, "hash-a", default);

        // A brand-new intention (new key) is a separate operation; the old key stays unreplayable.
        var other = await store.BeginAsync(Actor, Scope, "key-2", "hash-b", default);

        Assert.Equal(BeginOutcome.Started, other.Outcome);
        Assert.Equal(BeginOutcome.Stale, (await store.BeginAsync(Actor, Scope, Key, "hash-a", default)).Outcome);
    }

    [Fact]
    public async Task UncertainOutcome_PreservesInProgress_PreventingDuplicateCommit()
    {
        var store = new InMemoryIdempotencyStore();
        var begin = await store.BeginAsync(Actor, Scope, Key, "hash-a", default);
        Assert.Equal(BeginOutcome.Started, begin.Outcome);

        // Sin CompleteAsync (fallo incierto/timeout/5xx), el reintento debe ser InProgress, no Started
        var retry = await store.BeginAsync(Actor, Scope, Key, "hash-a", default);
        Assert.Equal(BeginOutcome.InProgress, retry.Outcome);
    }

    [Fact]
    public async Task PreExecutionRejection_CompletedWith4xx_AllowsReplayWithoutBlocking()
    {
        var store = new InMemoryIdempotencyStore();
        var begin = await store.BeginAsync(Actor, Scope, Key, "hash-a", default);
        Assert.Equal(BeginOutcome.Started, begin.Outcome);

        // Fallo de validación/precondición completado con 400
        await store.CompleteAsync(Actor, Scope, Key, 400, "{\"code\":\"invalid_amount\"}", "application/json", default);

        var retry = await store.BeginAsync(Actor, Scope, Key, "hash-a", default);
        Assert.Equal(BeginOutcome.Replay, retry.Outcome);
        Assert.Equal(400, retry.Record!.StatusCode);
    }

    [Fact]
    public async Task ConcurrentRequests_SameKey_OnlyOneStarts_SecondReceivesInProgress()
    {
        var store = new InMemoryIdempotencyStore();

        var t1 = store.BeginAsync(Actor, Scope, Key, "hash-a", default);
        var t2 = store.BeginAsync(Actor, Scope, Key, "hash-a", default);
        var results = await Task.WhenAll(t1, t2);

        var outcomes = results.Select(r => r.Outcome).OrderBy(o => o).ToArray();
        Assert.Equal(new[] { BeginOutcome.Started, BeginOutcome.InProgress }, outcomes);
    }
}
