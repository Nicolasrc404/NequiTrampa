using Google.Cloud.Spanner.V1;
using System.Data.Common;
using Google.Cloud.Spanner.Data;
using Nequi.Shared.Data;

namespace Nequi.Backoffice.Services;

public sealed record OperationDto(string OperationId, string PublicReference, string Type, string Status, string ActorId, string ActorType,
    long AmountCents, string Currency, string? OriginalOperationId, string? Reason, DateTimeOffset CreatedAt, DateTimeOffset? ConfirmedAt);

public sealed record LedgerEntryDto(int EntryNo, string AccountId, string? ClientId, string AccountType,
    long DeltaCents, long BalanceBeforeCents, long BalanceAfterCents, DateTimeOffset CreatedAt);

public sealed record ClientDto(string ClientId, string AuthSubject, string TransferCode, string Status, string? Timezone,
    string? AccountId, string? WalletStatus, long? BalanceCents, DateTimeOffset CreatedAt);

public sealed record AdministratorDto(string AdministratorId, string AuthSubject, string Email, string DisplayName, string AdminLevel, string Status);

public sealed record OutboxEventDto(string EventId, string EventType, DateTimeOffset CreatedAt, DateTimeOffset? PublishedAt, long Attempts, string? LastError);

/// <summary>Read-only queries over the authoritative Spanner ledger.</summary>
public sealed class LedgerReader(SpannerDb db)
{
    private const string OpColumns =
        "operation_id, public_reference, type, status, actor_id, actor_type, amount_minor, currency, original_operation_id, reason, created_at, confirmed_at";

    internal static DateTimeOffset Ts(DateTime d) => new(DateTime.SpecifyKind(d, DateTimeKind.Utc));
    internal static long Minor(SpannerNumeric n) => checked((long)(decimal)n);

    private static OperationDto MapOp(DbDataReader r) => new(
        r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.GetString(4), r.GetString(5),
        Minor(r.GetFieldValue<SpannerNumeric>(6)), r.GetString(7),
        r.IsDBNull(8) ? null : r.GetString(8), r.IsDBNull(9) ? null : r.GetString(9),
        Ts(r.GetFieldValue<DateTime>(10)), r.IsDBNull(11) ? null : Ts(r.GetFieldValue<DateTime>(11)));

