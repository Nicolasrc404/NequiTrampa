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
        var document = new Dictionary<string, object?>
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
        };

        // Old outbox payloads (and events emitted before categorization existed) have no
        // categoryId. Only write the field when present so legacy projections keep their shape
        // and are treated as "Sin categoría" by budgets and analytics.
        if (!string.IsNullOrWhiteSpace(e.CategoryId)) document["categoryId"] = e.CategoryId;

        var created = await docs.CreateIfAbsentAsync(Collections.Movements, e.EventId, document, ct);
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

        app.MapGet("/v1/projections/movements", async (HttpContext ctx, string? clientId, int? limit, IDocumentStore docs, ClientIdentityResolver identities) =>
        {
            var user = CurrentUser.From(ctx.User)!;
            var ownClientId = await identities.ResolveAsync(user, ctx.RequestAborted);

            string? owner;
            if (user.IsStaff)
            {
                // Staff must be explicit: never scan the whole collection by default.
                if (string.IsNullOrWhiteSpace(clientId))
                    return Problems.Problem(ctx, 400, "Bad Request",
                        "Staff must provide ?clientId= to query projections.", "clientid_required");
                owner = clientId;
            }
            else
            {
                // A client can only read their own resolved client_id; ?clientId= may repeat it
                // but can never select another client.
                if (ownClientId is null)
                    return Problems.Problem(ctx, 403, "Forbidden",
                        "No linked client context for this identity.", "client_context_unresolved");
                if (!string.IsNullOrWhiteSpace(clientId) && clientId != ownClientId)
                    return Problems.Problem(ctx, 403, "Forbidden",
                        "You can only read your own movements.", "forbidden");
                owner = ownClientId;
            }

            var rows = await docs.QueryEqualsAsync(Collections.Movements, "clientId", owner, Math.Clamp(limit ?? 50, 1, 200), ctx.RequestAborted);
            var items = rows.OrderByDescending(r => r["occurredAt"]?.ToString()).ToList();
            return Results.Ok(new { clientId = owner, count = items.Count, items });
        });
    }
}
