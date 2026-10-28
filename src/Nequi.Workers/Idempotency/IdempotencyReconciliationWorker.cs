using Nequi.Shared.Idempotency;

namespace Nequi.Workers.Idempotency;

public sealed class IdempotencyReconciliationOptions
{
    public bool Enabled { get; set; } = true;
    public int PollSeconds { get; set; } = 300;
    public int StaleAfterMinutes { get; set; } = 10;
    public int BatchSize { get; set; } = 50;
}

public sealed record StaleIdempotencyRecord(string ActorId, string Scope, string Key, TimeSpan Age);

/// <summary>
/// Surfaces idempotency_records stuck IN_PROGRESS because the owning request crashed before
/// reaching CompleteAsync/AbandonAsync (see ARCHITECTURE.md). This never resolves them
/// automatically: the table alone cannot tell whether the underlying financial effect committed
/// before the crash, so auto-deleting a stale key could let a retry re-execute an operation that
/// already happened. An operator must check the ledger for the actor/scope and release the key
/// explicitly through the Backoffice admin endpoint once they've confirmed it's safe.
/// </summary>
public sealed class IdempotencyReconciler(IIdempotencyStore store, ILogger<IdempotencyReconciler> logger)
{
    public async Task<IReadOnlyList<StaleIdempotencyRecord>> ScanOnceAsync(
        TimeSpan staleAfter, int batchSize, CancellationToken ct)
    {
        var stale = await store.FindStaleInProgressAsync(staleAfter, batchSize, ct);
        var now = DateTimeOffset.UtcNow;
        var result = stale
            .Select(r => new StaleIdempotencyRecord(r.ActorId, r.Scope, r.Key, now - r.CreatedAt))
            .ToList();

        foreach (var r in result)
            logger.LogWarning(
                "Idempotency key stuck IN_PROGRESS actor={ActorId} scope={Scope} key={Key} age={Age} - needs manual ledger reconciliation",
                r.ActorId, r.Scope, r.Key, r.Age);

        if (result.Count > 0)
            logger.LogWarning("Idempotency reconciliation found {Count} stale IN_PROGRESS record(s)", result.Count);

        return result;
    }
}

public sealed class IdempotencyReconciliationWorker(
    IdempotencyReconciler reconciler,
    Microsoft.Extensions.Options.IOptions<IdempotencyReconciliationOptions> options,
    ILogger<IdempotencyReconciliationWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var o = options.Value;
        if (!o.Enabled) { logger.LogInformation("Idempotency reconciliation worker disabled"); return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await reconciler.ScanOnceAsync(TimeSpan.FromMinutes(o.StaleAfterMinutes), o.BatchSize, stoppingToken);
                await Task.Delay(TimeSpan.FromSeconds(o.PollSeconds), stoppingToken);
            }
            catch (OperationCanceledException) { break; }
            catch (Exception e)
            {
                logger.LogError(e, "Idempotency reconciliation loop error");
                await Task.Delay(TimeSpan.FromSeconds(Math.Max(o.PollSeconds, 30)), stoppingToken);
            }
        }
    }
}
