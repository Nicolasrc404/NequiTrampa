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
        var firestoreProjectId = cfg["Firestore:ProjectId"] ?? projectId;

        cfg["Gcp:ProjectId"] = projectId;
        cfg["Firestore:ProjectId"] = firestoreProjectId;

        // An IN_PROGRESS idempotency record older than this is reported as STALE (never replayed).
        services.AddSingleton(new IdempotencyOptions
        {
            InProgressTimeout = TimeSpan.FromSeconds(cfg.GetValue("Idempotency:InProgressTimeoutSeconds", 300)),
        });

        builder.Logging.ClearProviders();
        builder.Logging.AddConsole(o => o.FormatterName = GcpJsonConsoleFormatter.FormatterName);
        builder.Logging.AddConsoleFormatter<GcpJsonConsoleFormatter, Microsoft.Extensions.Logging.Console.ConsoleFormatterOptions>();

        services.AddNequiProblemDetails();
        services.AddNequiAuth(cfg);
        var health = services.AddHealthChecks();

        if (gcp)
        {
            services.AddSingleton(_ => CreateFirestoreDbWithRetry(firestoreProjectId));
            services.AddSingleton<IDocumentStore, FirestoreDocumentStore>();
            health.AddDelegateCheck("firestore", async ct => await new FirestoreDocumentStore(CreateFirestoreDbWithRetry(firestoreProjectId)).PingAsync(ct));
        }
        else
        {
            services.AddSingleton<IDocumentStore, InMemoryDocumentStore>();
        }

        if (cfg["Spanner:Database"] is { Length: > 0 } spannerDb)
        {
            services.AddSingleton(new SpannerDb(spannerDb));
            services.AddSingleton<IClientDirectory, SpannerClientDirectory>();
            services.AddSingleton<IIdempotencyStore, SpannerIdempotencyStore>();
            services.AddSingleton<IClientTransferDirectory, SpannerClientTransferDirectory>();
            health.AddDelegateCheck("spanner", ct => new SpannerOutboxStore(new SpannerDb(spannerDb)).PingAsync(ct));
        }
        else
        {
            // Dev/test only: destinations must be registered explicitly by tests or local tooling.
            services.AddSingleton<InMemoryClientTransferDirectory>();
            services.AddSingleton<IClientTransferDirectory>(sp => sp.GetRequiredService<InMemoryClientTransferDirectory>());
        }
        services.AddSingleton<ClientIdentityResolver>();
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

    /// <summary>
    /// En una instancia de Cloud Run recién escalada, el servidor de metadatos que resuelve
    /// Application Default Credentials puede tardar unos milisegundos en responder. Sin reintento,
    /// esa primera solicitud falla con "Your default credentials were not found" aunque la cuenta
    /// de servicio esté correctamente configurada. Reintentar con backoff corto absorbe esa carrera
    /// sin tener que subir min-instances ni cambiar el resto de la arquitectura.
    /// </summary>
    private static FirestoreDb CreateFirestoreDbWithRetry(string projectId, int maxAttempts = 3)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return FirestoreDb.Create(projectId);
            }
            catch (InvalidOperationException) when (attempt < maxAttempts)
            {
                Thread.Sleep(TimeSpan.FromMilliseconds(200 * attempt));
            }
        }
    }
}
