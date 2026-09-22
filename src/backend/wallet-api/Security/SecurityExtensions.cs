using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace NequiTrampa.WalletApi.Security;

/// <summary>
/// Métodos de extensión para configurar autenticación JWT estricta (RFC 8725) 
/// y políticas de autorización bajo el principio Deny-by-Default.
/// </summary>
public static class SecurityExtensions
{
    public static IServiceCollection AddAppSecurity(this IServiceCollection services, IConfiguration configuration)
    {
        var gcpProjectId = configuration["Gcp:ProjectId"] ?? "nequitrampa-mvp";
        var expectedIssuer = $"https://securetoken.google.com/{gcpProjectId}";

        // 1. Configuración de Autenticación JWT conforme a RFC 8725
        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.Authority = expectedIssuer;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                // RFC 8725: Verificación estricta de emisor y audiencia
                ValidateIssuer = true,
                ValidIssuer = expectedIssuer,

                ValidateAudience = true,
                ValidAudience = gcpProjectId,

                // RFC 8725: Verificación estricta de tiempo de expiración y margen de reloj
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1),

                // RFC 8725: Verificación de firma y clave del emisor
                ValidateIssuerSigningKey = true,
                RequireSignedTokens = true,

                // RFC 8725: Restricción explícita de algoritmos criptográficos permitidos (Rechazo de 'none')
                ValidAlgorithms = new[] { SecurityAlgorithms.RsaSha256 }
            };

            options.Events = new JwtBearerEvents
            {
                OnChallenge = async context =>
                {
                    // RFC 9457: Emisión de ProblemDetails cuando falta el token o es inválido (401 Unauthorized)
                    context.HandleResponse();
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/problem+json";

                    var problem = new ProblemDetails
                    {
                        Type = "https://errors.nequitrampa.internal/unauthorized",
                        Title = "No autorizado",
                        Status = StatusCodes.Status401Unauthorized,
                        Detail = "Se requiere un token JWT válido de Google Cloud Identity Platform para acceder a este recurso.",
                        Instance = context.Request.Path
                    };
                    problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;

                    await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
                },
                OnForbidden = async context =>
                {
                    // RFC 9457: Emisión de ProblemDetails ante falta de permisos (403 Forbidden)
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/problem+json";

                    var problem = new ProblemDetails
                    {
                        Type = "https://errors.nequitrampa.internal/forbidden",
                        Title = "Acceso denegado",
                        Status = StatusCodes.Status403Forbidden,
                        Detail = "El rol o permisos del usuario autenticado no le permiten ejecutar esta acción.",
                        Instance = context.Request.Path
                    };
                    problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;

                    await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
                }
            };
        });

        // 2. Configuración de Autorización y Principio Deny-by-Default
        services.AddAuthorization(options =>
        {
            // Principio Deny-by-Default: Si un endpoint no tiene atributo de autorización explícito,
            // de forma predeterminada exige que el usuario esté autenticado.
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();

            // Políticas basadas en roles formales (RBAC)
            options.AddPolicy(AuthorizationPolicies.RequireCliente, policy =>
                policy.RequireRole(AuthorizationRoles.Cliente));

            options.AddPolicy(AuthorizationPolicies.RequireSoporte, policy =>
                policy.RequireRole(AuthorizationRoles.Soporte));

            options.AddPolicy(AuthorizationPolicies.RequireOperadorFinanciero, policy =>
                policy.RequireRole(AuthorizationRoles.OperadorFinanciero));

            options.AddPolicy(AuthorizationPolicies.RequireAdmin, policy =>
                policy.RequireRole(AuthorizationRoles.Admin));

            // Políticas granulares de negocio (Mínimo Privilegio)
            options.AddPolicy(AuthorizationPolicies.CanCreateTransfer, policy =>
                policy.RequireRole(AuthorizationRoles.Cliente));

            options.AddPolicy(AuthorizationPolicies.CanCreateRecharge, policy =>
                policy.RequireRole(AuthorizationRoles.Cliente));

            options.AddPolicy(AuthorizationPolicies.CanInvestigateFinancialOperations, policy =>
                policy.RequireRole(AuthorizationRoles.Soporte, AuthorizationRoles.OperadorFinanciero));

            options.AddPolicy(AuthorizationPolicies.CanExecuteReversals, policy =>
                policy.RequireRole(AuthorizationRoles.OperadorFinanciero));

            options.AddPolicy(AuthorizationPolicies.CanCreateFinancialAdjustment, policy =>
                policy.RequireRole(AuthorizationRoles.OperadorFinanciero));

            options.AddPolicy(AuthorizationPolicies.CanResolveReconciliationIssue, policy =>
                policy.RequireRole(AuthorizationRoles.OperadorFinanciero));

            options.AddPolicy(AuthorizationPolicies.CanManageUsers, policy =>
                policy.RequireRole(AuthorizationRoles.Admin));

            options.AddPolicy(AuthorizationPolicies.CanManageRoles, policy =>
                policy.RequireRole(AuthorizationRoles.Admin));

            options.AddPolicy(AuthorizationPolicies.CanManageConfiguration, policy =>
                policy.RequireRole(AuthorizationRoles.Admin));

            options.AddPolicy(AuthorizationPolicies.CanReadAudit, policy =>
                policy.RequireRole(AuthorizationRoles.Admin, AuthorizationRoles.OperadorFinanciero));
        });

        return services;
    }
}
