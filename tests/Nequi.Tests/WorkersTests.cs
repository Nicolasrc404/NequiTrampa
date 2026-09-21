
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Nequi.Shared.Events;
using Nequi.Workers.Outbox;

namespace Nequi.Tests;

public class WorkersTests : IDisposable
{
    private readonly Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Nequi.Workers.WorkersMarker> _f = Env.Workers();
    public void Dispose() => _f.Dispose();

    private static StringContent Json(object o) => new(JsonSerializer.Serialize(o), Encoding.UTF8, "application/json");

    [Fact]
    public async Task Health_live_and_ready_are_public()
    {
        var c = _f.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await c.GetAsync("/health/live")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await c.GetAsync("/health/ready")).StatusCode);
    }

    [Fact]
    public async Task Without_credentials_is_401_deny_by_default()
    {
        var c = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.GetAsync("/v1/notifications")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.GetAsync("/v1/projections/movements")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.GetAsync("/v1/outbox/stats")).StatusCode);
    }

    [Fact]
    public async Task Access_endpoint_returns_roles()
    {
        var c = _f.CreateClient().As("u1", "SOPORTE");
        var body = await c.GetFromJsonAsync<JsonElement>("/v1/me/access");
        Assert.Equal("u1", body.GetProperty("uid").GetString());
        Assert.True(body.GetProperty("isStaff").GetBoolean());
    }

    [Fact]
    public async Task Client_cannot_reach_staff_only_endpoints()
    {
        var c = _f.CreateClient().As("u1");
        Assert.Equal(HttpStatusCode.Forbidden, (await c.GetAsync("/v1/outbox/stats")).StatusCode);
    }

    [Fact]
    public async Task Projection_is_idempotent_and_queryable_by_owner_only()
    {
        var c = _f.CreateClient();
        var e = Env.Event("evt-1", "alice");
        Assert.Equal(HttpStatusCode.NoContent, (await c.PostAsync("/internal/pubsub/projection", Env.PushBody(e))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await c.PostAsync("/internal/pubsub/projection", Env.PushBody(e))).StatusCode); // redelivery

        var alice = _f.CreateClient().As("alice");
        var mine = await alice.GetFromJsonAsync<JsonElement>("/v1/projections/movements");
        Assert.Equal(1, mine.GetProperty("count").GetInt32());
        Assert.Equal(5_000_000, mine.GetProperty("items")[0].GetProperty("amountCents").GetInt64());

        var bob = _f.CreateClient().As("bob");
        Assert.Equal(HttpStatusCode.Forbidden, (await bob.GetAsync("/v1/projections/movements?clientId=alice")).StatusCode);
        var staff = _f.CreateClient().As("s1", "SOPORTE");
        Assert.Equal(HttpStatusCode.OK, (await staff.GetAsync("/v1/projections/movements?clientId=alice")).StatusCode);
    }

    [Fact]
    public async Task Malformed_or_non_COP_events_are_acked_but_not_projected()
    {
        var c = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Accepted, (await c.PostAsync("/internal/pubsub/projection", Json(new { message = new { data = "!!" } }))).StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, (await c.PostAsync("/internal/pubsub/projection", Env.PushBody(Env.Event("evt-usd", "alice", currency: "USD")))).StatusCode);
        var mine = await _f.CreateClient().As("alice").GetFromJsonAsync<JsonElement>("/v1/projections/movements");
        Assert.Equal(0, mine.GetProperty("count").GetInt32());
    }

    [Fact]
    public async Task Notifications_are_created_once_and_readable_only_by_owner()
    {
        var c = _f.CreateClient();
        var e = Env.Event("evt-n1", "alice", -150_000, EventTypes.TransferCompleted);
        await c.PostAsync("/internal/pubsub/notifications", Env.PushBody(e));
        await c.PostAsync("/internal/pubsub/notifications", Env.PushBody(e));

        var alice = _f.CreateClient().As("alice");
        var list = await alice.GetFromJsonAsync<JsonElement>("/v1/notifications");
        Assert.Equal(1, list.GetProperty("count").GetInt32());
        Assert.Equal(1, list.GetProperty("unread").GetInt32());
        Assert.Equal("Transferencia enviada", list.GetProperty("items")[0].GetProperty("title").GetString());

        var bob = _f.CreateClient().As("bob");
        Assert.Equal(HttpStatusCode.NotFound, (await bob.PatchAsync("/v1/notifications/evt-n1/read", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await alice.PatchAsync("/v1/notifications/evt-n1/read", null)).StatusCode);
        Assert.Equal(0, (await alice.GetFromJsonAsync<JsonElement>("/v1/notifications")).GetProperty("unread").GetInt32());
    }

    [Fact]
    public async Task Report_requires_idempotency_key_replays_and_conflicts()
    {
        var c = _f.CreateClient().As("alice");
        Assert.Equal(HttpStatusCode.BadRequest, (await c.PostAsync("/v1/reports", Json(new { }))).StatusCode);

        HttpRequestMessage Req(string key, object body) =>
            new(HttpMethod.Post, "/v1/reports") { Content = Json(body), Headers = { { "Idempotency-Key", key } } };

        var r1 = await c.SendAsync(Req("k1", new { }));
        Assert.Equal(HttpStatusCode.Accepted, r1.StatusCode);
        var id1 = (await r1.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString();

        var r2 = await c.SendAsync(Req("k1", new { }));
        Assert.Equal(HttpStatusCode.Accepted, r2.StatusCode);
        Assert.Equal("true", r2.Headers.GetValues("Idempotent-Replayed").Single());
        Assert.Equal(id1, (await r2.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString());

        var r3 = await c.SendAsync(Req("k1", new { from = "2026-01-01" }));
        Assert.Equal(HttpStatusCode.Conflict, r3.StatusCode);
        Assert.Equal("application/problem+json", r3.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task Report_generates_csv_from_projection_and_respects_ownership()
    {
        var push = _f.CreateClient();
        await push.PostAsync("/internal/pubsub/projection", Env.PushBody(Env.Event("evt-r1", "alice", 1_000_000)));
        await push.PostAsync("/internal/pubsub/projection", Env.PushBody(Env.Event("evt-r2", "alice", -250_000, EventTypes.TransferCompleted)));

        var alice = _f.CreateClient().As("alice");
        var req = new HttpRequestMessage(HttpMethod.Post, "/v1/reports") { Content = Json(new { }), Headers = { { "Idempotency-Key", "rk" } } };
        var id = (await (await alice.SendAsync(req)).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString();

        JsonElement status = default;
        for (var i = 0; i < 50; i++)
        {
            status = await alice.GetFromJsonAsync<JsonElement>($"/v1/reports/{id}");
            if (status.GetProperty("status").GetString() != "PENDING") break;
            await Task.Delay(100);
        }
        Assert.Equal("COMPLETED", status.GetProperty("status").GetString());
        Assert.Equal(2, status.GetProperty("rowCount").GetInt64());

        var csv = await alice.GetStringAsync($"/v1/reports/{id}/download");
        Assert.Contains("RECHARGE_COMPLETED,1000000,COP", csv);
        Assert.Contains("TRANSFER_COMPLETED,-250000,COP", csv);

        var bob = _f.CreateClient().As("bob");
        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync($"/v1/reports/{id}")).StatusCode);
        var bobReq = new HttpRequestMessage(HttpMethod.Post, "/v1/reports") { Content = Json(new { clientId = "alice" }), Headers = { { "Idempotency-Key", "bk" } } };
        Assert.Equal(HttpStatusCode.Forbidden, (await bob.SendAsync(bobReq)).StatusCode);
        var support = _f.CreateClient().As("s1", "SOPORTE");
        Assert.Equal(HttpStatusCode.Forbidden, (await support.PostAsync("/v1/reports", Json(new { }))).StatusCode); // SOPORTE lacks CanGenerateReports
    }

    [Fact]
    public async Task Outbox_worker_publishes_pending_events_once()
    {
        var store = _f.Services.GetRequiredService<InMemoryOutboxStore>();
        store.Enqueue(Env.Event("evt-o1", "alice"));
        store.Enqueue(Env.Event("evt-o2", "alice"));
        var staff = _f.CreateClient().As("s1", "OPERADOR_FINANCIERO");

        var drain = await _f.CreateClient().PostAsync("/internal/outbox/drain", null);
        Assert.Equal(2, (await drain.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("published").GetInt32());
        var again = await _f.CreateClient().PostAsync("/internal/outbox/drain", null);
        Assert.Equal(0, (await again.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("published").GetInt32());

        var stats = await staff.GetFromJsonAsync<JsonElement>("/v1/outbox/stats");
        Assert.Equal(2, stats.GetProperty("published").GetInt32());
        Assert.Equal(2, ((InMemoryEventPublisher)_f.Services.GetRequiredService<IEventPublisher>()).Published.Count);
    }
}
