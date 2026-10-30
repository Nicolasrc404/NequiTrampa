using Google.Cloud.Spanner.Data;
using Nequi.Shared.Data;

namespace Nequi.Shared.Financial;

/// <summary>
/// Coordinates a durable financial intent with an effect written through the
/// same Spanner transaction. This type does not publish events or call
/// external services from the retriable transaction callback.
/// </summary>
public sealed class SpannerFinancialIntentCoordinator : IFinancialIntentCoordinator
{
    private readonly Func<SpannerConnection> _connectionFactory;
    private readonly IFinancialIntentStore _store;

    public SpannerFinancialIntentCoordinator(SpannerDb db, IFinancialIntentStore store)
        : this(
            db is null ? throw new ArgumentNullException(nameof(db)) : db.Open,
            store)
    {
    }

    /// <summary>
    /// Isolated tests can provide a factory whose builder is already validated
    /// with EmulatorDetection.EmulatorOnly.
    /// </summary>
    public SpannerFinancialIntentCoordinator(
        Func<SpannerConnection> connectionFactory,
        IFinancialIntentStore store)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        _store = store ?? throw new ArgumentNullException(nameof(store));
    }

    public async Task<FinancialIntentExecutionResult<T>> ExecuteAsync<T>(
        FinancialIntentExecutionRequest request,
        Func<FinancialIntentTransactionContext, CancellationToken, Task<T>> effect,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(effect);

        // These IDs are outside the retriable callback. A transaction retry
        // therefore cannot generate a second logical operation identifier.
        var financialIntentId = Guid.NewGuid().ToString("N");
        var operationId = Guid.NewGuid().ToString("N");

        await using var connection = _connectionFactory();
        await connection.OpenAsync(ct);

        try
        {
            return await connection.RunWithRetriableTransactionAsync(async transaction =>
            {
                var candidate = new FinancialIntent(
                    financialIntentId,
                    request.AuthenticatedActorId,
                    request.Identity,
                    request.RequestHash,
                    FinancialIntentStatus.InProgress,
                    DateTimeOffset.UtcNow,
                    operationId);
                var context = new FinancialIntentTransactionContext(connection, transaction, candidate);

                var resolution = await _store.GetOrCreateInTransactionAsync(
                    context,
                    request.Identity,
                    request.AuthenticatedActorId,
                    request.RequestHash,
                    financialIntentId,
                    operationId,
                    ct);

                if (resolution.Kind != FinancialIntentResultKind.NewIntent)
                    return new FinancialIntentExecutionResult<T>(resolution, default, false);

                var value = await effect(context, ct);
                var confirmation = await _store.ConfirmInTransactionAsync(
                    context,
                    financialIntentId,
                    operationId,
                    ct);

                if (confirmation.Kind != FinancialIntentResultKind.Confirmed)
                    throw new InvalidOperationException(
                        $"Financial intent confirmation failed: {confirmation.ErrorCode ?? confirmation.Kind.ToString()}.");

                return new FinancialIntentExecutionResult<T>(confirmation, value, true);
            }, ct);
        }
        catch (SpannerException exception) when (
            exception.ErrorCode is ErrorCode.Unavailable or ErrorCode.DeadlineExceeded or ErrorCode.Unknown)
        {
            // The commit outcome may be unknown. Do not retry the financial
            // effect here; surface an explicit uncertain result for recovery.
            var uncertain = new FinancialIntent(
                financialIntentId,
                request.AuthenticatedActorId,
                request.Identity,
                request.RequestHash,
                FinancialIntentStatus.Uncertain,
                DateTimeOffset.UtcNow,
                operationId);
            return new FinancialIntentExecutionResult<T>(
                FinancialIntentResult.Uncertain(uncertain),
                default,
                false);
        }
    }
}
