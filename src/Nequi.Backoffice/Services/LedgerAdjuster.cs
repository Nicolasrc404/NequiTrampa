using Google.Cloud.Spanner.V1;
using Google.Cloud.Spanner.Data;
using Nequi.Shared.Data;
using Nequi.Shared.Events;
using Nequi.Shared.Security;

namespace Nequi.Backoffice.Services;

/// <summary>Domain error mapped to an RFC 9457 response by the controllers.</summary>
public sealed class BackofficeException(int status, string code, string title, string? detail = null) : Exception(detail ?? title)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
    public string Title { get; } = title;
    public string? Detail { get; } = detail;
}

/// <summary>
/// Formal corrective operations over the authoritative ledger: REVERSAL (compensates a completed operation) and
/// ADJUSTMENT (credit/debit against SYSTEM_FUNDING). Nothing is edited or deleted: each correction is a new immutable
/// ledger operation + double-entry rows + balance update (optimistic lock) + outbox event, all in ONE Spanner transaction.
/// </summary>
public sealed class LedgerAdjuster(SpannerDb db, LedgerReader reader, ILogger<LedgerAdjuster> logger)
{
    private static readonly HashSet<string> Reversible = ["INTERNAL_TRANSFER", "SIMULATED_RECHARGE"];

    private sealed record Acct(string AccountId, string? ClientId, string AccountType, long Balance, long Version, string Status);

    // ------------------------------------------------------------------ reversal
    public async Task<OperationDto> ReverseAsync(string originalKey, string reason, CurrentUser actor, string idempotencyKey, CancellationToken ct)
    {
        var opId = Guid.NewGuid().ToString();
        var publicRef = $"REV-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..25];
        var occurredAt = DateTimeOffset.UtcNow;
        string originalOpId = "";

        await using var conn = db.Open();
        await conn.RunWithRetriableTransactionAsync(async tx =>
        {
            var o = conn.CreateSelectCommand("SELECT operation_id, public_reference, type, status FROM ledger_operations WHERE operation_id=@k OR public_reference=@k");
            o.Transaction = tx;
            o.Parameters.Add("k", SpannerDbType.String, originalKey);
            string origRef, origType, origStatus;
            await using (var r = await o.ExecuteReaderAsync(ct))
            {
                if (!await r.ReadAsync(ct)) throw new BackofficeException(404, "not_found", "Operation not found");
                originalOpId = r.GetString(0); origRef = r.GetString(1); origType = r.GetString(2); origStatus = r.GetString(3);
            }
            if (!Reversible.Contains(origType))
                throw new BackofficeException(422, "not_reversible", "Operation type cannot be reversed", $"Only {string.Join(", ", Reversible)} can be reversed (was {origType}).");

            var dup = conn.CreateSelectCommand("SELECT public_reference FROM ledger_operations WHERE original_operation_id=@o AND type='REVERSAL'");
            dup.Transaction = tx;
            dup.Parameters.Add("o", SpannerDbType.String, originalOpId);
            await using (var r = await dup.ExecuteReaderAsync(ct))
                if (await r.ReadAsync(ct))
                    throw new BackofficeException(409, "already_reversed", "Operation already reversed", $"Reversal {r.GetString(0)} exists.");

            if (origStatus != "COMPLETED")
                throw new BackofficeException(409, "not_completed", "Only COMPLETED operations can be reversed", $"Status is {origStatus}.");

            var entriesCmd = conn.CreateSelectCommand(
                "SELECT e.entry_no, e.account_id, e.delta_minor, a.client_id, a.account_type, a.current_balance_minor, a.version, a.status " +
                "FROM ledger_entries e JOIN wallet_accounts a ON a.account_id=e.account_id WHERE e.operation_id=@o ORDER BY e.entry_no");
            entriesCmd.Transaction = tx;
            entriesCmd.Parameters.Add("o", SpannerDbType.String, originalOpId);
            var entries = new List<(int No, Acct A, long Delta)>();
            await using (var r = await entriesCmd.ExecuteReaderAsync(ct))
                while (await r.ReadAsync(ct))
                    entries.Add(((int)r.GetInt64(0),
                        new Acct(r.GetString(1), r.IsDBNull(3) ? null : r.GetString(3), r.GetString(4),
                            LedgerReader.Minor(r.GetFieldValue<SpannerNumeric>(5)), r.GetInt64(6), r.GetString(7)),
                        LedgerReader.Minor(r.GetFieldValue<SpannerNumeric>(2))));
            if (entries.Count == 0) throw new BackofficeException(409, "no_entries", "Operation has no ledger entries");

            long amount = entries.Max(e => Math.Abs(e.Delta));
            await InsertOperationAsync(conn, tx, opId, publicRef, "REVERSAL", actor, amount, originalOpId, reason, idempotencyKey, ct);
            var mark = conn.CreateDmlCommand("UPDATE ledger_operations SET status='REVERSED', updated_at=CURRENT_TIMESTAMP() WHERE operation_id=@o");
            mark.Transaction = tx;
            mark.Parameters.Add("o", SpannerDbType.String, originalOpId);
            await mark.ExecuteNonQueryAsync(ct);

            foreach (var (no, a, delta) in entries)
            {
                var newBalance = a.Balance - delta; // exact inverse of the original delta
                if (newBalance < 0 && a.AccountType == "CLIENT_WALLET")
                    throw new BackofficeException(409, "insufficient_funds", "Reversal would overdraw the client wallet",
                        $"Wallet {a.AccountId} balance {a.Balance} cannot absorb {-delta} minor units.");
                await InsertEntryAsync(conn, tx, opId, no, a.AccountId, -delta, a.Balance, newBalance, ct);
                await UpdateBalanceAsync(conn, tx, a.AccountId, newBalance, a.Version, ct);
                if (a.ClientId is not null)
                    await InsertOutboxAsync(conn, tx, new DomainEvent(Guid.NewGuid().ToString(), EventTypes.ReversalCompleted, opId, a.ClientId,
                        occurredAt, -delta, "COP", null, $"Reverso de {origRef}: {reason}", newBalance), ct);
            }
        });

        logger.LogInformation("REVERSAL COMMITTED operation_id={OperationId} original={Original} actor={Actor}", opId, originalOpId, actor.Uid);
        return (await reader.FindOperationAsync(opId, ct))!;
    }

