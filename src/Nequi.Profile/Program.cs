using Nequi.Shared;
using Nequi.Shared.OpenApi;

// =============================================================================
// NequiTrampa — Nequi.Profile (core-api conceptual, dominio Profile)
// Responsabilidades: Profile · Access
// Nota: GET /v1/me/access ya está implementado en NequiHost.UseNequiCommon()
//       vía AuthExtensions.MapAccessEndpoint()
// Estado general: IMPLEMENTADO.
// Modelo de datos: tabla 'clients' existente en Cloud Spanner (database/spanner/01_schema.sql).
// Endpoints: GET/PATCH /v1/profile (Spanner clients + wallet_accounts).
// =============================================================================

var builder = WebApplication.CreateBuilder(args);

builder.AddNequiCommon();

if (builder.Configuration["Spanner:Database"] is not { Length: > 0 })
    throw new InvalidOperationException("Spanner:Database is required for Nequi.Profile.");

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

builder.AddNequiSwagger("NequiTrampa Profile API",
    "API de perfil de usuario y acceso (core-api). Incluye GET /v1/me/access.");

var app = builder.Build();

app.UseNequiSwagger(); // antes de UseNequiCommon: deny-by-default bloquearía la UI
app.UseNequiCommon(); // ya incluye /v1/me/access y /health/*

app.UseHttpsRedirection();
app.MapControllers();
app.Run();
