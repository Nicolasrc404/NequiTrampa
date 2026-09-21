using System.Text.Json;
using Nequi.Shared.Data;
using Nequi.Shared.Events;
using Nequi.Shared.Http;
using Nequi.Shared.Security;

namespace Nequi.Workers.Projection;

public static class Collections
{
    public const string Movements = "financial_movements";
    public const string Notifications = "notifications";
    public const string Reports = "reports";
}

/// <summary>Turns confirmed Spanner events into Firestore read models. Idempotent: document id = eventId.</summary>
public sealed class ProjectionService(IDocumentStore docs, ILogger<ProjectionService> logger)
{
    public async Task<bool> ApplyAsync(DomainEvent e, CancellationToken ct)
    {
        var created = await docs.CreateIfAbsentAsync(Collections.Movements, e.EventId, new Dictionary<string, object?>
        {
            ["eventId"] = e.EventId,
            ["operationId"] = e.OperationId,
            ["clientId"] = e.ClientId,
            ["type"] = e.EventType,
            ["amountCents"] = e.AmountCents,           // int64 cents, signed delta for the client
            ["currency"] = e.Currency,
            ["counterpartyClientId"] = e.CounterpartyClientId,
            ["description"] = e.Description,
            ["balanceAfterCents"] = e.BalanceAfterCents,
            ["occurredAt"] = e.OccurredAt.UtcDateTime.ToString("O"),
            ["syncStatus"] = "SYNCED",
            ["status"] = "COMPLETED",
        }, ct);
        if (!created) logger.LogInformation("Projection skipped duplicate event {EventId}", e.EventId);
        return created;
    }
}

public static class ProjectionEndpoints
{
    public static void MapProjection(this IEndpointRouteBuilder app)
    {
        // Pub/Sub push target. Protected by Cloud Run IAM (invoker = push service account), not by end-user JWT.
        app.MapPost("/internal/pubsub/projection", async (HttpContext ctx, JsonElement body, ProjectionService svc, ILogger<ProjectionService> log) =>
        {
            if (!PushEnvelope.TryReadEvent(body, out var evt, out var err))
            {
                log.LogWarning("Projection rejected malformed message: {Error}", err);
                return Results.Accepted(); // ack: a poison message must not loop forever (DLQ handles real failures)
            }
            await svc.ApplyAsync(evt!, ctx.RequestAborted);
            return Results.NoContent();
        }).AllowAnonymous();

        app.MapGet("/v1/projections/movements", async (HttpContext ctx, string? clientId, int? limit, IDocumentStore docs) =>
        {
            var user = CurrentUser.From(ctx.User)!;
            var owner = clientId ?? user.Uid;
            if (!ResourceAccess.CanRead(user, owner))
                return Problems.Problem(ctx, 403, "Forbidden", "You can only read your own movements.", "forbidden");
            var rows = await docs.QueryEqualsAsync(Collections.Movements, "clientId", owner, Math.Clamp(limit ?? 50, 1, 200), ctx.RequestAborted);
            var items = rows.OrderByDescending(r => r["occurredAt"]?.ToString()).ToList();
            return Results.Ok(new { clientId = owner, count = items.Count, items });
        });
    }
}