    // ---------------------------------------------------------------- adjustment
    public async Task<OperationDto> AdjustAsync(string clientKey, bool credit, long amountCop, string reason, CurrentUser actor, string idempotencyKey, CancellationToken ct)
    {
        var amount = checked(amountCop * 100);
        var opId = Guid.NewGuid().ToString();
        var publicRef = $"ADJ-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..25];
        var occurredAt = DateTimeOffset.UtcNow;

        await using var conn = db.Open();
        await conn.RunWithRetriableTransactionAsync(async tx =>
        {
            var c = conn.CreateSelectCommand(
                "SELECT c.client_id, c.status, a.account_id, a.current_balance_minor, a.version, a.status FROM clients c " +
                "JOIN wallet_accounts a ON a.client_id=c.client_id AND a.account_type='CLIENT_WALLET' " +
                "WHERE c.client_id=@k OR c.auth_subject=@k OR c.public_transfer_code=@k");
            c.Transaction = tx;
            c.Parameters.Add("k", SpannerDbType.String, clientKey);
            string clientId, clientStatus, accId, accStatus; long bal, ver;
            await using (var r = await c.ExecuteReaderAsync(ct))
            {
                if (!await r.ReadAsync(ct)) throw new BackofficeException(404, "not_found", "Client or wallet not found");
                clientId = r.GetString(0); clientStatus = r.GetString(1); accId = r.GetString(2);
                bal = LedgerReader.Minor(r.GetFieldValue<SpannerNumeric>(3)); ver = r.GetInt64(4); accStatus = r.GetString(5);
            }
            if (clientStatus != "ACTIVE" || accStatus != "ACTIVE")
                throw new BackofficeException(409, "client_inactive", "Client wallet is not active");

            var s = conn.CreateSelectCommand(
                "SELECT account_id, current_balance_minor, version FROM wallet_accounts WHERE account_type='SYSTEM_FUNDING' AND status='ACTIVE' AND currency='COP' LIMIT 1");
            s.Transaction = tx;
            string sysId; long sysBal, sysVer;
            await using (var r = await s.ExecuteReaderAsync(ct))
            {
                if (!await r.ReadAsync(ct)) throw new BackofficeException(409, "no_system_funding", "No active SYSTEM_FUNDING account");
                sysId = r.GetString(0); sysBal = LedgerReader.Minor(r.GetFieldValue<SpannerNumeric>(1)); sysVer = r.GetInt64(2);
            }

            var clientDelta = credit ? amount : -amount;
            var newClient = bal + clientDelta;
            if (newClient < 0) throw new BackofficeException(409, "insufficient_funds", "Debit adjustment exceeds wallet balance");
            var newSys = sysBal - clientDelta;

            await InsertOperationAsync(conn, tx, opId, publicRef, "ADMIN_ADJUSTMENT", actor, amount, null, reason, idempotencyKey, ct);
            await InsertEntryAsync(conn, tx, opId, 1, sysId, -clientDelta, sysBal, newSys, ct);
            await InsertEntryAsync(conn, tx, opId, 2, accId, clientDelta, bal, newClient, ct);
            await UpdateBalanceAsync(conn, tx, sysId, newSys, sysVer, ct);
            await UpdateBalanceAsync(conn, tx, accId, newClient, ver, ct);
            await InsertOutboxAsync(conn, tx, new DomainEvent(Guid.NewGuid().ToString(), EventTypes.AdminAdjustment, opId, clientId,
                occurredAt, clientDelta, "COP", null, $"Ajuste {(credit ? "crédito" : "débito")}: {reason}", newClient), ct);
        });

        logger.LogInformation("ADJUSTMENT COMMITTED operation_id={OperationId} actor={Actor} credit={Credit}", opId, actor.Uid, credit);
        return (await reader.FindOperationAsync(opId, ct))!;
    }

