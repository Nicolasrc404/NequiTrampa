using System.Collections.Concurrent;

namespace Nequi.Shared.Idempotency;

public enum BeginOutcome { Started, Replay, Conflict, InProgress, Stale }

/// <summary>
/// Time a record may stay IN_PROGRESS before it is treated as abandoned. An abandoned key is
/// never replayed automatically: the caller gets a recoverable STALE error so the operation can
/// be reconciled against the authoritative ledger first (no double financial effect).
/// </summary>
public sealed class IdempotencyOptions
{
    public TimeSpan InProgressTimeout { get; init; } = TimeSpan.FromMinutes(5);
}

public sealed record IdempotencyRecord(
    string ActorId, string Scope, string Key, string RequestHash, int? StatusCode, string? ResponseBody, string? ContentType)
{
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}

/// <summary>
/// Protects critical POSTs against duplicates. Same key + same body replays the stored response;
/// same key + different body is a conflict (HTTP 409).
/// </summary>
public interface IIdempotencyStore
{
    Task<(BeginOutcome Outcome, IdempotencyRecord? Record)> BeginAsync(string actorId, string scope, string key, string requestHash, CancellationToken ct);
    Task CompleteAsync(string actorId, string scope, string key, int statusCode, string? body, string? contentType, CancellationToken ct);
    Task AbandonAsync(string actorId, string scope, string key, CancellationToken ct);
}

/// <summary>Single-instance store for local development and tests. Cloud deployments use the Spanner store.</summary>
public sealed class InMemoryIdempotencyStore(IdempotencyOptions? options = null) : IIdempotencyStore
{
    private readonly ConcurrentDictionary<string, IdempotencyRecord> _records = new();
    private readonly IdempotencyOptions _options = options ?? new IdempotencyOptions();
    private static string Id(string actor, string scope, string key) => $"{actor}|{scope}|{key}";

    public Task<(BeginOutcome Outcome, IdempotencyRecord? Record)> BeginAsync(string actorId, string scope, string key, string requestHash, CancellationToken ct)
    {
        var fresh = new IdempotencyRecord(actorId, scope, key, requestHash, null, null, null);
        var existing = _records.GetOrAdd(Id(actorId, scope, key), fresh);
        if (ReferenceEquals(existing, fresh)) return Task.FromResult<(BeginOutcome, IdempotencyRecord?)>((BeginOutcome.Started, null));
        if (existing.RequestHash != requestHash) return Task.FromResult<(BeginOutcome, IdempotencyRecord?)>((BeginOutcome.Conflict, existing));
        if (existing.StatusCode is not null) return Task.FromResult<(BeginOutcome, IdempotencyRecord?)>((BeginOutcome.Replay, existing));
        // IN_PROGRESS: only an abandoned record (older than the timeout) is reported as STALE.
        // It is never restarted here; reconciliation must happen before a new attempt.
        return Task.FromResult<(BeginOutcome, IdempotencyRecord?)>(
            DateTimeOffset.UtcNow - existing.CreatedAt > _options.InProgressTimeout
                ? (BeginOutcome.Stale, existing)
                : (BeginOutcome.InProgress, existing));
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
}
