using System.Globalization;
using System.Text.Json;
using Nequi.Shared.Data;
using Nequi.Shared.Events;
using Nequi.Shared.Http;
using Nequi.Shared.Security;
using Nequi.Workers.Projection;

namespace Nequi.Workers.Notifications;

/// <summary>Push delivery seam. FCM needs device tokens registered by the mobile app; until then delivery is logged only.</summary>
public interface IPushSender
{
    Task SendAsync(string clientId, string title, string body, CancellationToken ct);
}

public sealed class LogPushSender(ILogger<LogPushSender> logger) : IPushSender
{
    public Task SendAsync(string clientId, string title, string body, CancellationToken ct)
    {
        logger.LogInformation("Push (log-only) queued for client {ClientId}", clientId); // no PII/amounts in logs
        return Task.CompletedTask;
    }
}

public sealed class NotificationService(IDocumentStore docs, IPushSender push)
{
    public static (string Title, string Body) Render(DomainEvent e)
    {
        var amount = (Math.Abs(e.AmountCents) / 100m).ToString("N2", CultureInfo.GetCultureInfo("es-CO"));
        return e.EventType switch
        {
            EventTypes.RechargeCompleted => ("Recarga exitosa", $"Tu recarga de ${amount} COP fue acreditada."),
            EventTypes.TransferCompleted when e.AmountCents < 0 => ("Transferencia enviada", $"Enviaste ${amount} COP."),
            EventTypes.TransferCompleted => ("Transferencia recibida", $"Recibiste ${amount} COP."),
            EventTypes.ReversalCompleted => ("Reverso aplicado", $"Se aplicó un reverso por ${amount} COP."),
            EventTypes.AdminAdjustment => ("Ajuste administrativo", $"Se aplicó un ajuste por ${amount} COP."),
            _ => ("Nuevo movimiento", $"Movimiento por ${amount} COP."),
        };
    }

    public async Task<bool> HandleAsync(DomainEvent e, CancellationToken ct)
    {
        var (title, body) = Render(e);
        var created = await docs.CreateIfAbsentAsync(Collections.Notifications, e.EventId, new Dictionary<string, object?>
        {
            ["id"] = e.EventId,
            ["clientId"] = e.ClientId,
            ["title"] = title,
            ["body"] = body,
            ["eventType"] = e.EventType,
            ["read"] = false,
            ["createdAt"] = DateTimeOffset.UtcNow.UtcDateTime.ToString("O"),
        }, ct);
        if (created) await push.SendAsync(e.ClientId, title, body, ct);
        return created;
    }
}

public static class NotificationEndpoints
{
    public static void MapNotifications(this IEndpointRouteBuilder app)
    {
        app.MapPost("/internal/pubsub/notifications", async (HttpContext ctx, JsonElement body, NotificationService svc) =>
        {
            if (!PushEnvelope.TryReadEvent(body, out var evt, out _)) return Results.Accepted();
            await svc.HandleAsync(evt!, ctx.RequestAborted);
            return Results.NoContent();
        }).AllowAnonymous();

        app.MapGet("/v1/notifications", async (HttpContext ctx, IDocumentStore docs) =>
        {
            var user = CurrentUser.From(ctx.User)!;
            var rows = await docs.QueryEqualsAsync(Collections.Notifications, "clientId", user.Uid, 100, ctx.RequestAborted);
            var items = rows.OrderByDescending(r => r["createdAt"]?.ToString()).ToList();
            return Results.Ok(new { count = items.Count, unread = items.Count(r => r["read"] is false), items });
        });

        app.MapPatch("/v1/notifications/{id}/read", async (HttpContext ctx, string id, IDocumentStore docs) =>
        {
            var user = CurrentUser.From(ctx.User)!;
            var doc = await docs.GetAsync(Collections.Notifications, id, ctx.RequestAborted);
            // 404 for both "missing" and "not yours": do not reveal other users' resources.
            if (doc is null || doc["clientId"]?.ToString() != user.Uid)
                return Problems.Problem(ctx, 404, "Notification not found", code: "not_found");
            doc["read"] = true;
            await docs.UpsertAsync(Collections.Notifications, id, doc, ctx.RequestAborted);
            return Results.NoContent();
        });
    }
}
