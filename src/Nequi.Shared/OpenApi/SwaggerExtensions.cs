using System.Reflection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using Nequi.Shared.Idempotency;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Nequi.Shared.OpenApi;

/// <summary>
/// Swagger/OpenAPI shared by every Nequi service. UI at /swagger ("/" redirects there).
/// Enabled in Development or when Swagger:Enabled=true. With Auth:DemoHeaders=true the "Authorize" dialog
/// also offers X-Demo-User / X-Demo-Role / X-Demo-Client-Id so endpoints can be tried without a real JWT.
/// </summary>
public static class SwaggerExtensions
{
    private const string BearerId = "Bearer";
    private const string DemoUserId = "X-Demo-User";
    private const string DemoRoleId = "X-Demo-Role";
    private const string DemoClientId = "X-Demo-Client-Id";

    public static WebApplicationBuilder AddNequiSwagger(this WebApplicationBuilder builder, string title, string? description = null)
    {
        var demo = builder.Configuration.GetValue<bool>("Auth:DemoHeaders");
        builder.Services.AddSingleton(new SwaggerInfo(title));
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo { Title = title, Version = "v1", Description = description });

            var xml = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetEntryAssembly()?.GetName().Name}.xml");
            if (File.Exists(xml)) c.IncludeXmlComments(xml);

            c.AddSecurityDefinition(BearerId, new OpenApiSecurityScheme
            {
                Description = "Token JWT de Google Cloud Identity Platform (sin el prefijo 'Bearer').",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
            });
            c.AddSecurityRequirement(Requirement(BearerId));

            if (demo)
            {
                AddHeaderScheme(c, DemoUserId, "Usuario demo (ej: client-1). Solo entornos no productivos.");
                AddHeaderScheme(c, DemoRoleId, "Rol(es) separados por coma: CLIENTE, SOPORTE, OPERADOR_FINANCIERO, ADMIN.");
                AddHeaderScheme(c, DemoClientId, "Opcional: clientId de dominio (UUID en Spanner) cuando difiere del usuario.");
                c.AddSecurityRequirement(Requirement(DemoUserId, DemoRoleId, DemoClientId));
            }

            c.OperationFilter<IdempotencyHeaderFilter>();
            c.CustomSchemaIds(t => t.FullName?.Replace('+', '.'));
        });
        return builder;
    }

    /// <summary>Call before UseNequiCommon: the deny-by-default fallback policy would otherwise block the UI.</summary>
    public static WebApplication UseNequiSwagger(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment() && !app.Configuration.GetValue<bool>("Swagger:Enabled")) return app;

        var title = app.Services.GetRequiredService<SwaggerInfo>().Title;
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", $"{title} v1");
            c.DocumentTitle = title;
            c.EnablePersistAuthorization();
            c.DisplayRequestDuration();
        });
        app.MapGet("/", () => Results.Redirect("/swagger")).AllowAnonymous().ExcludeFromDescription();
        return app;
    }

    private static void AddHeaderScheme(SwaggerGenOptions c, string header, string description) =>
        c.AddSecurityDefinition(header, new OpenApiSecurityScheme
        {
            Description = description,
            Name = header,
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.ApiKey,
        });

    private static OpenApiSecurityRequirement Requirement(params string[] ids)
    {
        var r = new OpenApiSecurityRequirement();
        foreach (var id in ids)
            r[new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = id } }] = [];
        return r;
    }

    private sealed record SwaggerInfo(string Title);

    /// <summary>Documents the Idempotency-Key header on endpoints guarded by RequireIdempotency() (minimal APIs).
    /// MVC actions already declare it with [FromHeader].</summary>
    private sealed class IdempotencyHeaderFilter : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            if (!context.ApiDescription.ActionDescriptor.EndpointMetadata.OfType<RequiresIdempotencyMetadata>().Any()) return;
            if (operation.Parameters.Any(p => p.In == ParameterLocation.Header && p.Name == IdempotencyFilter.HeaderName)) return;
            operation.Parameters.Add(new OpenApiParameter
            {
                Name = IdempotencyFilter.HeaderName,
                In = ParameterLocation.Header,
                Required = true,
                Description = $"Clave única por operación (1-{IdempotencyFilter.MaxKeyLength} caracteres, ej: un UUID).",
                Schema = new OpenApiSchema { Type = "string" },
            });
        }
    }
}
