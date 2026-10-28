using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using Google.Cloud.PubSub.V1;
using Google.Protobuf;

namespace Nequi.Shared.Events;

public interface IEventPublisher
{
    Task PublishAsync(DomainEvent evt, CancellationToken ct);
}

public sealed class PubSubEventPublisher(PublisherClient client) : IEventPublisher
{
    public async Task PublishAsync(DomainEvent evt, CancellationToken ct)
    {
        var msg = new PubsubMessage { Data = ByteString.CopyFromUtf8(evt.ToJson()) };
        msg.Attributes["eventType"] = evt.EventType;
        msg.Attributes["eventId"] = evt.EventId;
        await client.PublishAsync(msg);
    }
}

public sealed class InMemoryEventPublisher : IEventPublisher
{
    public ConcurrentQueue<DomainEvent> Published { get; } = new();
    public Task PublishAsync(DomainEvent evt, CancellationToken ct) { Published.Enqueue(evt); return Task.CompletedTask; }
}

/// <summary>Pub/Sub push subscription envelope: {"message":{"data":"base64","messageId":"..."},"subscription":"..."}.</summary>
public static class PushEnvelope
{
    public static bool TryReadEvent(JsonElement body, out DomainEvent? evt, out string error)
    {
        evt = null; error = "";
        try
        {
            if (!body.TryGetProperty("message", out var m) || !m.TryGetProperty("data", out var d) || d.GetString() is not { } b64)
            { error = "missing message.data"; return false; }
            evt = DomainEvent.FromJson(System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(b64)));
            if (evt is null) { error = "empty event"; return false; }
            return evt.IsValid(out error);
        }
        catch (Exception e) when (e is FormatException or JsonException or InvalidOperationException)
        {
            error = "malformed envelope";
            return false;
        }
    }
}

public interface IOutboxStore
{
    Task<IReadOnlyList<DomainEvent>> FetchPendingAsync(int max, CancellationToken ct);
    Task MarkPublishedAsync(string eventId, CancellationToken ct);
    Task MarkFailedAsync(string eventId, string reason, CancellationToken ct);
    Task<OutboxStats> StatsAsync(CancellationToken ct);
    Task PingAsync(CancellationToken ct);
}

public sealed record OutboxStats(int Pending, int Published, int Failed);

public sealed class InMemoryOutboxStore : IOutboxStore
{
    private readonly object _gate = new();
    private readonly List<(DomainEvent Evt, string Status, int Attempts)> _rows = [];

    public void Enqueue(DomainEvent evt) { lock (_gate) _rows.Add((evt, "PENDING", 0)); }

    public Task<IReadOnlyList<DomainEvent>> FetchPendingAsync(int max, CancellationToken ct)
    {
        lock (_gate)
            return Task.FromResult<IReadOnlyList<DomainEvent>>(_rows.Where(r => r.Status == "PENDING")
                .OrderBy(r => r.Evt.OccurredAt).Take(max).Select(r => r.Evt).ToList());
    }

    public Task MarkPublishedAsync(string eventId, CancellationToken ct) => Set(eventId, "PUBLISHED");
    public Task MarkFailedAsync(string eventId, string reason, CancellationToken ct) => Set(eventId, "FAILED");

    private Task Set(string id, string status)
    {
        lock (_gate)
        {
            var i = _rows.FindIndex(r => r.Evt.EventId == id);
            if (i >= 0) _rows[i] = (_rows[i].Evt, status, _rows[i].Attempts + 1);
        }
        return Task.CompletedTask;
    }

    public Task<OutboxStats> StatsAsync(CancellationToken ct)
    {
        lock (_gate)
            return Task.FromResult(new OutboxStats(
                _rows.Count(r => r.Status == "PENDING"), _rows.Count(r => r.Status == "PUBLISHED"), _rows.Count(r => r.Status == "FAILED")));
    }

    public Task PingAsync(CancellationToken ct) => Task.CompletedTask;
}
