using Microsoft.OpenApi.Models;
using NequiTrampa.WalletApi.Errors;
using NequiTrampa.WalletApi.Interfaces;
using NequiTrampa.WalletApi.Security;
using NequiTrampa.WalletApi.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Configuración de Controladores y Formato JSON
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        // Personalizar respuestas automáticas de validación de ModelState bajo RFC 9457 (400 / 422)
        options.InvalidModelStateResponseFactory = context =>
        {
            var problemDetails = context.HttpContext.CreateProblemDetails(
                StatusCodes.Status422UnprocessableEntity,
                "https://errors.nequitrampa.internal/validation-error",
                "Error de validación en los datos de la solicitud",
                "Uno o más campos enviados en el cuerpo o parámetros de la solicitud incumplen las reglas del contrato.",
                "VALIDATION_ERROR"
            );

            var errors = context.ModelState
                .Where(e => e.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(err => err.ErrorMessage).ToArray()
                );

            problemDetails.Extensions["invalidParams"] = errors;
            return new UnprocessableEntityObjectResult(problemDetails)
            {
                ContentTypes = { "application/problem+json" }
            };
        };
    });

// 2. Configuración de Problem Details RFC 9457
builder.Services.AddAppProblemDetails();

// 3. Configuración de Autenticación JWT (RFC 8725) y Autorización Deny-by-Default
builder.Services.AddAppSecurity(builder.Configuration);

// 4. Inyección de Dependencias de Servicios de Dominio
builder.Services.AddSingleton<IWalletService, MockWalletService>();
builder.Services.AddSingleton<ITransferService, MockTransferService>();
builder.Services.AddSingleton<IRechargeService, MockRechargeService>();

// 5. Configuración de OpenAPI / Swagger con Documentación de Seguridad
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "NequiTrampa Wallet API",
        Version = "v1",
        Description = "API de billetera digital, transferencias y recargas con verdad financiera en Cloud Spanner."
    });

    // Definición de esquema Bearer JWT
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Ingrese el token JWT de Google Cloud Identity Platform en el formato: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// 6. Pipeline HTTP y Manejo Global de Excepciones
app.UseAppExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "NequiTrampa Wallet API v1");
        c.RoutePrefix = string.Empty; // Cargar Swagger en la raíz en desarrollo
    });
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

// 7. Mapeo de Endpoints de Salud (Health Checks para Cloud Run)
app.MapGet("/health/live", () => Results.Ok(new 
{ 
    status = "ALIVE", 
    service = "wallet-api",
    timestamp = DateTimeOffset.UtcNow 
})).AllowAnonymous();

// Estado: PARCIAL. Endpoint implementado; readiness real de Spanner pendiente de integración física.
app.MapGet("/health/ready", () => Results.Ok(new 
{ 
    status = "PARCIAL", 
    readiness = "READY_FOR_TRAFFIC",
    dependencies = new 
    { 
        spanner = "MOCK_MODE_PENDING_PHYSICAL_INSTANCE",
        identityPlatform = "CONFIGURED" 
    },
    timestamp = DateTimeOffset.UtcNow 
})).AllowAnonymous();

app.MapControllers();

app.Run();
