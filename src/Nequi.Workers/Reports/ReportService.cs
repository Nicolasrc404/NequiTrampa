using System.Text;
using System.Threading.Channels;
using Nequi.Shared.Data;
using Nequi.Shared.Http;
using Nequi.Shared.Idempotency;
using Nequi.Shared.Security;
using Nequi.Workers.Projection;

namespace Nequi.Workers.Reports;

public sealed record CreateReportRequest(string? ClientId, DateOnly? From, DateOnly? To);

/// <summary>Async statement generation so heavy reads never block transactional APIs. Reads the Firestore projection only.</summary>
public sealed class ReportQueue
{
    private readonly Channel<string> _channel = Channel.CreateUnbounded<string>();
    public void Enqueue(string reportId) => _channel.Writer.TryWrite(reportId);
    public IAsyncEnumerable<string> ReadAllAsync(CancellationToken ct) => _channel.Reader.ReadAllAsync(ct);
}

public sealed class ReportGenerator(IDocumentStore docs, ILogger<ReportGenerator> logger)
{
    public async Task GenerateAsync(string reportId, CancellationToken ct)
    {
        var report = await docs.GetAsync(Collections.Reports, reportId, ct);
        if (report is null) return;
        try
        {
            var clientId = report["clientId"]!.ToString()!;
            var from = report["from"]?.ToString();
            var to = report["to"]?.ToString();
            var rows = (await docs.QueryEqualsAsync(Collections.Movements, "clientId", clientId, 5000, ct))
                .Where(r => InRange(r["occurredAt"]?.ToString(), from, to))
                .OrderBy(r => r["occurredAt"]?.ToString()).ToList();

            var csv = new StringBuilder("occurredAt,operationId,type,amountCents,currency,description\n");
            foreach (var r in rows)
                csv.Append(string.Join(',', Cell(r["occurredAt"]), Cell(r["operationId"]), Cell(r["type"]),
                    Cell(r["amountCents"]), Cell(r["currency"]), Cell((r.TryGetValue("description", out var dsc) ? dsc : null)))).Append('\n');

            report["status"] = "COMPLETED";
            report["rowCount"] = (long)rows.Count;
            report["csv"] = csv.ToString();
            report["completedAt"] = DateTimeOffset.UtcNow.UtcDateTime.ToString("O");
            logger.LogInformation("Report {ReportId} completed with {Rows} rows", reportId, rows.Count);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            logger.LogError(e, "Report {ReportId} failed", reportId);
            report["status"] = "FAILED";
        }
        await docs.UpsertAsync(Collections.Reports, reportId, report, ct);
    }

    private static bool InRange(string? at, string? from, string? to) =>
        at is not null && (from is null || string.CompareOrdinal(at, from) >= 0) && (to is null || string.CompareOrdinal(at, to + "T99") <= 0);

    /// <summary>CSV cell with formula-injection guard (=,+,-,@) and quoting.</summary>
    internal static string Cell(object? v)
    {
        var s = v?.ToString() ?? "";
        if (s.Length > 0 && "=+-@".Contains(s[0]) && !(v is long or int)) s = "'" + s;
        return s.Contains(',') || s.Contains('"') || s.Contains('\n') ? $"\"{s.Replace("\"", "\"\"")}\"" : s;
    }
}

public sealed class ReportWorker(ReportQueue queue, ReportGenerator generator, ILogger<ReportWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var id in queue.ReadAllAsync(stoppingToken))
        {
            try { await generator.GenerateAsync(id, stoppingToken); }
            catch (Exception e) when (e is not OperationCanceledException) { logger.LogError(e, "Report worker error"); }
        }
    }
}

public static class ReportEndpoints
{
    private static object Public(IDictionary<string, object?> r) => new
    {
        id = r["id"], clientId = r["clientId"], status = r["status"], from = r["from"], to = r["to"],
        createdAt = r["createdAt"], rowCount = (r.TryGetValue("rowCount", out var rc) ? rc : null),
    };

    public static void MapReports(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/v1/reports").RequireAuthorization(Policies.CanGenerateReports);

        g.MapPost("/", async (HttpContext ctx, CreateReportRequest req, IDocumentStore docs, ReportQueue queue) =>
        {
            var user = CurrentUser.From(ctx.User)!;
            var target = req.ClientId ?? user.Uid;
            if (!ResourceAccess.CanRead(user, target))
                return Problems.Problem(ctx, 403, "Forbidden", "Clients can only request their own reports.", "forbidden");
            if (req.From is { } f && req.To is { } t && f > t)
                return Problems.Problem(ctx, 422, "Invalid range", "'from' must be on or before 'to'.", "invalid_range");

            var id = Guid.NewGuid().ToString("N");
            var doc = new Dictionary<string, object?>
            {
                ["id"] = id, ["clientId"] = target, ["requestedBy"] = user.Uid, ["status"] = "PENDING",
                ["from"] = req.From?.ToString("yyyy-MM-dd"), ["to"] = req.To?.ToString("yyyy-MM-dd"),
                ["createdAt"] = DateTimeOffset.UtcNow.UtcDateTime.ToString("O"),
            };
            await docs.UpsertAsync(Collections.Reports, id, doc, ctx.RequestAborted);
            queue.Enqueue(id);
            return Results.Accepted($"/v1/reports/{id}", Public(doc));
        }).RequireIdempotency();

        g.MapGet("/", async (HttpContext ctx, IDocumentStore docs) =>
        {
            var user = CurrentUser.From(ctx.User)!;
            var rows = await docs.QueryEqualsAsync(Collections.Reports, "requestedBy", user.Uid, 50, ctx.RequestAborted);
            return Results.Ok(new { count = rows.Count, items = rows.OrderByDescending(r => r["createdAt"]?.ToString()).Select(Public) });
        });

        g.MapGet("/{id}", async (HttpContext ctx, string id, IDocumentStore docs) =>
        {
            var r = await Load(ctx, id, docs);
            return r is null ? Problems.Problem(ctx, 404, "Report not found", code: "not_found") : Results.Ok(Public(r));
        });

        g.MapGet("/{id}/download", async (HttpContext ctx, string id, IDocumentStore docs) =>
        {
            var r = await Load(ctx, id, docs);
            if (r is null) return Problems.Problem(ctx, 404, "Report not found", code: "not_found");
            if (r["status"]?.ToString() != "COMPLETED")
                return Problems.Problem(ctx, 409, "Report not ready", $"Status is {r["status"]}.", "report_not_ready");
            return Results.File(Encoding.UTF8.GetBytes(r["csv"]?.ToString() ?? ""), "text/csv", $"report-{id}.csv");
        });
    }

    private static async Task<IDictionary<string, object?>?> Load(HttpContext ctx, string id, IDocumentStore docs)
    {
        var user = CurrentUser.From(ctx.User)!;
        var r = await docs.GetAsync(Collections.Reports, id, ctx.RequestAborted);
        return r is not null && ResourceAccess.CanRead(user, r["clientId"]!.ToString()!) ? r : null;
    }
}
