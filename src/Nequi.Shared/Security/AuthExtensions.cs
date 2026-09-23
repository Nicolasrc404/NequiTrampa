using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Nequi.Shared.Security;

public static class AuthExtensions
{
    public const string DemoScheme = "Demo";

    /// <summary>
    /// Identity Platform JWT (issuer/audience/signature/expiry validated, RS256 only), RBAC roles from the
    /// "role"/"roles" custom claim, named policies, and deny-by-default (fallback policy = authenticated).
    /// Auth:DemoHeaders=true enables an X-Demo-User/X-Demo-Role scheme for non-production smoke tests only.
    /// </summary>
    public static IServiceCollection AddNequiAuth(this IServiceCollection services, IConfiguration config)
    {
        var projectId = config["Gcp:ProjectId"] ?? throw new InvalidOperationException("Gcp:ProjectId is required");
        var demo = config.GetValue<bool>("Auth:DemoHeaders");

        var schemes = services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(o =>
            {
                o.Authority = $"https://securetoken.google.com/{projectId}";
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = $"https://securetoken.google.com/{projectId}",
                    ValidAudience = projectId,
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidAlgorithms = [SecurityAlgorithms.RsaSha256],
                    RoleClaimType = ClaimTypes.Role,
                    ClockSkew = TimeSpan.FromSeconds(30),
                };
                o.MapInboundClaims = false;
                o.Events = new JwtBearerEvents
                {
                    OnTokenValidated = ctx =>
                    {
                        // Identity Platform custom claim: role (string) or roles (array).
                        var id = (ClaimsIdentity)ctx.Principal!.Identity!;
                        foreach (var name in new[] { "role", "roles" })
                            foreach (var c in ctx.Principal.FindAll(name).ToList())
                                if (Roles.All.Contains(c.Value)) id.AddClaim(new Claim(ClaimTypes.Role, c.Value));
                        return Task.CompletedTask;
                    },
                };
            });

        if (demo)
            schemes.AddScheme<AuthenticationSchemeOptions, DemoHeaderHandler>(DemoScheme, _ => { });

        services.AddAuthorization(o =>
        {
            var schemeNames = demo ? new[] { JwtBearerDefaults.AuthenticationScheme, AuthExtensions.DemoScheme } : [JwtBearerDefaults.AuthenticationScheme];
            AuthorizationPolicyBuilder Base() => new AuthorizationPolicyBuilder(schemeNames).RequireAuthenticatedUser();

            o.FallbackPolicy = Base().Build(); // deny-by-default
            o.DefaultPolicy = Base().Build();
            o.AddPolicy(Policies.Client, Base().RequireRole(Roles.Cliente).Build());
            o.AddPolicy(Policies.CanViewSupport, Base().RequireRole(Roles.Soporte, Roles.OperadorFinanciero, Roles.Admin).Build());
            o.AddPolicy(Policies.CanReverseOperation, Base().RequireRole(Roles.OperadorFinanciero).Build());
            o.AddPolicy(Policies.CanManageRoles, Base().RequireRole(Roles.Admin).Build());
            o.AddPolicy(Policies.CanGenerateReports, Base().RequireRole(Roles.Cliente, Roles.OperadorFinanciero, Roles.Admin).Build());
            o.AddPolicy(Policies.InternalStaff, Base().RequireRole(Roles.Soporte, Roles.OperadorFinanciero, Roles.Admin).Build());
        });
        return services;
    }

    public static IEndpointConventionBuilder MapAccessEndpoint(this IEndpointRouteBuilder app) =>
        app.MapGet("/v1/me/access", (ClaimsPrincipal p) =>
        {
            var u = CurrentUser.From(p);
            return u is null ? Microsoft.AspNetCore.Http.Results.Unauthorized()
                : Microsoft.AspNetCore.Http.Results.Ok(new { uid = u.Uid, roles = u.Roles.OrderBy(r => r), isStaff = u.IsStaff });
        });
}

/// <summary>Smoke-test scheme. Registered only when Auth:DemoHeaders=true; keep the Cloud Run service private (IAM) when on.</summary>
public sealed class DemoHeaderHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var uid = Request.Headers["X-Demo-User"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(uid)) return Task.FromResult(AuthenticateResult.NoResult());
        var claims = new List<Claim> { new("user_id", uid) };
        foreach (var r in (Request.Headers["X-Demo-Role"].FirstOrDefault() ?? Roles.Cliente).Split(','))
            if (Roles.All.Contains(r.Trim())) claims.Add(new Claim(ClaimTypes.Role, r.Trim()));
        // X-Demo-Client-Id carries the domain clientId (UUID from Spanner) when it differs from the auth subject.
        var clientId = Request.Headers["X-Demo-Client-Id"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(clientId))
            claims.Add(new Claim("client_id", clientId));
        var id = new ClaimsIdentity(claims, AuthExtensions.DemoScheme);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(id), AuthExtensions.DemoScheme)));
    }
}
