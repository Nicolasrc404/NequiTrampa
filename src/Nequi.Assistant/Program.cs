using Nequi.Shared;
using Nequi.Shared.OpenApi;

var builder = WebApplication.CreateBuilder(args);

builder.AddNequiCommon();

if (builder.Configuration["Spanner:Database"] is not { Length: > 0 })
    throw new InvalidOperationException("Spanner:Database is required for Nequi.Assistant (read-only balance lookup).");
builder.Services.AddHttpClient();
builder.Services.AddSingleton<Nequi.Assistant.Services.VertexClient>();

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
builder.AddNequiSwagger("NequiTrampa Assistant API",
    "Asistente conversacional (assistant-api).");

var app = builder.Build();

app.UseNequiSwagger(); // antes de UseNequiCommon: deny-by-default bloquearía la UI
app.UseNequiCommon();

app.UseHttpsRedirection();

app.MapControllers();

app.Run();

public partial class Program { }