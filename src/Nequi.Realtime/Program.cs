using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Nequi.Shared;
using Nequi.Shared.Events;
using Nequi.Shared.Http;
using Nequi.Shared.Security;

var builder = WebApplication.CreateBuilder(args);
builder.AddNequiCommon();
builder.Services.AddSingleton<ConnectionRegistry>();

var app = builder.Build();
app.UseNequiCommon();
app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(30) });

// WebSocket for the mobile app. Authenticated (JWT via Authorization header); a client only receives its own events.
// UI refresh channel only: never the source of truth for balances.
app.Map("/ws", async (HttpContext ctx, ConnectionRegistry registry, ILogger<ConnectionRegistry> log) =>
{
    if (!ctx.WebSockets.IsWebSocketRequest)
        return Problems.Problem(ctx, 400, "WebSocket upgrade required", code: "websocket_required");

    var user = CurrentUser.From(ctx.User)!;
    using var socket = await ctx.WebSockets.AcceptWebSocketAsync();
    var id = registry.Add(user.Uid, socket);
    log.LogInformation("WebSocket connected ({Connections} for client)", registry.Count(user.Uid));
    try
    {
        var buffer = new byte[1024];
        while (socket.State == WebSocketState.Open)
        {
            var r = await socket.ReceiveAsync(buffer, ctx.RequestAborted);
            if (r.MessageType == WebSocketMessageType.Close) break; // client messages are ignored (server push only)
        }
        if (socket.State is WebSocketState.CloseReceived)
            await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, null, CancellationToken.None);
    }
    catch (Exception e) when (e is WebSocketException or OperationCanceledException) { }
    finally { registry.Remove(user.Uid, id); }
    return Results.Empty;
});

// Pub/Sub push target (Cloud Run IAM protects it; push SA is the only invoker).
app.MapPost("/internal/pubsub/realtime", async (HttpContext ctx, JsonElement body, ConnectionRegistry registry) =>
{
    if (!PushEnvelope.TryReadEvent(body, out var evt, out _)) return Results.Accepted();
    await registry.BroadcastAsync(evt!, ctx.RequestAborted);
    return Results.NoContent();
}).AllowAnonymous();

app.MapGet("/v1/realtime/stats", (ConnectionRegistry r) => Results.Ok(new { clients = r.Clients, connections = r.Total }))
    .RequireAuthorization(Policies.InternalStaff);

app.Run();

public sealed class ConnectionRegistry(ILogger<ConnectionRegistry> logger)
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, WebSocket>> _sockets = new();

    public int Clients => _sockets.Count(kv => !kv.Value.IsEmpty);
    public int Total => _sockets.Values.Sum(v => v.Count);
    public int Count(string clientId) => _sockets.TryGetValue(clientId, out var s) ? s.Count : 0;

    public Guid Add(string clientId, WebSocket socket)
    {
        var id = Guid.NewGuid();
        _sockets.GetOrAdd(clientId, _ => new())[id] = socket;
        return id;
    }

    public void Remove(string clientId, Guid id)
    {
        if (_sockets.TryGetValue(clientId, out var s)) s.TryRemove(id, out _);
    }

    public async Task<int> BroadcastAsync(DomainEvent e, CancellationToken ct)
    {
        if (!_sockets.TryGetValue(e.ClientId, out var targets)) return 0;
        var payload = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new
        {
            type = "movement",
            eventId = e.EventId,
            eventType = e.EventType,
            operationId = e.OperationId,
            amountCents = e.AmountCents,
            balanceAfterCents = e.BalanceAfterCents,
            occurredAt = e.OccurredAt,
        }, JsonSerializerOptions.Web));

        var sent = 0;
        foreach (var (id, socket) in targets)
        {
            if (socket.State != WebSocketState.Open) { targets.TryRemove(id, out _); continue; }
            try
            {
                await socket.SendAsync(payload, WebSocketMessageType.Text, true, ct);
                sent++;
            }
            catch (WebSocketException) { targets.TryRemove(id, out _); }
        }
        logger.LogInformation("Realtime delivered event {EventId} to {Sent} connection(s)", e.EventId, sent);
        return sent;
    }
}

namespace Nequi.Realtime { public sealed class RealtimeMarker; }
