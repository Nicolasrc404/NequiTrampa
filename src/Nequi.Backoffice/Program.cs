using Nequi.Shared;
using Nequi.Shared.OpenApi;

// =============================================================================
// NequiTrampa — Nequi.Backoffice (backoffice-api conceptual)
// Responsabilidades:
//   SOPORTE   → Support Management · Investigation · Customer Lookup
//   OPERADOR  → Financial Operations · Reversals · Adjustments · Reconciliation
//   ADMIN     → Users · Roles · Configuration · Audit
// Autenticación/Autorización: Nequi.Shared.Security (JWT + RBAC + deny-by-default)
// Problem Details: Nequi.Shared.Http.Problems (RFC 9457)
// Health: Nequi.Shared.Health (/health/live + /health/ready)
// Observabilidad: Nequi.Shared.Observability (Correlation + GCP JSON logs)
// =============================================================================

var builder = WebApplication.CreateBuilder(args);

// 1. Configuración común de plataforma Nequi
builder.AddNequiCommon();

// Los servicios administrativos que leen el ledger solo se registran en GCP. En memory el
// backoffice puede arrancar para health/docs, pero no expone operaciones financieras simuladas.
var isGcp = string.Equals(builder.Configuration["Data:Backend"], "gcp", StringComparison.OrdinalIgnoreCase);
var hasSpannerConfiguration = builder.Configuration["Spanner:Database"] is { Length: > 0 };
var ledgerServicesAvailable = isGcp || hasSpannerConfiguration;
if (ledgerServicesAvailable)
{
    if (isGcp && !hasSpannerConfiguration)
        throw new InvalidOperationException("Spanner:Database is required for Nequi.Backoffice.");
    builder.Services.AddHttpClient();
    builder.Services.AddSingleton<Nequi.Backoffice.Services.LedgerReader>();
    builder.Services.AddSingleton<Nequi.Backoffice.Services.LedgerAdjuster>();
    builder.Services.AddSingleton<Nequi.Backoffice.Services.ReconciliationService>();
    builder.Services.AddSingleton<Nequi.Backoffice.Services.FinancialReconciliationClassifier>();
    builder.Services.AddSingleton<Nequi.Backoffice.Services.AuditLog>();
    builder.Services.AddSingleton<Nequi.Backoffice.Services.IdentityAdmin>();
}

// 2. Controladores MVC
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "Error de validación",
                Type = "https://errors.nequitrampa.internal/validation-error",
            };
            problem.Extensions["code"] = "VALIDATION_ERROR";
            return new Microsoft.AspNetCore.Mvc.UnprocessableEntityObjectResult(problem)
            {
                ContentTypes = { "application/problem+json" }
            };
        };
    });

builder.AddNequiSwagger("NequiTrampa Backoffice API",
    "API de backoffice para roles SOPORTE, OPERADOR_FINANCIERO y ADMIN. Enforcea separación de responsabilidades por rol.");

var app = builder.Build();

app.UseNequiSwagger(); // antes de UseNequiCommon: deny-by-default bloquearía la UI
// 4. Pipeline HTTP estándar Nequi
app.UseNequiCommon();

// En memory los servicios de ledger no existen: los endpoints que los necesitan responden 503
// explícito (con autenticación y autorización ya aplicadas) en lugar de un 500 por DI.
if (!ledgerServicesAvailable)
{
    app.Use(async (context, next) =>
    {
        try { await next(); }
        catch (InvalidOperationException ex) when (!context.Response.HasStarted &&
            ex.Message.StartsWith("Unable to resolve service for type", StringComparison.Ordinal))
        {
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await context.Response.WriteAsJsonAsync(new Microsoft.AspNetCore.Mvc.ProblemDetails
            {
                Status = StatusCodes.Status503ServiceUnavailable,
                Title = "Operación no disponible en el backend de memoria",
                Detail = "Esta operación de Backoffice requiere el ledger (Data:Backend=gcp).",
            }, options: null, contentType: "application/problem+json");
        }
    });
}

app.UseHttpsRedirection();
app.MapControllers();
app.Run();

namespace Nequi.Backoffice
{
    /// <summary>Stable marker for <c>WebApplicationFactory</c> (avoids collisions with other Program classes).</summary>
    public sealed class BackofficeMarker;
}
