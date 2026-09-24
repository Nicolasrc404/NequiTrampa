using Microsoft.OpenApi.Models;
using Nequi.Shared;

// =============================================================================
// NequiTrampa — Nequi.Profile (core-api conceptual, dominio Profile)
// Responsabilidades: Profile · Access
// Nota: GET /v1/me/access ya está implementado en NequiHost.UseNequiCommon()
//       vía AuthExtensions.MapAccessEndpoint()
// Estado general: PARCIAL — estructura y contratos listos.
// Modelo de datos: tabla 'clients' existente en Cloud Spanner (database/spanner/01_schema.sql).
// PERSISTENCIA PENDIENTE: integración funcional y repositorios Spanner para Profile aún en desarrollo.
// =============================================================================

var builder = WebApplication.CreateBuilder(args);

builder.AddNequiCommon();

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

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "NequiTrampa Profile API",
        Version = "v1",
        Description = "API de perfil de usuario y acceso (core-api). Incluye GET /v1/me/access."
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization", In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
                { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.UseNequiCommon(); // ya incluye /v1/me/access y /health/*

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "NequiTrampa Profile API v1");
        c.RoutePrefix = string.Empty;
    });
}

app.UseHttpsRedirection();
app.MapControllers();
app.Run();
