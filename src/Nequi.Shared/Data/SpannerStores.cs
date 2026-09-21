using System.Text.Json;
using Google.Cloud.Spanner.Data;
using Nequi.Shared.Events;
using Nequi.Shared.Idempotency;

namespace Nequi.Shared.Data;

/// <summary>Spanner connection helper. Database = projects/{p}/instances/{i}/databases/{d} (comes from Secret Manager).</summary>
public sealed class SpannerDb(string database)
{
    public SpannerConnection Open() => new($"Data Source={database}");
}

/// <summary>idempotency_records (PK actor_id, scope, idempotency_key). Begin is one read-write transaction: no double effects.</summary>
public sealed class SpannerIdempotencyStore(SpannerDb db) : IIdempotencyStore
{
    public async Task<(BeginOutcome, IdempotencyRecord?)> BeginAsync(string actorId, string scope, string key, string requestHash, CancellationToken ct)
    {
        await using var conn = db.Open();
        return await conn.RunWithRetriableTransactionAsync(async tx =>
        {
            var select = conn.CreateSelectCommand(
                "SELECT request_hash, status, http_status, TO_JSON_STRING(response_body) FROM idempotency_records " +
                "WHERE actor_id=@a AND scope=@s AND idempotency_key=@k");
            select.Transaction = tx;
            select.Parameters.Add("a", SpannerDbType.String, actorId);
            select.Parameters.Add("s", SpannerDbType.String, scope);
            select.Parameters.Add("k", SpannerDbType.String, key);

            string? hash = null, status = null, body = null; long? http = null;
            await using (var r = await select.ExecuteReaderAsync(ct))
                if (await r.ReadAsync(ct))
                {
                    hash = r.GetString(0); status = r.GetString(1);
                    http = r.IsDBNull(2) ? null : r.GetInt64(2);
                    body = r.IsDBNull(3) ? null : r.GetString(3);
                }

            if (hash is null)
            {
                var ins = conn.CreateDmlCommand(
                    "INSERT INTO idempotency_records (actor_id, scope, idempotency_key, request_hash, status) VALUES (@a,@s,@k,@h,'IN_PROGRESS')");
                ins.Transaction = tx;
                ins.Parameters.Add("a", SpannerDbType.String, actorId);
                ins.Parameters.Add("s", SpannerDbType.String, scope);
                ins.Parameters.Add("k", SpannerDbType.String, key);
                ins.Parameters.Add("h", SpannerDbType.String, requestHash);
                await ins.ExecuteNonQueryAsync(ct);
                return (BeginOutcome.Started, (IdempotencyRecord?)null);
            }

            var rec = new IdempotencyRecord(actorId, scope, key, hash, (int?)http, body, "application/json");
            if (hash != requestHash) return (BeginOutcome.Conflict, rec);
            return status switch
            {
                "COMPLETED" => (BeginOutcome.Replay, rec),
                "FAILED" => await Restart(conn, tx, actorId, scope, key, ct),
                _ => (BeginOutcome.InProgress, rec),
            };
        });
    }

    private static async Task<(BeginOutcome, IdempotencyRecord?)> Restart(SpannerConnection conn, SpannerTransaction tx, string a, string s, string k, CancellationToken ct)
    {
        var upd = conn.CreateDmlCommand("UPDATE idempotency_records SET status='IN_PROGRESS' WHERE actor_id=@a AND scope=@s AND idempotency_key=@k");
        upd.Transaction = tx;
        upd.Parameters.Add("a", SpannerDbType.String, a);
        upd.Parameters.Add("s", SpannerDbType.String, s);
        upd.Parameters.Add("k", SpannerDbType.String, k);
        await upd.ExecuteNonQueryAsync(ct);
        return (BeginOutcome.Started, null);
    }

