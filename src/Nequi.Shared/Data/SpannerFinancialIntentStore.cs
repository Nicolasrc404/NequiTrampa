using Google.Cloud.Spanner.Data;
using Nequi.Shared.Financial;

namespace Nequi.Shared.Data;

/// <summary>
/// Spanner persistence for durable financial intentions. The transaction-aware
/// methods never open a second transaction: the coordinator owns the supplied
/// transaction together with the financial effect.
/// </summary>
public sealed class SpannerFinancialIntentStore
    : IFinancialIntentStore
{
    private readonly Func<SpannerConnection> _connectionFactory;

    public SpannerFinancialIntentStore(SpannerDb db)
        : this(db is null
            ? throw new ArgumentNullException(nameof(db))
            : db.Open)
    {
    }

    /// <summary>
    /// Allows isolated tests to provide a connection factory configured with
    /// EmulatorOnly. Production composition should use the SpannerDb overload.
    /// </summary>
    public SpannerFinancialIntentStore(Func<SpannerConnection> connectionFactory)
    {
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
    }

    public async Task<FinancialIntentResult> GetAsync(
        FinancialIntentIdentity identity,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(identity);

        await using var connection = _connectionFactory();
        await connection.OpenAsync(ct);
        var intent = await ReadByIdentityAsync(connection, null, identity, ct);
        return intent is null
            ? FinancialIntentResult.NotFound()
            : ToResult(intent);
    }

    public async Task<FinancialIntentResult> GetInTransactionAsync(
        SpannerConnection connection,
        SpannerTransaction transaction,
        FinancialIntentIdentity identity,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(connection);
        ArgumentNullException.ThrowIfNull(transaction);
        ArgumentNullException.ThrowIfNull(identity);

        var intent = await ReadByIdentityAsync(connection, transaction, identity, ct);
        return intent is null ? FinancialIntentResult.NotFound() : ToResult(intent);
    }

    public async Task<FinancialIntentResult> GetOutcomeAsync(
        FinancialIntentIdentity identity,
        CancellationToken ct) => await GetAsync(identity, ct);

    public async Task<FinancialIntentResult> GetOrCreateInTransactionAsync(
        FinancialIntentTransactionContext transaction,
        FinancialIntentIdentity identity,
        string authenticatedActorId,
        string requestHash,
        string financialIntentId,
        string operationId,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(transaction);
        ArgumentNullException.ThrowIfNull(identity);
        Require(authenticatedActorId, nameof(authenticatedActorId));
        Require(requestHash, nameof(requestHash));
        Require(financialIntentId, nameof(financialIntentId));
        Require(operationId, nameof(operationId));

        var existing = await ReadByIdentityAsync(
            transaction.Connection,
            transaction.Transaction,
            identity,
            ct);
        if (existing is not null)
        {
            if (existing.RequestHash != requestHash)
                return FinancialIntentResult.Conflict(existing);

            return ToResult(existing);
        }

        var createdAt = DateTimeOffset.UtcNow;
        var intent = new FinancialIntent(
            financialIntentId,
            authenticatedActorId,
            identity,
            requestHash,
            FinancialIntentStatus.InProgress,
            createdAt,
            operationId);

        await InsertInTransactionAsync(
            transaction.Connection,
            transaction.Transaction,
            intent,
            ct);

        return FinancialIntentResult.New(intent);
    }

    public async Task<FinancialIntentResult> ConfirmInTransactionAsync(
        FinancialIntentTransactionContext transaction,
        string financialIntentId,
        string operationId,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(transaction);
        Require(financialIntentId, nameof(financialIntentId));
        Require(operationId, nameof(operationId));

        await using var command = transaction.Connection.CreateDmlCommand(
            "UPDATE financial_intents SET financial_status='CONFIRMED', " +
            "operation_id=@operation, confirmed_at=CURRENT_TIMESTAMP() " +
            "WHERE financial_intent_id=@intent AND operation_id=@operation " +
            "AND financial_status='IN_PROGRESS'");
        command.Transaction = transaction.Transaction;
        command.Parameters.Add("intent", SpannerDbType.String, financialIntentId);
        command.Parameters.Add("operation", SpannerDbType.String, operationId);

        if (await command.ExecuteNonQueryAsync(ct) != 1)
            return FinancialIntentResult.StorageError("financial_intent_confirmation_conflict");

        var confirmed = await ReadByIdAsync(
            transaction.Connection,
            transaction.Transaction,
            financialIntentId,
            ct);
        return confirmed is null
            ? FinancialIntentResult.StorageError("financial_intent_confirmation_missing")
            : FinancialIntentResult.Confirmed(confirmed);
    }

    private static async Task<FinancialIntent?> ReadByIdentityAsync(
        SpannerConnection connection,
        SpannerTransaction? transaction,
        FinancialIntentIdentity identity,
        CancellationToken ct)
    {
        await using var command = connection.CreateSelectCommand(
            "SELECT financial_intent_id, authenticated_actor_id, domain_actor_id, " +
            "operation_type, scope, idempotency_key, request_hash, operation_id, " +
            "financial_status, created_at, confirmed_at " +
            "FROM financial_intents " +
            "WHERE domain_actor_id=@actor AND operation_type=@type " +
            "AND scope=@scope AND idempotency_key=@key");
        command.Transaction = transaction;
        command.Parameters.Add("actor", SpannerDbType.String, identity.DomainActorId);
        command.Parameters.Add("type", SpannerDbType.String, identity.OperationType);
        command.Parameters.Add("scope", SpannerDbType.String, identity.Scope);
        command.Parameters.Add("key", SpannerDbType.String, identity.IdempotencyKey);

        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? ReadIntent(reader) : null;
    }

    private static async Task<FinancialIntent?> ReadByIdAsync(
        SpannerConnection connection,
        SpannerTransaction transaction,
        string financialIntentId,
        CancellationToken ct)
    {
        await using var command = connection.CreateSelectCommand(
            "SELECT financial_intent_id, authenticated_actor_id, domain_actor_id, " +
            "operation_type, scope, idempotency_key, request_hash, operation_id, " +
            "financial_status, created_at, confirmed_at " +
            "FROM financial_intents WHERE financial_intent_id=@intent");
        command.Transaction = transaction;
        command.Parameters.Add("intent", SpannerDbType.String, financialIntentId);

        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? ReadIntent(reader) : null;
    }

    private static async Task InsertInTransactionAsync(
        SpannerConnection connection,
        SpannerTransaction transaction,
        FinancialIntent intent,
        CancellationToken ct)
    {
        await using var command = connection.CreateDmlCommand(
            "INSERT INTO financial_intents " +
            "(financial_intent_id, authenticated_actor_id, domain_actor_id, operation_type, " +
            "scope, idempotency_key, request_hash, operation_id, financial_status, " +
            "created_at, confirmed_at) VALUES " +
            "(@intent, @auth, @actor, @type, @scope, @key, @hash, @operation, " +
            "@status, @created, @confirmed)");
        command.Transaction = transaction;
        command.Parameters.Add("intent", SpannerDbType.String, intent.FinancialIntentId);
        command.Parameters.Add("auth", SpannerDbType.String, intent.AuthenticatedActorId);
        command.Parameters.Add("actor", SpannerDbType.String, intent.Identity.DomainActorId);
        command.Parameters.Add("type", SpannerDbType.String, intent.Identity.OperationType);
        command.Parameters.Add("scope", SpannerDbType.String, intent.Identity.Scope);
        command.Parameters.Add("key", SpannerDbType.String, intent.Identity.IdempotencyKey);
        command.Parameters.Add("hash", SpannerDbType.String, intent.RequestHash);
        command.Parameters.Add("operation", SpannerDbType.String, intent.OperationId);
        command.Parameters.Add("status", SpannerDbType.String, ToDatabaseStatus(intent.FinancialStatus));
        command.Parameters.Add("created", SpannerDbType.Timestamp, intent.CreatedAt.UtcDateTime);
        command.Parameters.Add("confirmed", SpannerDbType.Timestamp, DBNull.Value);
        await command.ExecuteNonQueryAsync(ct);
    }

    private static FinancialIntent ReadIntent(System.Data.Common.DbDataReader reader)
    {
        var status = ParseStatus(reader.GetString(8));
        var confirmedAt = reader.IsDBNull(10)
            ? (DateTimeOffset?)null
            : new DateTimeOffset(reader.GetFieldValue<DateTime>(10), TimeSpan.Zero);
        var intent = new FinancialIntent(
            reader.GetString(0),
            reader.GetString(1),
            new FinancialIntentIdentity(
                reader.GetString(2),
                reader.GetString(3),
                reader.GetString(4),
                reader.GetString(5)),
            reader.GetString(6),
            status,
            new DateTimeOffset(reader.GetFieldValue<DateTime>(9), TimeSpan.Zero),
            reader.IsDBNull(7) ? null : reader.GetString(7),
            confirmedAt);
        return intent;
    }

    private static FinancialIntentResult ToResult(FinancialIntent intent) => intent.FinancialStatus switch
    {
        FinancialIntentStatus.Confirmed => FinancialIntentResult.Confirmed(intent),
        FinancialIntentStatus.FailedWithoutEffect => FinancialIntentResult.FailedWithoutEffect(intent),
        FinancialIntentStatus.Uncertain => FinancialIntentResult.Uncertain(intent),
        FinancialIntentStatus.HistoricalUncorrelatable => FinancialIntentResult.HistoricalUncorrelatable(intent),
        _ => FinancialIntentResult.InProgress(intent),
    };

    private static FinancialIntentStatus ParseStatus(string value) => value switch
    {
        "IN_PROGRESS" => FinancialIntentStatus.InProgress,
        "CONFIRMED" => FinancialIntentStatus.Confirmed,
        "FAILED_WITHOUT_EFFECT" => FinancialIntentStatus.FailedWithoutEffect,
        "UNCERTAIN" => FinancialIntentStatus.Uncertain,
        "HISTORICAL_UNCORRELATABLE" => FinancialIntentStatus.HistoricalUncorrelatable,
        _ => throw new InvalidOperationException($"Unknown financial intent status '{value}'."),
    };

    private static string ToDatabaseStatus(FinancialIntentStatus value) => value switch
    {
        FinancialIntentStatus.InProgress => "IN_PROGRESS",
        FinancialIntentStatus.Confirmed => "CONFIRMED",
        FinancialIntentStatus.FailedWithoutEffect => "FAILED_WITHOUT_EFFECT",
        FinancialIntentStatus.Uncertain => "UNCERTAIN",
        FinancialIntentStatus.HistoricalUncorrelatable => "HISTORICAL_UNCORRELATABLE",
        _ => throw new ArgumentOutOfRangeException(nameof(value)),
    };

    private static void Require(string value, string name)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Value is required.", name);
    }
}
