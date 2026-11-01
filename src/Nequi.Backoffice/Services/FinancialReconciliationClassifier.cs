using System.Data.Common;
using Google.Cloud.Spanner.Data;
using Nequi.Shared.Data;

namespace Nequi.Backoffice.Services;

public enum FinancialReconciliationClassification
{
    ConfirmedCorrelated,
    ConfirmedHistoricalUncorrelatable,
    Uncertain,
    Inconsistent,
    ReservationMissingOrExpired,
    NotVerifiable,
}

public sealed record FinancialReconciliationQuery(
    string AuthenticatedActorId,
    string Scope,
    string IdempotencyKey,
    string? RequestHash = null);

public sealed record FinancialReconciliationResult(
    FinancialReconciliationClassification Classification,
    IReadOnlyList<string> Evidence,
    string? Reason,
    IReadOnlyList<string> AvailableIdentifiers,
    bool RequiresManualReview,
    bool CanReplay);

/// <summary>
/// Read-only classification of the durable evidence behind an idempotency
/// reservation. It never releases reservations, creates intents, or writes
/// ledger, balances, outbox, or audit records.
/// </summary>
public sealed class FinancialReconciliationClassifier
{
    private readonly Func<SpannerConnection> _connectionFactory;

    public FinancialReconciliationClassifier(SpannerDb db)
        : this(db is null ? throw new ArgumentNullException(nameof(db)) : db.Open)
    {
    }

