using Microsoft.OpenApi.Models;
using Nequi.Shared;

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

// 3. OpenAPI / Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "NequiTrampa Backoffice API",
        Version = "v1",
        Description = "API de backoffice para roles SOPORTE, OPERADOR_FINANCIERO y ADMIN. " +
                      "Enforcea separación de responsabilidades por rol."
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

// 4. Pipeline HTTP estándar Nequi
app.UseNequiCommon();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "NequiTrampa Backoffice API v1");
        c.RoutePrefix = string.Empty;
    });
}

app.UseHttpsRedirection();
app.MapControllers();
app.Run();