    /// <summary>Finds an operation by internal operation_id or public reference (TRF-..., RCG-..., REV-..., ADJ-...).</summary>
    public async Task<OperationDto?> FindOperationAsync(string idOrReference, CancellationToken ct, string? type = null)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateSelectCommand(
            $"SELECT {OpColumns} FROM ledger_operations WHERE (operation_id=@id OR public_reference=@id)" + (type is null ? "" : " AND type=@type"));
        cmd.Parameters.Add("id", SpannerDbType.String, idOrReference);
        if (type is not null) cmd.Parameters.Add("type", SpannerDbType.String, type);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? MapOp(r) : null;
    }

    public async Task<IReadOnlyList<LedgerEntryDto>> EntriesAsync(string operationId, CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateSelectCommand(
            "SELECT e.entry_no, e.account_id, a.client_id, a.account_type, e.delta_minor, e.balance_before_minor, e.balance_after_minor, e.created_at " +
            "FROM ledger_entries e JOIN wallet_accounts a ON a.account_id = e.account_id WHERE e.operation_id=@op ORDER BY e.entry_no");
        cmd.Parameters.Add("op", SpannerDbType.String, operationId);
        var list = new List<LedgerEntryDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new LedgerEntryDto((int)r.GetInt64(0), r.GetString(1), r.IsDBNull(2) ? null : r.GetString(2), r.GetString(3),
                Minor(r.GetFieldValue<SpannerNumeric>(4)), Minor(r.GetFieldValue<SpannerNumeric>(5)), Minor(r.GetFieldValue<SpannerNumeric>(6)),
                Ts(r.GetFieldValue<DateTime>(7))));
        return list;
    }

    public async Task<IReadOnlyList<OutboxEventDto>> OutboxAsync(string operationId, CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateSelectCommand(
            "SELECT event_id, event_type, created_at, published_at, attempts, last_error FROM outbox_events WHERE aggregate_id=@op ORDER BY created_at");
        cmd.Parameters.Add("op", SpannerDbType.String, operationId);
        var list = new List<OutboxEventDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new OutboxEventDto(r.GetString(0), r.GetString(1), Ts(r.GetFieldValue<DateTime>(2)),
                r.IsDBNull(3) ? null : Ts(r.GetFieldValue<DateTime>(3)), r.GetInt64(4), r.IsDBNull(5) ? null : r.GetString(5)));
        return list;
    }

    /// <summary>Operations that moved money in any wallet of the client (newest first).</summary>
    public async Task<IReadOnlyList<OperationDto>> ClientOperationsAsync(string clientId, int limit, CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateSelectCommand(
            "SELECT o.operation_id, o.public_reference, o.type, o.status, o.actor_id, o.actor_type, o.amount_minor, o.currency, " +
            "o.original_operation_id, o.reason, o.created_at, o.confirmed_at FROM ledger_operations o WHERE o.operation_id IN (" +
            "SELECT e.operation_id FROM ledger_entries e JOIN wallet_accounts a ON a.account_id=e.account_id WHERE a.client_id=@c) " +
            "ORDER BY o.created_at DESC LIMIT @limit");
        cmd.Parameters.Add("c", SpannerDbType.String, clientId);
        cmd.Parameters.Add("limit", SpannerDbType.Int64, (long)limit);
        var list = new List<OperationDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct)) list.Add(MapOp(r));
        return list;
    }

    private const string ClientSelect =
        "SELECT c.client_id, c.auth_subject, c.public_transfer_code, c.status, c.timezone, w.account_id, w.status, w.current_balance_minor, c.created_at " +
        "FROM clients c LEFT JOIN wallet_accounts w ON w.client_id=c.client_id AND w.account_type='CLIENT_WALLET' ";

    private static ClientDto MapClient(DbDataReader r) => new(
        r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.IsDBNull(4) ? null : r.GetString(4),
        r.IsDBNull(5) ? null : r.GetString(5), r.IsDBNull(6) ? null : r.GetString(6),
        r.IsDBNull(7) ? null : Minor(r.GetFieldValue<SpannerNumeric>(7)), Ts(r.GetFieldValue<DateTime>(8)));

    /// <summary>Finds a client by client_id, auth_subject or public transfer code.</summary>
    public async Task<ClientDto?> FindClientAsync(string key, CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateSelectCommand(ClientSelect + "WHERE c.client_id=@k OR c.auth_subject=@k OR c.public_transfer_code=@k");
        cmd.Parameters.Add("k", SpannerDbType.String, key);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        return await r.ReadAsync(ct) ? MapClient(r) : null;
    }

    public async Task<(IReadOnlyList<ClientDto> Items, long Total)> ListClientsAsync(int page, int pageSize, string? status, CancellationToken ct)
    {
        await using var conn = db.Open();
        var where = status is null ? "" : "WHERE c.status=@status ";
        var cmd = conn.CreateSelectCommand(ClientSelect + where + "ORDER BY c.created_at, c.client_id LIMIT @limit OFFSET @offset");
        if (status is not null) cmd.Parameters.Add("status", SpannerDbType.String, status);
        cmd.Parameters.Add("limit", SpannerDbType.Int64, (long)pageSize);
        cmd.Parameters.Add("offset", SpannerDbType.Int64, (long)(page - 1) * pageSize);
        var list = new List<ClientDto>();
        await using (var r = await cmd.ExecuteReaderAsync(ct))
            while (await r.ReadAsync(ct)) list.Add(MapClient(r));

        var count = conn.CreateSelectCommand("SELECT COUNT(*) FROM clients c " + where);
        if (status is not null) count.Parameters.Add("status", SpannerDbType.String, status);
        var total = Convert.ToInt64(await count.ExecuteScalarAsync(ct));
        return (list, total);
    }

    public async Task<IReadOnlyList<AdministratorDto>> ListAdministratorsAsync(CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateSelectCommand("SELECT administrator_id, auth_subject, email, display_name, admin_level, status FROM administrators ORDER BY created_at");
        var list = new List<AdministratorDto>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            list.Add(new AdministratorDto(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.GetString(4), r.GetString(5)));
        return list;
    }
}
