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
    private readonly IFinancialIdentityResolver _identityResolver;

    public SpannerFinancialIntentCoordinator(
        SpannerDb db,
        IFinancialIntentStore store,
        IFinancialIdentityResolver identityResolver)
        : this(
            db is null ? throw new ArgumentNullException(nameof(db)) : db.Open,
            store,
            identityResolver)
    {
    }

    /// <summary>
    /// Isolated tests can provide a factory whose builder is already validated
    /// with EmulatorDetection.EmulatorOnly.
    /// </summary>
    public SpannerFinancialIntentCoordinator(
        Func<SpannerConnection> connectionFactory,
        IFinancialIntentStore store,
        IFinancialIdentityResolver identityResolver)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        _store = store ?? throw new ArgumentNullException(nameof(store));
        _identityResolver = identityResolver ?? throw new ArgumentNullException(nameof(identityResolver));
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
        FinancialIntentIdentity? resolvedIdentity = null;

        await using var connection = _connectionFactory();
        await connection.OpenAsync(ct);

        try
        {
            return await connection.RunWithRetriableTransactionAsync(async transaction =>
            {
                var identityResolution = await _identityResolver.ResolveInTransactionAsync(
                    connection,
                    transaction,
                    request.AuthenticatedActorId,
                    ct);

                if (identityResolution.Kind != FinancialIdentityResolutionKind.Resolved)
                {
                    var identityResult = identityResolution.Kind switch
                    {
                        FinancialIdentityResolutionKind.NotFound => FinancialIntentResult.IdentityNotFound(),
                        FinancialIdentityResolutionKind.Ambiguous => FinancialIntentResult.IdentityAmbiguous(),
                        _ => throw new ArgumentOutOfRangeException(),
                    };
                    return new FinancialIntentExecutionResult<T>(identityResult, default, false);
                }

                var identity = new FinancialIntentIdentity(
                    identityResolution.DomainActorId!,
                    request.OperationType,
                    request.Scope,
                    request.IdempotencyKey);
                resolvedIdentity = identity;

                var candidate = new FinancialIntent(
                    financialIntentId,
                    request.AuthenticatedActorId,
                    identity,
                    request.RequestHash,
                    FinancialIntentStatus.InProgress,
                    DateTimeOffset.UtcNow,
                    operationId);
                var context = new FinancialIntentTransactionContext(connection, transaction, candidate);

                var resolution = await _store.GetOrCreateInTransactionAsync(
                    context,
                    identity,
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
            if (resolvedIdentity is null)
            {
                return new FinancialIntentExecutionResult<T>(
                    FinancialIntentResult.StorageError("financial_identity_unknown_after_transaction_failure"),
                    default,
                    false);
            }
            var uncertain = new FinancialIntent(
                financialIntentId,
                request.AuthenticatedActorId,
                resolvedIdentity,
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

/// <summary>
/// Resolves the authenticated subject using the same Spanner transaction that
/// will contain the financial intent and effect.
/// </summary>
public sealed class SpannerFinancialIdentityResolver : IFinancialIdentityResolver
{
    public async Task<FinancialIdentityResolution> ResolveInTransactionAsync(
        SpannerConnection connection,
        SpannerTransaction transaction,
        string authenticatedActorId,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(connection);
        ArgumentNullException.ThrowIfNull(transaction);
        if (string.IsNullOrWhiteSpace(authenticatedActorId))
            return FinancialIdentityResolution.NotFound();

        await using var command = connection.CreateSelectCommand(
            "SELECT client_id FROM clients WHERE auth_subject=@subject AND status='ACTIVE'");
        command.Transaction = transaction;
        command.Parameters.Add("subject", SpannerDbType.String, authenticatedActorId);

        string? clientId = null;
        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            if (clientId is not null)
                return FinancialIdentityResolution.Ambiguous();
            clientId = reader.GetString(0);
        }

        return clientId is null
            ? FinancialIdentityResolution.NotFound()
            : FinancialIdentityResolution.Resolved(clientId);
    }
}
