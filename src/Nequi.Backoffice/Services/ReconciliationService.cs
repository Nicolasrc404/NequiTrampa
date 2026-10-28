using Google.Cloud.Spanner.Data;
using Google.Cloud.Spanner.V1;
using Nequi.Shared.Data;

namespace Nequi.Backoffice.Services;

public sealed record ReconciliationIssue(string Id, string Kind, string Severity, string Description, string Reference, DateTimeOffset DetectedAt, string Status,
    IDictionary<string, object?> Data);

/// <summary>
/// Reconciliation over the authoritative stores (inconsistencies are detected on demand):
///  BALANCE_MISMATCH   wallet balance differs from the last ledger entry's balance_after. Persisted in Spanner <c>reconciliation_issues</c>
///                     (status OPEN / INVESTIGATING / RESOLVED / FALSE_POSITIVE) so the investigation survives restarts.
///  OUTBOX_STUCK       domain event not published after 5 minutes or with retries exhausted.
///  PROJECTION_MISSING event published >2 minutes ago that has no Firestore movement.
/// OUTBOX_STUCK / PROJECTION_MISSING are derived views; their resolutions are kept in Firestore (<c>reconciliation_resolutions</c>).
/// </summary>
public sealed class ReconciliationService(SpannerDb db, IDocumentStore docs)
{
    public const string ResolutionsCollection = "reconciliation_resolutions";
    public const string BalanceKind = "BALANCE_MISMATCH";

    public async Task<IReadOnlyList<ReconciliationIssue>> DetectAsync(CancellationToken ct)
    {
        var issues = new List<ReconciliationIssue>();
        var now = DateTimeOffset.UtcNow;
        await SyncBalanceIssuesAsync(ct);

        await using var conn = db.Open();
        var rows = conn.CreateSelectCommand(
            "SELECT issue_id, account_id, client_id, materialized_balance_minor, reconstructed_balance_minor, severity, status, notes, detected_at, resolved_by, resolved_at " +
            "FROM reconciliation_issues ORDER BY detected_at DESC LIMIT 200");
        await using (var r = await rows.ExecuteReaderAsync(ct))
            while (await r.ReadAsync(ct))
            {
                var status = r.GetString(6);
                issues.Add(new ReconciliationIssue(r.GetString(0), BalanceKind, r.GetString(5), "Wallet balance differs from the last ledger entry.",
                    r.GetString(1), LedgerReader.Ts(r.GetFieldValue<DateTime>(8)), status is "RESOLVED" or "FALSE_POSITIVE" ? "RESOLVED" : "OPEN",
                    new Dictionary<string, object?>
                    {
                        ["tableStatus"] = status, ["accountId"] = r.GetString(1), ["clientId"] = r.GetString(2),
                        ["walletBalanceCents"] = LedgerReader.Minor(r.GetFieldValue<SpannerNumeric>(3)),
                        ["ledgerBalanceCents"] = LedgerReader.Minor(r.GetFieldValue<SpannerNumeric>(4)),
                        ["notes"] = r.IsDBNull(7) ? null : r.GetString(7), ["resolvedBy"] = r.IsDBNull(9) ? null : r.GetString(9),
                    }));
            }

        var derived = new List<ReconciliationIssue>();
        var obx = conn.CreateSelectCommand(
            "SELECT event_id, aggregate_id, event_type, created_at, attempts, last_error, pending_since FROM outbox_events " +
            "WHERE published_at IS NULL AND (pending_since IS NULL OR created_at < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 MINUTE)) LIMIT 100");
        await using (var r = await obx.ExecuteReaderAsync(ct))
            while (await r.ReadAsync(ct))
                derived.Add(new ReconciliationIssue($"RECON-OBX-{r.GetString(0)}", "OUTBOX_STUCK", r.IsDBNull(6) ? "HIGH" : "MEDIUM",
                    r.IsDBNull(6) ? "Event exhausted its publish retries." : "Event pending for more than 5 minutes.", r.GetString(1),
                    LedgerReader.Ts(r.GetFieldValue<DateTime>(3)), "OPEN",
                    new Dictionary<string, object?> { ["eventId"] = r.GetString(0), ["eventType"] = r.GetString(2), ["attempts"] = r.GetInt64(4), ["lastError"] = r.IsDBNull(5) ? null : r.GetString(5) }));

        var pub = conn.CreateSelectCommand(
            "SELECT event_id, aggregate_id, event_type, published_at FROM outbox_events " +
            "WHERE published_at IS NOT NULL AND published_at < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 MINUTE) ORDER BY published_at DESC LIMIT 50");
        var recent = new List<(string Event, string Op, string Type, DateTimeOffset At)>();
        await using (var r = await pub.ExecuteReaderAsync(ct))
            while (await r.ReadAsync(ct))
                recent.Add((r.GetString(0), r.GetString(1), r.GetString(2), LedgerReader.Ts(r.GetFieldValue<DateTime>(3))));
        foreach (var e in recent)
            if (await docs.GetAsync("financial_movements", e.Event, ct) is null)
                derived.Add(new ReconciliationIssue($"RECON-PRJ-{e.Event}", "PROJECTION_MISSING", "MEDIUM",
                    "Published event has no Firestore movement.", e.Op, e.At, "OPEN",
                    new Dictionary<string, object?> { ["eventId"] = e.Event, ["eventType"] = e.Type }));

        foreach (var i in derived)
            issues.Add(await docs.GetAsync(ResolutionsCollection, i.Id, ct) is { } res
                ? i with { Status = "RESOLVED", Data = new Dictionary<string, object?>(i.Data) { ["resolution"] = res } }
                : i);
        return issues;
    }

