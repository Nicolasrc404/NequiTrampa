using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;
using Nequi.Shared;
using Nequi.Wallet.Filters;
using Nequi.Wallet.Interfaces;
using Nequi.Wallet.Services;

// =============================================================================
// NequiTrampa — Nequi.Wallet (wallet-api conceptual)
// Responsabilidades: Wallet · Transfers · Recharges · Beneficiaries (TO-BE)
// Autenticación/Autorización: Nequi.Shared.Security (JWT + RBAC + deny-by-default)
// Idempotencia: Nequi.Shared.Idempotency (InMemory dev / Spanner prod)
//   - MVC: IdempotencyActionFilter (IAsyncActionFilter) applied via [TypeFilter] on POSTs
//   - Minimal API: IdempotencyFilter (IEndpointFilter) applied via RequireIdempotency()
// Problem Details: Nequi.Shared.Http.Problems (RFC 9457)
// Exception mapping: Nequi.Wallet.Filters.WalletExceptionFilter (WalletDomainException→status, 401/403)
// Health: Nequi.Shared.Health (/health/live + /health/ready)
// Observabilidad: Nequi.Shared.Observability (CorrelationMiddleware + GCP JSON logs)
// IMPORTANTE: Estado actual MOCK — la autoridad financiera real (Cloud Spanner) es TO-BE.
// =============================================================================
var builder = WebApplication.CreateBuilder(args);

// 1. Configuración común de la plataforma Nequi (Auth, ProblemDetails, Health, Stores, Logging)
//    Data:Backend = "gcp" → Firestore + SpannerIdempotencyStore
//    Data:Backend = cualquier otra cosa → InMemory (dev/test)
builder.AddNequiCommon();

// 2. Controladores MVC con respuestas automáticas de validación bajo RFC 9457 (422)
//    WalletExceptionFilter: mapea WalletDomainException → status code declarado y UnauthorizedAccessException → 403
builder.Services.AddSingleton<WalletExceptionFilter>();
builder.Services.AddControllers(options =>
    {
        options.Filters.AddService<WalletExceptionFilter>();
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(e => e.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(err => err.ErrorMessage).ToArray()
                );

            var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "Error de validación en los datos de la solicitud",
                Detail = "Uno o más campos enviados en el cuerpo o parámetros de la solicitud incumplen las reglas del contrato.",
                Type = "https://errors.nequitrampa.internal/validation-error",
            };
            problem.Extensions["code"] = "VALIDATION_ERROR";
            problem.Extensions["invalidParams"] = errors;

            return new Microsoft.AspNetCore.Mvc.UnprocessableEntityObjectResult(problem)
            {
                ContentTypes = { "application/problem+json" }
            };
        };
    });

// 3. Inyección de Dependencias — Servicios de Dominio Wallet
var isGcp = string.Equals(builder.Configuration["Data:Backend"], "gcp", StringComparison.OrdinalIgnoreCase);
if (isGcp)
{
    var spannerDb = builder.Configuration["Spanner:Database"];
    if (string.IsNullOrWhiteSpace(spannerDb))
    {
        throw new InvalidOperationException(
            "Configuración inválida: 'Data:Backend' es 'gcp' pero la configuración requerida 'Spanner:Database' no está definida.");
    }

    builder.Services.AddSingleton<IWalletService, SpannerWalletService>();
}
else
{
    builder.Services.AddSingleton<IWalletService, MockWalletService>();
}

builder.Services.AddSingleton<ITransferService, MockTransferService>();
builder.Services.AddSingleton<IRechargeService, MockRechargeService>();

// 4. OpenAPI / Swagger con documentación de seguridad Bearer JWT
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "NequiTrampa Wallet API",
        Version = "v1",
        Description = "API de billetera digital, transferencias y recargas. " +
                      "Estado actual: MOCK en memoria (MockWalletService / MockTransferService / MockRechargeService). " +
                      "La autoridad financiera real será Cloud Spanner (TO-BE, pendiente de DDL). " +
                      "Moneda: COP. Límite por transferencia: $2.000.000. Límite diario: $5.000.000."
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Token JWT de Google Cloud Identity Platform. Formato: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// 5. Pipeline HTTP estándar Nequi: correlación, exception handler, auth, health, /v1/me/access
//    WalletExceptionFilter (registrado globalmente) intercepta WalletDomainException y UnauthorizedAccessException.
app.UseNequiCommon();

// 6. Swagger UI en desarrollo
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "NequiTrampa Wallet API v1");
        c.RoutePrefix = string.Empty;
    });
}

app.UseHttpsRedirection();

// 7. Controladores de dominio (WalletController, TransfersController, RechargesController)
app.MapControllers();

app.Run();

namespace Nequi.Wallet { public sealed class WalletMarker; }
