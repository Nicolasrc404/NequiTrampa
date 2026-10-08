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

// Backoffice necesita el ledger autoritativo (Spanner) y Firestore (casos, auditoria, configuracion).
if (builder.Configuration["Spanner:Database"] is not { Length: > 0 } spannerDb)
    throw new InvalidOperationException("Spanner:Database is required for Nequi.Backoffice.");
builder.Services.AddHttpClient();
builder.Services.AddSingleton<Nequi.Backoffice.Services.LedgerReader>();
builder.Services.AddSingleton<Nequi.Backoffice.Services.LedgerAdjuster>();
builder.Services.AddSingleton<Nequi.Backoffice.Services.ReconciliationService>();
builder.Services.AddSingleton<Nequi.Backoffice.Services.AuditLog>();
builder.Services.AddSingleton<Nequi.Backoffice.Services.IdentityAdmin>();

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

app.UseHttpsRedirection();
app.MapControllers();
app.Run();
