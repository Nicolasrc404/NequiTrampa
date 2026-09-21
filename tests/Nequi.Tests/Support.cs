
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nequi.Shared.Events;

namespace Nequi.Tests;

public static class Env
{
    public static readonly Dictionary<string, string?> Config = new()
    {
        ["Gcp:ProjectId"] = "test-project",
        ["Data:Backend"] = "memory",
        ["Auth:DemoHeaders"] = "true",
        ["Outbox:Enabled"] = "false",
    };

    public static WebApplicationFactory<Nequi.Workers.WorkersMarker> Workers() =>
        new WebApplicationFactory<Nequi.Workers.WorkersMarker>().WithWebHostBuilder(b => { foreach (var (k, v) in Config) b.UseSetting(k, v); });

    public static WebApplicationFactory<Nequi.Realtime.RealtimeMarker> Realtime() =>
        new WebApplicationFactory<Nequi.Realtime.RealtimeMarker>().WithWebHostBuilder(b => { foreach (var (k, v) in Config) b.UseSetting(k, v); });

    public static HttpClient As(this HttpClient c, string uid, string role = "CLIENTE")
    {
        c.DefaultRequestHeaders.Remove("X-Demo-User");
        c.DefaultRequestHeaders.Remove("X-Demo-Role");
        c.DefaultRequestHeaders.Add("X-Demo-User", uid);
        c.DefaultRequestHeaders.Add("X-Demo-Role", role);
        return c;
    }

    public static DomainEvent Event(string id, string client, long cents = 5_000_000, string type = EventTypes.RechargeCompleted, string currency = "COP") =>
        new(id, type, "op-" + id, client, DateTimeOffset.UtcNow, cents, currency, null, "test", 5_000_000);

    public static StringContent PushBody(DomainEvent e) => new(JsonSerializer.Serialize(new
    {
        message = new { data = Convert.ToBase64String(Encoding.UTF8.GetBytes(e.ToJson())), messageId = e.EventId },
        subscription = "projects/x/subscriptions/y",
    }), Encoding.UTF8, "application/json");
}
