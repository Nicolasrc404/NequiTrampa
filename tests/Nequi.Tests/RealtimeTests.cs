
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace Nequi.Tests;

public class RealtimeTests : IDisposable
{
    private readonly Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Nequi.Realtime.RealtimeMarker> _f = Env.Realtime();
    public void Dispose() => _f.Dispose();

    [Fact]
    public async Task Websocket_requires_auth()
    {
        var res = await _f.CreateClient().GetAsync("/ws");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Two_sessions_receive_the_event_and_other_clients_do_not()
    {
        var wsClient = _f.Server.CreateWebSocketClient();
        async Task<WebSocket> Connect(string uid)
        {
            wsClient.ConfigureRequest = r => { r.Headers["X-Demo-User"] = uid; r.Headers["X-Demo-Role"] = "CLIENTE"; };
            return await wsClient.ConnectAsync(new Uri(_f.Server.BaseAddress, "/ws"), CancellationToken.None);
        }
        using var a1 = await Connect("alice");
        using var a2 = await Connect("alice");
        using var b = await Connect("bob");

        var post = await _f.CreateClient().PostAsync("/internal/pubsub/realtime", Env.PushBody(Env.Event("evt-rt1", "alice")));
        Assert.Equal(HttpStatusCode.NoContent, post.StatusCode);

        foreach (var s in new[] { a1, a2 })
        {
            var buf = new byte[2048];
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            var r = await s.ReceiveAsync(buf, cts.Token);
            var msg = JsonDocument.Parse(Encoding.UTF8.GetString(buf, 0, r.Count)).RootElement;
            Assert.Equal("evt-rt1", msg.GetProperty("eventId").GetString());
            Assert.Equal(5_000_000, msg.GetProperty("amountCents").GetInt64());
        }

        using var shortCts = new CancellationTokenSource(TimeSpan.FromMilliseconds(400));
        await Assert.ThrowsAnyAsync<OperationCanceledException>(async () => await b.ReceiveAsync(new byte[16], shortCts.Token));
    }
}
