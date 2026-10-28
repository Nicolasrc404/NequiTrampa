using Nequi.Shared.Events;

namespace Nequi.Workers.Outbox;

public sealed class OutboxOptions
{
    public int BatchSize { get; set; } = 50;
    public int PollSeconds { get; set; } = 2;
    public bool Enabled { get; set; } = true;
}

/// <summary>Publishes already-committed outbox events to Pub/Sub. At-least-once: consumers are idempotent by eventId.</summary>
public sealed class OutboxDispatcher(IOutboxStore store, IEventPublisher publisher, ILogger<OutboxDispatcher> logger)
{
    public async Task<int> DrainOnceAsync(int batchSize, CancellationToken ct)
    {
        var pending = await store.FetchPendingAsync(batchSize, ct);
        var published = 0;
        foreach (var evt in pending)
        {
            try
            {
                await publisher.PublishAsync(evt, ct);
                await store.MarkPublishedAsync(evt.EventId, ct);
                published++;
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                logger.LogWarning(e, "Outbox publish failed for event {EventId}; will retry", evt.EventId);
                await store.MarkFailedAsync(evt.EventId, e.GetType().Name, ct);
            }
        }
        if (published > 0) logger.LogInformation("Outbox published {Count} event(s)", published);
        return published;
    }
}

public sealed class OutboxWorker(OutboxDispatcher dispatcher, Microsoft.Extensions.Options.IOptions<OutboxOptions> options, ILogger<OutboxWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var o = options.Value;
        if (!o.Enabled) { logger.LogInformation("Outbox worker disabled"); return; }
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var n = await dispatcher.DrainOnceAsync(o.BatchSize, stoppingToken);
                if (n == 0) await Task.Delay(TimeSpan.FromSeconds(o.PollSeconds), stoppingToken);
            }
            catch (OperationCanceledException) { break; }
            catch (Exception e)
            {
                logger.LogError(e, "Outbox loop error");
                await Task.Delay(TimeSpan.FromSeconds(Math.Max(o.PollSeconds, 5)), stoppingToken);
            }
        }
    }
}
