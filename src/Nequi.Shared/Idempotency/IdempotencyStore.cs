using System.Collections.Concurrent;

namespace Nequi.Shared.Idempotency;

public enum BeginOutcome { Started, Replay, Conflict, InProgress }

public sealed record IdempotencyRecord(
    string ActorId, string Scope, string Key, string RequestHash, int? StatusCode, string? ResponseBody, string? ContentType);

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
public sealed class InMemoryIdempotencyStore : IIdempotencyStore
{
    private readonly ConcurrentDictionary<string, IdempotencyRecord> _records = new();
    private static string Id(string actor, string scope, string key) => $"{actor}|{scope}|{key}";

    public Task<(BeginOutcome, IdempotencyRecord?)> BeginAsync(string actorId, string scope, string key, string requestHash, CancellationToken ct)
    {
        var fresh = new IdempotencyRecord(actorId, scope, key, requestHash, null, null, null);
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
}
