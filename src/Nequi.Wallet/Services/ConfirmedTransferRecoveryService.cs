using Google.Cloud.Spanner.Data;
using Nequi.Shared.Data;
using Nequi.Shared.Financial;
using Nequi.Wallet.DTOs;

namespace Nequi.Wallet.Services;

public enum TransferRecoveryKind
{
    Recovered,
    Conflict,
    RecoveryBlocked,
}

public sealed record TransferRecoveryResult(
    TransferRecoveryKind Kind,
    TransferResponseDto? Response = null,
    string? Code = null)
{
    public static TransferRecoveryResult Recovered(TransferResponseDto response) =>
        new(TransferRecoveryKind.Recovered, response);

    public static TransferRecoveryResult Conflict(string code = "idempotency_key_conflict") =>
        new(TransferRecoveryKind.Conflict, null, code);

    public static TransferRecoveryResult Blocked(string code = "transfer_recovery_blocked") =>
        new(TransferRecoveryKind.RecoveryBlocked, null, code);
}

public interface IConfirmedTransferRecoveryService
{
    Task<TransferRecoveryResult> RecoverAsync(
        string authenticatedActorId,
        string idempotencyKey,
        string requestHash,
        CreateTransferRequestDto request,
        CancellationToken ct);
}

/// <summary>
/// Read-only recovery of a transfer whose durable financial intent is already
/// confirmed. This service never creates an intent or writes financial data.
/// </summary>
public sealed class ConfirmedTransferRecoveryService : IConfirmedTransferRecoveryService
{
    public const string OperationType = "TRANSFER";
    public const string Scope = "POST:/v1/transfers";

    private readonly Func<SpannerConnection> _connectionFactory;
    private readonly IFinancialIntentStore _intentStore;
    private readonly IFinancialIdentityResolver _identityResolver;

    public ConfirmedTransferRecoveryService(
        SpannerDb db,
        IFinancialIntentStore intentStore,
        IFinancialIdentityResolver identityResolver)
        : this(
            db is null ? throw new ArgumentNullException(nameof(db)) : db.Open,
            intentStore,
            identityResolver)
    {
    }

