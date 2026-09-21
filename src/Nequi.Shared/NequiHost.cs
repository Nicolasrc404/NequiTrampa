using Google.Cloud.Firestore;
using Google.Cloud.PubSub.V1;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Nequi.Shared.Data;
using Nequi.Shared.Events;
using Nequi.Shared.Health;
using Nequi.Shared.Http;
using Nequi.Shared.Idempotency;
using Nequi.Shared.Observability;
using Nequi.Shared.Security;

namespace Nequi.Shared;

/// <summary>Common wiring for every Nequi service: logging, auth, problem details, health, stores.</summary>
public static class NequiHost
{
    /// <summary>Config: Gcp:ProjectId, Data:Backend = "gcp" | "memory", PubSub:OutboxTopic, Spanner:Database.</summary>
    public static WebApplicationBuilder AddNequiCommon(this WebApplicationBuilder builder)
    {
        var cfg = builder.Configuration;
        var services = builder.Services;
        var gcp = string.Equals(cfg["Data:Backend"], "gcp", StringComparison.OrdinalIgnoreCase);
        var projectId = cfg["Gcp:ProjectId"] ?? "local";
        cfg["Gcp:ProjectId"] = projectId;

        builder.Logging.ClearProviders();
        builder.Logging.AddConsole(o => o.FormatterName = GcpJsonConsoleFormatter.FormatterName);
        builder.Logging.AddConsoleFormatter<GcpJsonConsoleFormatter, Microsoft.Extensions.Logging.Console.ConsoleFormatterOptions>();

        services.AddNequiProblemDetails();
        services.AddNequiAuth(cfg);
        var health = services.AddHealthChecks();

        if (gcp)
        {
            services.AddSingleton(_ => FirestoreDb.Create(projectId));
            services.AddSingleton<IDocumentStore, FirestoreDocumentStore>();
            health.AddDelegateCheck("firestore", async ct => await new FirestoreDocumentStore(FirestoreDb.Create(projectId)).PingAsync(ct));
        }
        else
        {
            services.AddSingleton<IDocumentStore, InMemoryDocumentStore>();
        }

        if (cfg["Spanner:Database"] is { Length: > 0 } spannerDb)
        {
            services.AddSingleton(new SpannerDb(spannerDb));
            services.AddSingleton<IIdempotencyStore, SpannerIdempotencyStore>();
            health.AddDelegateCheck("spanner", ct => new SpannerOutboxStore(new SpannerDb(spannerDb)).PingAsync(ct));
        }
        services.TryAddSingleton<IIdempotencyStore, InMemoryIdempotencyStore>();
        return builder;
    }

    public static WebApplication UseNequiCommon(this WebApplication app)
    {
        var projectId = app.Configuration["Gcp:ProjectId"];
        app.UseMiddleware<CorrelationMiddleware>(projectId);
        app.UseNequiExceptionHandler();
        app.Use((ctx, next) =>
        {
            if (HttpMethods.IsPost(ctx.Request.Method)) ctx.Request.EnableBuffering(); // idempotency hashes the body after binding
            return next();
        });
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapNequiHealth();
        app.MapAccessEndpoint();
        return app;
    }
}