    public async Task CompleteAsync(string actorId, string scope, string key, int statusCode, string? body, string? contentType, CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateDmlCommand(
            "UPDATE idempotency_records SET status='COMPLETED', http_status=@h, response_body=@b, completed_at=CURRENT_TIMESTAMP() " +
            "WHERE actor_id=@a AND scope=@s AND idempotency_key=@k");
        cmd.Parameters.Add("h", SpannerDbType.Int64, (long)statusCode);
        cmd.Parameters.Add("b", SpannerDbType.Json, body);
        cmd.Parameters.Add("a", SpannerDbType.String, actorId);
        cmd.Parameters.Add("s", SpannerDbType.String, scope);
        cmd.Parameters.Add("k", SpannerDbType.String, key);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task AbandonAsync(string actorId, string scope, string key, CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateDmlCommand("DELETE FROM idempotency_records WHERE actor_id=@a AND scope=@s AND idempotency_key=@k AND status='IN_PROGRESS'");
        cmd.Parameters.Add("a", SpannerDbType.String, actorId);
        cmd.Parameters.Add("s", SpannerDbType.String, scope);
        cmd.Parameters.Add("k", SpannerDbType.String, key);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}

/// <summary>
/// outbox_events: pending = pending_since IS NOT NULL. Payload JSON must carry clientId, amountCents, currency
/// (optional: operationId, occurredAt, counterpartyClientId, description, balanceAfterCents).
/// After MaxAttempts the row leaves the pending index (pending_since = NULL) and keeps last_error for investigation.
/// </summary>
public sealed class SpannerOutboxStore(SpannerDb db) : IOutboxStore
{
    private const int MaxAttempts = 10;

    public async Task<IReadOnlyList<DomainEvent>> FetchPendingAsync(int max, CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateSelectCommand(
            "SELECT event_id, event_type, aggregate_id, TO_JSON_STRING(payload), created_at FROM outbox_events " +
            "WHERE pending_since IS NOT NULL ORDER BY pending_since LIMIT @max");
        cmd.Parameters.Add("max", SpannerDbType.Int64, (long)max);

        var rows = new List<(string Id, string Type, string Aggregate, string Payload, DateTime Created)>();
        await using (var r = await cmd.ExecuteReaderAsync(ct))
            while (await r.ReadAsync(ct))
                rows.Add((r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.GetFieldValue<DateTime>(4)));

        var events = new List<DomainEvent>();
        foreach (var row in rows)
        {
            if (TryMap(row.Id, row.Type, row.Aggregate, row.Payload, row.Created, out var evt, out var error)) events.Add(evt!);
            else await MarkFailedAsync(row.Id, "invalid payload: " + error, ct); // poison rows must not block the queue
        }
        return events;
    }

    public static bool TryMap(string id, string type, string aggregate, string payloadJson, DateTime created, out DomainEvent? evt, out string error)
    {
        evt = null; error = "";
        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            var p = doc.RootElement;
            string? Str(string n) => p.TryGetProperty(n, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
            long? Long(string n) => p.TryGetProperty(n, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetInt64() : null;

            var occurred = DateTimeOffset.TryParse(Str("occurredAt"), out var o) ? o : new DateTimeOffset(DateTime.SpecifyKind(created, DateTimeKind.Utc));
            evt = new DomainEvent(id, type, Str("operationId") ?? aggregate, Str("clientId") ?? "", occurred,
                Long("amountCents") ?? 0, Str("currency") ?? "COP", Str("counterpartyClientId"), Str("description"), Long("balanceAfterCents"));
            if (evt.IsValid(out error)) return true;
            evt = null;
            return false;
        }
        catch (Exception e) when (e is JsonException or InvalidOperationException or FormatException or OverflowException)
        {
            error = "unreadable payload";
            return false;
        }
    }

    public async Task MarkPublishedAsync(string eventId, CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateDmlCommand("UPDATE outbox_events SET published_at=CURRENT_TIMESTAMP(), pending_since=NULL, last_error=NULL WHERE event_id=@id");
        cmd.Parameters.Add("id", SpannerDbType.String, eventId);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task MarkFailedAsync(string eventId, string reason, CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateDmlCommand(
            "UPDATE outbox_events SET attempts=attempts+1, last_error=@e, " +
            "pending_since=IF(attempts+1 >= @max, NULL, pending_since) WHERE event_id=@id");
        cmd.Parameters.Add("id", SpannerDbType.String, eventId);
        cmd.Parameters.Add("e", SpannerDbType.String, reason.Length > 1000 ? reason[..1000] : reason);
        cmd.Parameters.Add("max", SpannerDbType.Int64, (long)MaxAttempts);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task<OutboxStats> StatsAsync(CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateSelectCommand(
            "SELECT COUNTIF(pending_since IS NOT NULL), COUNTIF(published_at IS NOT NULL), " +
            "COUNTIF(pending_since IS NULL AND published_at IS NULL) FROM outbox_events");
        await using var r = await cmd.ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);
        return new OutboxStats((int)r.GetInt64(0), (int)r.GetInt64(1), (int)r.GetInt64(2));
    }

    public async Task PingAsync(CancellationToken ct)
    {
        await using var conn = db.Open();
        await using var r = await conn.CreateSelectCommand("SELECT 1").ExecuteReaderAsync(ct);
        await r.ReadAsync(ct);
    }
}