    public ConfirmedTransferRecoveryService(
        Func<SpannerConnection> connectionFactory,
        IFinancialIntentStore intentStore,
        IFinancialIdentityResolver identityResolver)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
        _intentStore = intentStore ?? throw new ArgumentNullException(nameof(intentStore));
        _identityResolver = identityResolver ?? throw new ArgumentNullException(nameof(identityResolver));
    }

    public async Task<TransferRecoveryResult> RecoverAsync(
        string authenticatedActorId,
        string idempotencyKey,
        string requestHash,
        CreateTransferRequestDto request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(authenticatedActorId) ||
            string.IsNullOrWhiteSpace(idempotencyKey) ||
            string.IsNullOrWhiteSpace(requestHash) ||
            request is null)
            return TransferRecoveryResult.Blocked("transfer_recovery_invalid_request");

        await using var connection = _connectionFactory();
        try
        {
            await connection.OpenAsync(ct);
            return await connection.RunWithRetriableTransactionAsync(async transaction =>
            {
            if (authenticatedActorId.Length > 36)
                return TransferRecoveryResult.Blocked("authenticated_actor_not_correlatable");

            var resolution = await _identityResolver.ResolveInTransactionAsync(
                connection, transaction, authenticatedActorId, ct);
            if (resolution.Kind != FinancialIdentityResolutionKind.Resolved)
                return TransferRecoveryResult.Blocked("financial_identity_not_verifiable");

            var identity = new FinancialIntentIdentity(
                resolution.DomainActorId!, OperationType, Scope, idempotencyKey);
            var httpReservation = await ReadHttpReservationAsync(
                connection, transaction, authenticatedActorId, idempotencyKey, ct);
            if (httpReservation is { } reservation &&
                !string.Equals(reservation.RequestHash, requestHash, StringComparison.Ordinal))
                return TransferRecoveryResult.Conflict();

            var intentResult = await _intentStore.GetInTransactionAsync(
                connection, transaction, identity, ct);

            if (intentResult.Kind == FinancialIntentResultKind.IdentityConflict)
                return TransferRecoveryResult.Conflict();
            if (intentResult.Kind != FinancialIntentResultKind.Confirmed ||
                intentResult.Intent is null ||
                string.IsNullOrWhiteSpace(intentResult.Intent.OperationId))
                return TransferRecoveryResult.Blocked("financial_intent_not_confirmed_or_correlated");
            if (!string.Equals(intentResult.Intent.RequestHash, requestHash, StringComparison.Ordinal))
                return TransferRecoveryResult.Conflict();

            var ledger = await ReadLedgerTransferAsync(
                connection,
                transaction,
                resolution.DomainActorId!,
                idempotencyKey,
                intentResult.Intent.OperationId!,
                ct);
            if (ledger is null || !MatchesRequest(ledger, request))
                return TransferRecoveryResult.Blocked("ledger_correlation_not_verifiable");

            return TransferRecoveryResult.Recovered(new TransferResponseDto(
                TransferId: ledger.PublicReference,
                OriginClientId: ledger.OriginClientId,
                DestinationClientId: ledger.DestinationClientId,
                DestinationTransferCode: ledger.DestinationTransferCode,
                Amount: ledger.AmountMinor / 100m,
                AmountCents: ledger.AmountMinor,
                Currency: ledger.Currency,
                Status: "COMPLETED",
                LedgerOperationId: intentResult.Intent.OperationId!,
                Timestamp: ledger.ConfirmedAt ?? ledger.CreatedAt,
                Description: ledger.Description));
            }, ct);
        }
        catch (SpannerException)
        {
            return TransferRecoveryResult.Blocked("recovery_storage_not_verifiable");
        }
    }

    private static bool MatchesRequest(LedgerTransferRow ledger, CreateTransferRequestDto request)
    {
        var amountMinor = request.Amount * 100m;
        return amountMinor == ledger.AmountMinor &&
               string.Equals(request.Currency, ledger.Currency, StringComparison.Ordinal) &&
               string.Equals(request.DestinationTransferCode, ledger.DestinationTransferCode, StringComparison.Ordinal) &&
               string.Equals(request.Description, ledger.Description, StringComparison.Ordinal);
    }

    private static async Task<LedgerTransferRow?> ReadLedgerTransferAsync(
        SpannerConnection connection,
        SpannerTransaction transaction,
        string originClientId,
        string idempotencyKey,
        string operationId,
        CancellationToken ct)
    {
        await using var command = connection.CreateSelectCommand(
            "SELECT lo.public_reference, lo.actor_id, lo.amount_minor, lo.currency, lo.reason, " +
            "lo.created_at, lo.confirmed_at, wa_dest.client_id, c_dest.public_transfer_code " +
            "FROM ledger_operations lo " +
            "JOIN ledger_entries le_dest ON le_dest.operation_id=lo.operation_id AND le_dest.entry_no=2 " +
            "JOIN wallet_accounts wa_dest ON wa_dest.account_id=le_dest.account_id " +
            "JOIN clients c_dest ON c_dest.client_id=wa_dest.client_id " +
            "WHERE lo.operation_id=@operation AND lo.actor_id=@actor " +
            "AND lo.idempotency_key=@key AND lo.type='INTERNAL_TRANSFER' " +
            "AND lo.status='COMPLETED'");
        command.Transaction = transaction;
        command.Parameters.Add("operation", SpannerDbType.String, operationId);
        command.Parameters.Add("actor", SpannerDbType.String, originClientId);
        command.Parameters.Add("key", SpannerDbType.String, idempotencyKey);

        await using var reader = await command.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
            return null;

        var amount = (decimal)reader.GetNumeric(2);
        return new LedgerTransferRow(
            reader.GetString(0),
            reader.GetString(1),
            checked((long)amount),
            reader.GetString(3),
            reader.IsDBNull(4) ? null : reader.GetString(4),
            ToUtc(reader.GetFieldValue<DateTime>(5)),
            reader.IsDBNull(6) ? null : ToUtc(reader.GetFieldValue<DateTime>(6)),
            reader.GetString(7),
            reader.GetString(8));
    }

    private static async Task<HttpReservationRow?> ReadHttpReservationAsync(
        SpannerConnection connection,
        SpannerTransaction transaction,
        string authenticatedActorId,
        string idempotencyKey,
        CancellationToken ct)
    {
        await using var command = connection.CreateSelectCommand(
            "SELECT request_hash, status FROM idempotency_records " +
            "WHERE actor_id=@actor AND scope=@scope AND idempotency_key=@key");
        command.Transaction = transaction;
        command.Parameters.Add("actor", SpannerDbType.String, authenticatedActorId);
        command.Parameters.Add("scope", SpannerDbType.String, Scope);
        command.Parameters.Add("key", SpannerDbType.String, idempotencyKey);

        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct)
            ? new HttpReservationRow(reader.GetString(0), reader.GetString(1))
            : null;
    }

    private static DateTimeOffset ToUtc(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));

    private sealed record LedgerTransferRow(
        string PublicReference,
        string OriginClientId,
        long AmountMinor,
        string Currency,
        string? Description,
        DateTimeOffset CreatedAt,
        DateTimeOffset? ConfirmedAt,
        string DestinationClientId,
        string DestinationTransferCode);

    private sealed record HttpReservationRow(string RequestHash, string Status);
}

public sealed class DisabledConfirmedTransferRecoveryService : IConfirmedTransferRecoveryService
{
    public Task<TransferRecoveryResult> RecoverAsync(
        string authenticatedActorId,
        string idempotencyKey,
        string requestHash,
        CreateTransferRequestDto request,
        CancellationToken ct) =>
        Task.FromResult(TransferRecoveryResult.Blocked("transfer_recovery_disabled"));
}