    // ------------------------------------------------------------ client status
    /// <summary>Activates, suspends or closes a client (ACTIVE | SUSPENDED | CLOSED) and freezes/closes its wallet. Never touches balances.</summary>
    public async Task<(string Old, string New)> SetClientStatusAsync(string clientKey, string status, CancellationToken ct)
    {
        string old = "", clientId = "";
        await using var conn = db.Open();
        await conn.RunWithRetriableTransactionAsync(async tx =>
        {
            var c = conn.CreateSelectCommand("SELECT client_id, status FROM clients WHERE client_id=@k OR auth_subject=@k OR public_transfer_code=@k");
            c.Transaction = tx;
            c.Parameters.Add("k", SpannerDbType.String, clientKey);
            await using (var r = await c.ExecuteReaderAsync(ct))
            {
                if (!await r.ReadAsync(ct)) throw new BackofficeException(404, "not_found", "Client not found");
                clientId = r.GetString(0); old = r.GetString(1);
            }
            var u1 = conn.CreateDmlCommand("UPDATE clients SET status=@s, updated_at=CURRENT_TIMESTAMP() WHERE client_id=@c");
            u1.Transaction = tx;
            u1.Parameters.Add("s", SpannerDbType.String, status);
            u1.Parameters.Add("c", SpannerDbType.String, clientId);
            await u1.ExecuteNonQueryAsync(ct);
            var u2 = conn.CreateDmlCommand("UPDATE wallet_accounts SET status=@s, updated_at=CURRENT_TIMESTAMP() WHERE client_id=@c AND account_type='CLIENT_WALLET'");
            u2.Transaction = tx;
            u2.Parameters.Add("s", SpannerDbType.String, status switch { "ACTIVE" => "ACTIVE", "SUSPENDED" => "FROZEN", _ => "CLOSED" }); // ck_wallet_status: ACTIVE | FROZEN | CLOSED
            u2.Parameters.Add("c", SpannerDbType.String, clientId);
            await u2.ExecuteNonQueryAsync(ct);
        });
        return (old, status);
    }

    /// <summary>Puts an unpublished outbox event back in the dispatcher queue (reconciliation action).</summary>
    public async Task<bool> RequeueOutboxAsync(string eventId, CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateDmlCommand(
            "UPDATE outbox_events SET pending_since=CURRENT_TIMESTAMP(), attempts=0, last_error=NULL WHERE event_id=@e AND published_at IS NULL");
        cmd.Parameters.Add("e", SpannerDbType.String, eventId);
        return await cmd.ExecuteNonQueryAsync(ct) == 1;
    }

