using System.Collections.Concurrent;

namespace Nequi.Shared.Idempotency;

public enum BeginOutcome { Started, Replay, Conflict, InProgress }

public enum IdempotencyOperationKind
{
    NonFinancial,
    Financial,
}

/// <summary>
/// Central classification for idempotency scopes. Financial scopes never
/// restart a FAILED reservation because FAILED does not prove that the ledger
/// has no committed effect.
/// </summary>
public static class IdempotencyOperationClassification
{
    public const string TransferScope = "POST:/v1/transfers";
    public const string RechargeScope = "POST:/v1/recharges";

    public static IdempotencyOperationKind Classify(string scope) =>
        scope switch
        {
            TransferScope or RechargeScope => IdempotencyOperationKind.Financial,
            _ => IdempotencyOperationKind.NonFinancial,
        };
}

public sealed record IdempotencyRecord(
    string ActorId, string Scope, string Key, string RequestHash, int? StatusCode, string? ResponseBody, string? ContentType,
    DateTimeOffset CreatedAt = default);

/// <summary>
/// Protects critical POSTs against duplicates. Same key + same body replays the stored response;
/// same key + different body is a conflict (HTTP 409).
/// </summary>
public interface IIdempotencyStore
{
    Task<(BeginOutcome Outcome, IdempotencyRecord? Record)> BeginAsync(string actorId, string scope, string key, string requestHash, CancellationToken ct);
    Task CompleteAsync(string actorId, string scope, string key, int statusCode, string? body, string? contentType, CancellationToken ct);
    Task AbandonAsync(string actorId, string scope, string key, CancellationToken ct);

    /// <summary>
    /// Finds records still IN_PROGRESS after <paramref name="olderThan"/>: the owning request
    /// never reached <see cref="CompleteAsync"/> or <see cref="AbandonAsync"/> (e.g. the process
    /// crashed mid-request). These block any retry with the same key with a permanent 409 and
    /// need a human to reconcile against the ledger before being released (see
    /// <see cref="AbandonAsync"/>) — this only surfaces them, it never resolves them automatically,
    /// since there is no way to tell from this table alone whether the underlying effect committed.
    /// </summary>
    Task<IReadOnlyList<IdempotencyRecord>> FindStaleInProgressAsync(TimeSpan olderThan, int limit, CancellationToken ct);
}

/// <summary>Single-instance store for local development and tests. Cloud deployments use the Spanner store.</summary>
public sealed class InMemoryIdempotencyStore : IIdempotencyStore
{
    private readonly ConcurrentDictionary<string, IdempotencyRecord> _records = new();
    private static string Id(string actor, string scope, string key) => $"{actor}|{scope}|{key}";

    public Task<(BeginOutcome, IdempotencyRecord?)> BeginAsync(string actorId, string scope, string key, string requestHash, CancellationToken ct)
    {
        var fresh = new IdempotencyRecord(actorId, scope, key, requestHash, null, null, null, DateTimeOffset.UtcNow);
        var existing = _records.GetOrAdd(Id(actorId, scope, key), fresh);
        if (ReferenceEquals(existing, fresh)) return Task.FromResult<(BeginOutcome, IdempotencyRecord?)>((BeginOutcome.Started, null));
        if (existing.RequestHash != requestHash) return Task.FromResult<(BeginOutcome, IdempotencyRecord?)>((BeginOutcome.Conflict, existing));
        return Task.FromResult<(BeginOutcome, IdempotencyRecord?)>(existing.StatusCode is null
            ? (BeginOutcome.InProgress, existing)
            : (BeginOutcome.Replay, existing));
    }

    public Task CompleteAsync(string actorId, string scope, string key, int statusCode, string? body, string? contentType, CancellationToken ct)
    {
        _records.AddOrUpdate(Id(actorId, scope, key),
            _ => new IdempotencyRecord(actorId, scope, key, "", statusCode, body, contentType),
            (_, old) => old with { StatusCode = statusCode, ResponseBody = body, ContentType = contentType });
        return Task.CompletedTask;
    }

    public Task AbandonAsync(string actorId, string scope, string key, CancellationToken ct)
    {
        _records.TryRemove(Id(actorId, scope, key), out _);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<IdempotencyRecord>> FindStaleInProgressAsync(TimeSpan olderThan, int limit, CancellationToken ct)
    {
        var cutoff = DateTimeOffset.UtcNow - olderThan;
        return Task.FromResult<IReadOnlyList<IdempotencyRecord>>(_records.Values
            .Where(r => r.StatusCode is null && r.CreatedAt < cutoff)
            .OrderBy(r => r.CreatedAt)
            .Take(limit)
            .ToList());
    }
}