    /// <summary>Opens a reconciliation_issues row for every account whose balance disagrees with its ledger, unless one is already open.</summary>
    private async Task SyncBalanceIssuesAsync(CancellationToken ct)
    {
        await using var conn = db.Open();
        await conn.RunWithRetriableTransactionAsync(async tx =>
        {
            var q = conn.CreateSelectCommand(
                "SELECT a.account_id, a.client_id, a.current_balance_minor, " +
                "(SELECT e.balance_after_minor FROM ledger_entries e WHERE e.account_id=a.account_id ORDER BY e.created_at DESC, e.entry_no DESC LIMIT 1) " +
                "FROM wallet_accounts a WHERE a.client_id IS NOT NULL AND EXISTS (SELECT 1 FROM ledger_entries e WHERE e.account_id=a.account_id) " +
                "AND NOT EXISTS (SELECT 1 FROM reconciliation_issues i WHERE i.account_id=a.account_id AND i.status IN ('OPEN','INVESTIGATING'))");
            q.Transaction = tx;
            var found = new List<(string Acc, string Client, long Wallet, long Ledger)>();
            await using (var r = await q.ExecuteReaderAsync(ct))
                while (await r.ReadAsync(ct))
                {
                    var wallet = LedgerReader.Minor(r.GetFieldValue<SpannerNumeric>(2));
                    var ledger = LedgerReader.Minor(r.GetFieldValue<SpannerNumeric>(3));
                    if (wallet != ledger) found.Add((r.GetString(0), r.GetString(1), wallet, ledger));
                }
            foreach (var (acc, client, wallet, ledger) in found)
            {
                var ins = conn.CreateDmlCommand(
                    "INSERT INTO reconciliation_issues (issue_id, account_id, client_id, materialized_balance_minor, reconstructed_balance_minor, severity, status, detected_at) " +
                    "VALUES (@id, @acc, @client, @m, @r, 'HIGH', 'OPEN', CURRENT_TIMESTAMP())");
                ins.Transaction = tx;
                ins.Parameters.Add("id", SpannerDbType.String, Guid.NewGuid().ToString());
                ins.Parameters.Add("acc", SpannerDbType.String, acc);
                ins.Parameters.Add("client", SpannerDbType.String, client);
                ins.Parameters.Add("m", SpannerDbType.Numeric, SpannerNumeric.Parse(wallet.ToString()));
                ins.Parameters.Add("r", SpannerDbType.Numeric, SpannerNumeric.Parse(ledger.ToString()));
                await ins.ExecuteNonQueryAsync(ct);
            }
        });
    }

    /// <summary>Closes a persisted BALANCE_MISMATCH row. Returns false if it does not exist.</summary>
    public async Task<bool> ResolveBalanceIssueAsync(string issueId, string tableStatus, string notes, string resolvedBy, CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateDmlCommand(
            "UPDATE reconciliation_issues SET status=@s, notes=@n, resolved_by=@by, resolved_at=CURRENT_TIMESTAMP() WHERE issue_id=@id");
        cmd.Parameters.Add("s", SpannerDbType.String, tableStatus);
        cmd.Parameters.Add("n", SpannerDbType.String, notes.Length > 2000 ? notes[..2000] : notes);
        cmd.Parameters.Add("by", SpannerDbType.String, resolvedBy.Length > 36 ? resolvedBy[..36] : resolvedBy);
        cmd.Parameters.Add("id", SpannerDbType.String, issueId);
        return await cmd.ExecuteNonQueryAsync(ct) == 1;
    }

    public async Task<ReconciliationIssue?> FindAsync(string id, CancellationToken ct)
    {
        var issues = await DetectAsync(ct);
        var found = issues.FirstOrDefault(i => i.Id == id);
        if (found is not null) return found;
        // Derived issue already resolved that no longer reproduces: return its stored resolution.
        var res = await docs.GetAsync(ResolutionsCollection, id, ct);
        return res is null ? null : new ReconciliationIssue(id, res["kind"]?.ToString() ?? "UNKNOWN", "LOW", "Resolved issue", res["reference"]?.ToString() ?? "",
            DateTimeOffset.Parse(res["resolvedAt"]!.ToString()!), "RESOLVED", new Dictionary<string, object?> { ["resolution"] = res });
    }
}