    // ----------------------------------------------------------------- helpers
    private static async Task InsertOperationAsync(SpannerConnection conn, SpannerTransaction tx, string opId, string pubRef, string type,
        CurrentUser actor, long amount, string? original, string reason, string idemKey, CancellationToken ct)
    {
        var cmd = conn.CreateDmlCommand(
            "INSERT INTO ledger_operations (operation_id, public_reference, type, status, actor_id, actor_type, amount_minor, currency, " +
            "idempotency_key, original_operation_id, reason, created_at, confirmed_at, updated_at) VALUES " +
            "(@op, @ref, @type, 'COMPLETED', @actor, @actorType, @amount, 'COP', @idem, @orig, @reason, " +
            "CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())");
        cmd.Transaction = tx;
        cmd.Parameters.Add("op", SpannerDbType.String, opId);
        cmd.Parameters.Add("ref", SpannerDbType.String, pubRef);
        cmd.Parameters.Add("type", SpannerDbType.String, type);
        cmd.Parameters.Add("actor", SpannerDbType.String, actor.Uid.Length <= 36 ? actor.Uid : actor.Uid[..36]);
        cmd.Parameters.Add("actorType", SpannerDbType.String, "ADMIN"); // ck_op_actor_type: CLIENT | ADMIN | SYSTEM (staff acts as ADMIN)
        cmd.Parameters.Add("amount", SpannerDbType.Numeric, SpannerNumeric.Parse(amount.ToString()));
        cmd.Parameters.Add("idem", SpannerDbType.String, idemKey);
        cmd.Parameters.Add("orig", SpannerDbType.String, original ?? (object)DBNull.Value);
        cmd.Parameters.Add("reason", SpannerDbType.String, reason.Length > 500 ? reason[..500] : reason);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task InsertEntryAsync(SpannerConnection conn, SpannerTransaction tx, string opId, int no, string accId,
        long delta, long before, long after, CancellationToken ct)
    {
        var cmd = conn.CreateDmlCommand(
            "INSERT INTO ledger_entries (operation_id, entry_no, account_id, delta_minor, balance_before_minor, balance_after_minor, created_at) " +
            "VALUES (@op, @no, @acc, @d, @b, @a, CURRENT_TIMESTAMP())");
        cmd.Transaction = tx;
        cmd.Parameters.Add("op", SpannerDbType.String, opId);
        cmd.Parameters.Add("no", SpannerDbType.Int64, (long)no);
        cmd.Parameters.Add("acc", SpannerDbType.String, accId);
        cmd.Parameters.Add("d", SpannerDbType.Numeric, SpannerNumeric.Parse(delta.ToString()));
        cmd.Parameters.Add("b", SpannerDbType.Numeric, SpannerNumeric.Parse(before.ToString()));
        cmd.Parameters.Add("a", SpannerDbType.Numeric, SpannerNumeric.Parse(after.ToString()));
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task UpdateBalanceAsync(SpannerConnection conn, SpannerTransaction tx, string accId, long newBalance, long expectedVersion, CancellationToken ct)
    {
        var cmd = conn.CreateDmlCommand(
            "UPDATE wallet_accounts SET current_balance_minor=@n, version=version+1, updated_at=CURRENT_TIMESTAMP() WHERE account_id=@a AND version=@v");
        cmd.Transaction = tx;
        cmd.Parameters.Add("n", SpannerDbType.Numeric, SpannerNumeric.Parse(newBalance.ToString()));
        cmd.Parameters.Add("a", SpannerDbType.String, accId);
        cmd.Parameters.Add("v", SpannerDbType.Int64, expectedVersion);
        if (await cmd.ExecuteNonQueryAsync(ct) != 1)
            throw new BackofficeException(409, "concurrency_conflict", "Concurrent update on wallet account", $"Account {accId} changed; retry.");
    }

    private static async Task InsertOutboxAsync(SpannerConnection conn, SpannerTransaction tx, DomainEvent e, CancellationToken ct)
    {
        var cmd = conn.CreateDmlCommand(
            "INSERT INTO outbox_events (event_id, aggregate_id, aggregate_type, event_type, payload, created_at, pending_since, published_at, attempts, last_error) " +
            "VALUES (@id, @agg, 'LEDGER_OPERATION', @type, @payload, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), NULL, 0, NULL)");
        cmd.Transaction = tx;
        cmd.Parameters.Add("id", SpannerDbType.String, e.EventId);
        cmd.Parameters.Add("agg", SpannerDbType.String, e.OperationId);
        cmd.Parameters.Add("type", SpannerDbType.String, e.EventType);
        cmd.Parameters.Add("payload", SpannerDbType.Json, e.ToJson());
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
