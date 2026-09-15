using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using ProfileService.Api.Services;
using ProfileService.Application;
using ProfileService.Application.DTOs;
using ProfileService.Application.Interfaces;
using ProfileService.Domain.Common;
using ProfileService.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------
// Servicios
// ---------------------------------------------------------------------
builder.Services.AddOpenApi();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, HttpCurrentUserService>();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Identity Platform emite tokens con el mismo formato que Firebase Auth:
// issuer https://securetoken.google.com/{projectId}, audience = projectId,
// firmados RS256 y verificables contra el JWKS público de Google.
var identityProjectId = builder.Configuration["IdentityPlatform:ProjectId"] ?? "finanzas-mvp-2026";
var identityIssuer = $"https://securetoken.google.com/{identityProjectId}";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = identityIssuer;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = identityIssuer,
            ValidateAudience = true,
            ValidAudience = identityProjectId,
            ValidateLifetime = true,
            // Los tokens de Identity Platform siempre firman con RS256; rechazar
            // cualquier otro algoritmo (incluido "none") por diseño de la librería.
            ValidAlgorithms = new[] { "RS256" },
            NameClaimType = "sub",
            RoleClaimType = "roles"
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// ---------------------------------------------------------------------
// Manejo de errores: traduce las excepciones de dominio a HTTP.
// Nunca se filtra el detalle de excepciones no controladas (evita fuga de
// stack traces / info interna en producción).
// ---------------------------------------------------------------------
app.UseExceptionHandler(errApp => errApp.Run(async context =>
{
    var feature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
    var ex = feature?.Error;

    var (statusCode, code, message) = ex switch
    {
        EntityNotFoundException nf => (StatusCodes.Status404NotFound, "NOT_FOUND", nf.Message),
        ConflictException cf => (StatusCodes.Status409Conflict, cf.ConflictReason, cf.Message),
        BusinessRuleValidationException br => (StatusCodes.Status400BadRequest, br.RuleName, br.Message),
        UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "UNAUTHORIZED", "No autenticado."),
        _ => (StatusCodes.Status500InternalServerError, "INTERNAL_ERROR", "Ocurrió un error inesperado.")
    };

    if (statusCode == StatusCodes.Status500InternalServerError)
    {
        app.Logger.LogError(ex, "Error no controlado procesando {Path}", context.Request.Path);
    }

    context.Response.StatusCode = statusCode;
    await context.Response.WriteAsJsonAsync(new { code, message });
}));

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// ---------------------------------------------------------------------
// Health checks (requeridos por infraestructura: Cloud Run liveness/readiness)
// ---------------------------------------------------------------------
app.MapGet("/health/live", () => Results.Ok(new { status = "live" }));
app.MapGet("/health/ready", () => Results.Ok(new { status = "ready" }));

// ---------------------------------------------------------------------
// Auth — registro público de clientes
// ---------------------------------------------------------------------
app.MapPost("/v1/auth/register", async (
        RegisterClientRequest request,
        IValidator<RegisterClientRequest> validator,
        IAuthApplicationService authService,
        CancellationToken cancellationToken) =>
    {
        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var response = await authService.RegisterClientAsync(request, cancellationToken);
        return Results.Created($"/v1/clients/{response.ClientId}", response);
    })
    .AllowAnonymous()
    .WithName("RegisterClient");

// ---------------------------------------------------------------------
// Profile — requiere JWT válido de Identity Platform
// ---------------------------------------------------------------------
var profile = app.MapGroup("/v1/profile").RequireAuthorization();

profile.MapGet("/me", async (IProfileService profileService, CancellationToken ct) =>
    Results.Ok(await profileService.GetMyProfileAsync(ct)));

profile.MapPatch("/me", async (
        UpdateProfileRequest request,
        IValidator<UpdateProfileRequest> validator,
        IProfileService profileService,
        CancellationToken ct) =>
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        return Results.Ok(await profileService.UpdateMyProfileAsync(request, ct));
    });

profile.MapGet("/me/access", async (IProfileService profileService, CancellationToken ct) =>
    Results.Ok(await profileService.GetMyAccessAsync(ct)));

// Resolución de destinatario por código público de transferencia (índice
// ux_clients_transfer_code en spanner/01_schema.sql).
app.MapGet("/v1/clients/resolve/{publicTransferCode}", async (
        string publicTransferCode,
        IProfileService profileService,
        CancellationToken ct) =>
        Results.Ok(await profileService.ResolveTargetAsync(publicTransferCode, null, ct)))
    .RequireAuthorization();

app.Run();
