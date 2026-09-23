using Google.Cloud.PubSub.V1;
using Nequi.Shared;
using Nequi.Shared.Events;
using Nequi.Shared.Health;
using Nequi.Workers.Notifications;
using Nequi.Workers.Outbox;
using Nequi.Workers.Projection;
using Nequi.Workers.Reports;

var builder = WebApplication.CreateBuilder(args);
builder.AddNequiCommon();

var cfg = builder.Configuration;
var gcp = string.Equals(cfg["Data:Backend"], "gcp", StringComparison.OrdinalIgnoreCase);
var projectId = cfg["Gcp:ProjectId"]!;

builder.Services.Configure<OutboxOptions>(cfg.GetSection("Outbox"));
builder.Services.AddSingleton<OutboxDispatcher>();
builder.Services.AddSingleton<ProjectionService>();
builder.Services.AddSingleton<NotificationService>();
builder.Services.AddSingleton<IPushSender, LogPushSender>();
builder.Services.AddSingleton<ReportQueue>();
builder.Services.AddSingleton<ReportGenerator>();
builder.Services.AddHostedService<OutboxWorker>();
builder.Services.AddHostedService<ReportWorker>();

if (gcp)
{
    var topic = cfg["PubSub:OutboxTopic"] ?? "wallet-events";
    builder.Services.AddSingleton<IEventPublisher>(_ =>
        new PubSubEventPublisher(PublisherClient.Create(TopicName.FromProjectTopic(projectId, topic))));
    builder.Services.AddHealthChecks().AddDelegateCheck("pubsub", async ct =>
    {
        var pub = await PublisherServiceApiClient.CreateAsync(ct);
        await pub.GetTopicAsync(TopicName.FromProjectTopic(projectId, topic), ct);
    });
}
else
{
    builder.Services.AddSingleton<IEventPublisher, InMemoryEventPublisher>();
}
// Outbox source. Memory locally; the Spanner-backed store replaces it when Spanner:Database is configured.
builder.Services.AddSingleton<InMemoryOutboxStore>();
builder.Services.AddSingleton<IOutboxStore>(sp => SpannerOutbox.Create(sp) ?? sp.GetRequiredService<InMemoryOutboxStore>());

var app = builder.Build();
app.UseNequiCommon();

app.MapProjection();
app.MapNotifications();
app.MapReports();

// Cloud Scheduler fallback / manual trigger; protected by Cloud Run IAM (OIDC), not by end-user JWT.
app.MapPost("/internal/outbox/drain", async (OutboxDispatcher d, Microsoft.Extensions.Options.IOptions<OutboxOptions> o, CancellationToken ct) =>
    Results.Ok(new { published = await d.DrainOnceAsync(o.Value.BatchSize, ct) })).AllowAnonymous();

app.MapGet("/v1/outbox/stats", async (IOutboxStore s, CancellationToken ct) => Results.Ok(await s.StatsAsync(ct)))
    .RequireAuthorization(Nequi.Shared.Security.Policies.InternalStaff);

if (cfg.GetValue<bool>("Auth:DemoHeaders"))
{
    // Smoke-test helper (non-production): inserts an event into the in-memory outbox.
    app.MapPost("/internal/dev/outbox", (DomainEvent e, InMemoryOutboxStore s) =>
    {
        if (!e.IsValid(out var err)) return Results.UnprocessableEntity(new { error = err });
        s.Enqueue(e);
        return Results.Accepted();
    }).RequireAuthorization(Nequi.Shared.Security.Policies.InternalStaff);
}

app.Run();

namespace Nequi.Workers { public sealed class WorkersMarker; }