    public FinancialReconciliationClassifier(Func<SpannerConnection> connectionFactory) =>
        _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));

    public async Task<FinancialReconciliationResult> ClassifyAsync(
        FinancialReconciliationQuery query,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        if (string.IsNullOrWhiteSpace(query.AuthenticatedActorId) ||
            string.IsNullOrWhiteSpace(query.Scope) ||
            string.IsNullOrWhiteSpace(query.IdempotencyKey))
            return Block(FinancialReconciliationClassification.NotVerifiable, "reconciliation_invalid_identity");

        await using var connection = _connectionFactory();
        try
        {
            await connection.OpenAsync(ct);
            var actorResolution = await ResolveActorAsync(connection, query.AuthenticatedActorId, ct);
            if (actorResolution is not { IsUnique: true })
                return Block(FinancialReconciliationClassification.NotVerifiable, "authenticated_actor_not_correlatable");
            var actor = actorResolution.ActorId!;

            var reservation = await ReadReservationAsync(connection, query, ct);
            if (reservation is not null && query.RequestHash is not null &&
                !string.Equals(reservation.RequestHash, query.RequestHash, StringComparison.Ordinal))
                return Inconsistent("http_request_hash_mismatch", reservation.OperationId);

            var operationType = OperationTypeFor(query.Scope);
            if (operationType is null)
                return Block(FinancialReconciliationClassification.NotVerifiable, "financial_scope_not_supported");

            var operations = await ReadOperationsAsync(connection, actor, operationType, query.IdempotencyKey, ct);
            if (operations.Count > 1)
                return Inconsistent("multiple_financial_operations_for_identity", operations.Select(o => o.OperationId).ToArray());

            var intentRead = await ReadIntentAsync(connection, actor, operationType, query.Scope, query.IdempotencyKey, ct);
            if (!intentRead.Available)
            {
                return operations.Count == 1 && IsCompleted(operations[0])
                    ? Historical(operations[0].OperationId)
                    : Block(FinancialReconciliationClassification.NotVerifiable, "financial_intent_schema_unavailable");
            }

            var intent = intentRead.Intent;
            if (intent is not null && query.RequestHash is not null &&
                !string.Equals(intent.RequestHash, query.RequestHash, StringComparison.Ordinal))
                return Inconsistent("financial_intent_hash_mismatch", intent.FinancialIntentId, intent.OperationId);

            if (intent is not null && intent.Status is "UNCERTAIN" or "IN_PROGRESS" or "FAILED_WITHOUT_EFFECT")
                return Block(FinancialReconciliationClassification.Uncertain, "financial_intent_not_confirmed", intent.FinancialIntentId, intent.OperationId);

            if (intent is not null && intent.Status == "HISTORICAL_UNCORRELATABLE")
                return Block(FinancialReconciliationClassification.ConfirmedHistoricalUncorrelatable, "financial_intent_marked_uncorrelatable", intent.FinancialIntentId, intent.OperationId);

            if (intent is not null && intent.Status == "CONFIRMED")
            {
                if (string.IsNullOrWhiteSpace(intent.OperationId) || operations.Count != 1)
                    return Block(FinancialReconciliationClassification.Inconsistent, "confirmed_intent_has_no_matching_ledger_operation", intent.FinancialIntentId, intent.OperationId);

                var operation = operations[0];
                if (!string.Equals(intent.OperationId, operation.OperationId, StringComparison.Ordinal) ||
                    !IsCompleted(operation))
                    return Inconsistent("financial_intent_ledger_mismatch", intent.FinancialIntentId, intent.OperationId, operation.OperationId);

                var evidence = new List<string>
                {
                    "authenticated_actor_resolved",
                    "financial_intent_confirmed",
                    "ledger_operation_completed",
                    "operation_id_matches_financial_intent",
                    reservation is null ? "http_reservation_missing_or_expired" : "http_reservation_observed",
                };
                return new(FinancialReconciliationClassification.ConfirmedCorrelated, evidence, null,
                    Ids(intent.FinancialIntentId, intent.OperationId, operation.OperationId), false, query.RequestHash is not null);
            }

            if (operations.Count == 1 && IsCompleted(operations[0]))
                return Historical(operations[0].OperationId);

            return reservation is null
                ? Block(FinancialReconciliationClassification.ReservationMissingOrExpired, "reservation_missing_without_durable_confirmation")
                : Block(FinancialReconciliationClassification.NotVerifiable, "no_durable_financial_confirmation");
        }
        catch (SpannerException)
        {
            return Block(FinancialReconciliationClassification.NotVerifiable, "reconciliation_storage_not_verifiable");
        }
    }

    private static string? OperationTypeFor(string scope) => scope switch
    {
        "POST:/v1/transfers" => "INTERNAL_TRANSFER",
        "POST:/v1/recharges" => "SIMULATED_RECHARGE",
        _ => null,
    };

    private static async Task<ActorResolution?> ResolveActorAsync(SpannerConnection connection, string authSubject, CancellationToken ct)
    {
        await using var command = connection.CreateSelectCommand("SELECT client_id FROM clients WHERE auth_subject=@subject");
        command.Parameters.Add("subject", SpannerDbType.String, authSubject);
        await using var reader = await command.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct)) return null;
        var actor = reader.GetString(0);
        return await reader.ReadAsync(ct)
            ? new ActorResolution(false, null)
            : new ActorResolution(true, actor);
    }

    private static async Task<Reservation?> ReadReservationAsync(SpannerConnection connection, FinancialReconciliationQuery query, CancellationToken ct)
    {
        await using var command = connection.CreateSelectCommand(
            "SELECT request_hash, status, operation_id FROM idempotency_records WHERE actor_id=@actor AND scope=@scope AND idempotency_key=@key");
        command.Parameters.Add("actor", SpannerDbType.String, query.AuthenticatedActorId);
        command.Parameters.Add("scope", SpannerDbType.String, query.Scope);
        command.Parameters.Add("key", SpannerDbType.String, query.IdempotencyKey);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct)
            ? new Reservation(reader.GetString(0), reader.GetString(1), reader.IsDBNull(2) ? null : reader.GetString(2))
            : null;
    }

    private static async Task<List<Operation>> ReadOperationsAsync(SpannerConnection connection, string actor, string type, string key, CancellationToken ct)
    {
        await using var command = connection.CreateSelectCommand(
            "SELECT operation_id, status, actor_id, type, idempotency_key FROM ledger_operations " +
            "WHERE actor_id=@actor AND type=@type AND idempotency_key=@key");
        command.Parameters.Add("actor", SpannerDbType.String, actor);
        command.Parameters.Add("type", SpannerDbType.String, type);
        command.Parameters.Add("key", SpannerDbType.String, key);
        var result = new List<Operation>();
        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
            result.Add(new Operation(reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3), reader.GetString(4)));
        return result;
    }

    private static async Task<(bool Available, IntentEvidence? Intent)> ReadIntentAsync(
        SpannerConnection connection, string actor, string type, string scope, string key, CancellationToken ct)
    {
        try
        {
            await using var command = connection.CreateSelectCommand(
                "SELECT financial_intent_id, request_hash, operation_id, financial_status FROM financial_intents " +
                "WHERE domain_actor_id=@actor AND operation_type=@type AND scope=@scope AND idempotency_key=@key");
            command.Parameters.Add("actor", SpannerDbType.String, actor);
            command.Parameters.Add("type", SpannerDbType.String, type switch { "INTERNAL_TRANSFER" => "TRANSFER", "SIMULATED_RECHARGE" => "RECHARGE", _ => type });
            command.Parameters.Add("scope", SpannerDbType.String, scope);
            command.Parameters.Add("key", SpannerDbType.String, key);
            await using var reader = await command.ExecuteReaderAsync(ct);
            if (!await reader.ReadAsync(ct)) return (true, null);
            var intent = new IntentEvidence(reader.GetString(0), reader.GetString(1), reader.IsDBNull(2) ? null : reader.GetString(2), reader.GetString(3));
            if (await reader.ReadAsync(ct)) return (true, null);
            return (true, intent);
        }
        catch (SpannerException ex) when (ex.Message.Contains("financial_intents", StringComparison.OrdinalIgnoreCase))
        {
            return (false, null);
        }
    }

    private static bool IsCompleted(Operation operation) => operation.Status == "COMPLETED";

    private static FinancialReconciliationResult Historical(params string?[] ids) =>
        new(FinancialReconciliationClassification.ConfirmedHistoricalUncorrelatable,
            ["ledger_operation_completed", "financial_intent_absent_or_unavailable"],
            "confirmed_operation_without_durable_financial_intent", Ids(ids), true, false);

    private static FinancialReconciliationResult Inconsistent(string reason, params string?[] ids) =>
        Block(FinancialReconciliationClassification.Inconsistent, reason, ids);

    private static FinancialReconciliationResult Block(FinancialReconciliationClassification classification, string reason, params string?[] ids) =>
        new(classification, [], reason, Ids(ids), true, false);

    private static IReadOnlyList<string> Ids(params string?[] ids) => ids.Where(id => !string.IsNullOrWhiteSpace(id)).Cast<string>().Distinct(StringComparer.Ordinal).ToArray();

    private sealed record Reservation(string RequestHash, string Status, string? OperationId);
    private sealed record Operation(string OperationId, string Status, string ActorId, string Type, string IdempotencyKey);
    private sealed record IntentEvidence(string FinancialIntentId, string RequestHash, string? OperationId, string Status);
    private sealed record ActorResolution(bool IsUnique, string? ActorId);
}
