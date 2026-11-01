using System.Collections.Concurrent;
using System.Threading.RateLimiting;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Nequi.Gateway.Health;
using Yarp.ReverseProxy.Configuration;
using Yarp.ReverseProxy.Transforms;

// =============================================================================
// NequiTrampa — Nequi.Gateway (BFF / API gateway)
// Unico servicio publico. Los 7 servicios de negocio siguen PRIVADOS (Cloud Run IAM):
//   - CORS para el front web (Cors:AllowedOrigins).
//   - Reenvia el JWT de Identity Platform tal cual (cada servicio lo valida: RS256, issuer, audience, roles).
//   - Anade X-Serverless-Authorization con un identity token del service account del gateway (audiencia = servicio destino).
//   - Elimina cabeceras X-Demo-* del cliente: nunca llegan a los servicios.
//   - Nunca expone /internal/** (Pub/Sub push, drain del outbox) ni /health de los servicios.
//   - WebSocket /ws: el navegador no puede enviar Authorization, asi que se acepta ?access_token=<JWT>.
// =============================================================================

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 1_000_000);

// ---- destinos (Cloud Run URLs) ----------------------------------------------------------------
var services = new Dictionary<string, string?>
{
    ["wallet"] = cfg["Services:Wallet"],
    ["workers"] = cfg["Services:Workers"],
    ["finance"] = cfg["Services:Finance"],
    ["profile"] = cfg["Services:Profile"],
    ["assistant"] = cfg["Services:Assistant"],
    ["backoffice"] = cfg["Services:Backoffice"],
    ["realtime"] = cfg["Services:Realtime"],
};
foreach (var (name, url) in services)
    if (string.IsNullOrWhiteSpace(url)) throw new InvalidOperationException($"Services:{name[..1].ToUpperInvariant()}{name[1..]} is required.");

(string Cluster, string[] Paths)[] map =
[
    ("wallet", ["/v1/wallet", "/v1/transfers", "/v1/recharges", "/v1/beneficiaries"]),
    ("finance", ["/v1/movements", "/v1/categories", "/v1/budgets", "/v1/goals", "/v1/cash", "/v1/analytics"]),
    ("profile", ["/v1/profile", "/v1/me"]),
    ("assistant", ["/v1/assistant"]),
    ("workers", ["/v1/notifications", "/v1/reports", "/v1/projections", "/v1/outbox"]),
    ("backoffice", ["/v1/admin", "/v1/support", "/v1/financial-operations", "/v1/financial-adjustments", "/v1/reversals", "/v1/reconciliation"]),
    ("realtime", ["/ws", "/v1/realtime"]),
];

var routes = map.SelectMany(m => m.Paths.Select(p => new RouteConfig
{
    RouteId = $"{m.Cluster}:{p}",
    ClusterId = m.Cluster,
    Match = new RouteMatch { Path = $"{p}/{{**rest}}" },
}));
var clusters = services.Select(s => new ClusterConfig
{
    ClusterId = s.Key,
    Destinations = new Dictionary<string, DestinationConfig> { ["d"] = new() { Address = s.Value!.TrimEnd('/') + "/" } },
    HttpRequest = new Yarp.ReverseProxy.Forwarder.ForwarderRequestConfig { ActivityTimeout = TimeSpan.FromMinutes(5) },
}).ToList();

var oidcCache = new ConcurrentDictionary<string, OidcToken>();
var useIdentityTokens = cfg.GetValue("Gateway:IdentityTokens", true);
GoogleCredential? adc = null;

async Task<string> GetIdentityTokenAsync(string audience)
{
    adc ??= await GoogleCredential.GetApplicationDefaultAsync();
    var oidc = oidcCache.GetValueOrDefault(audience);
    if (oidc is null)
    {
        oidc = await adc.GetOidcTokenAsync(OidcTokenOptions.FromTargetAudience(audience));
        oidcCache[audience] = oidc;
    }
    return await oidc.GetAccessTokenAsync();
}

// Readiness = upstream services reachable (they probe Spanner/Firestore themselves).
builder.Services.AddHttpClient("upstream-health", c => c.Timeout = TimeSpan.FromSeconds(3));
builder.Services.AddSingleton(new GatewayUpstreams(
    services.ToDictionary(s => s.Key, s => s.Value!), useIdentityTokens));
builder.Services.AddHealthChecks()
    .AddCheck<UpstreamReadinessCheck>("upstreams", tags: ["ready"]);

builder.Services.AddReverseProxy()
    .LoadFromMemory(routes.ToList(), clusters)
    .AddTransforms(ctx =>
    {
        var audience = clusters.First(c => c.ClusterId == ctx.Route.ClusterId).Destinations!["d"].Address.TrimEnd('/');
        ctx.AddRequestTransform(async t =>
        {
            var headers = t.ProxyRequest.Headers;
            foreach (var h in headers.Where(h => h.Key.StartsWith("X-Demo-", StringComparison.OrdinalIgnoreCase)).Select(h => h.Key).ToList())
                headers.Remove(h);
            headers.Remove("X-Serverless-Authorization");

            // WebSocket from the browser: JWT travels as ?access_token=
            var q = t.HttpContext.Request.Query;
            if (t.HttpContext.Request.Path.StartsWithSegments("/ws") && q.TryGetValue("access_token", out var jwt) && !headers.Contains("Authorization"))
            {
                headers.TryAddWithoutValidation("Authorization", $"Bearer {jwt}");
                t.Query.Collection.Remove("access_token"); // el JWT no debe viajar al servicio por query string
            }

            if (useIdentityTokens)
                headers.TryAddWithoutValidation("X-Serverless-Authorization", $"Bearer {await GetIdentityTokenAsync(audience)}");
        });
    });

var origins = (cfg["Cors:AllowedOrigins"] ?? "http://localhost:3000,http://localhost:4200,http://localhost:5173,http://localhost:8081")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(origins)
    .AllowAnyHeader().AllowAnyMethod()
    .WithExposedHeaders("Idempotent-Replayed", "X-Request-Id", "Retry-After", "X-Next-Cursor")
    .SetPreflightMaxAge(TimeSpan.FromHours(1))));

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
    {
        // Behind Cloud Run / reverse proxies: trusted edge proxies append the connecting client IP
        // at the end of X-Forwarded-For. Taking the rightmost valid IP prevents header spoofing / evasion.
        var clientIp = GetClientIp(ctx);
        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = cfg.GetValue("RateLimit:PerMinute", 600), Window = TimeSpan.FromMinutes(1), QueueLimit = 0,
        });
    });
});

var app = builder.Build();

app.UseCors();
app.UseRateLimiter();
app.UseWebSockets();

app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["Cache-Control"] = "no-store";
    await next();
});

app.MapGet("/", () => Results.Ok(new { service = "nequi-gateway", status = "ok", routes = map.SelectMany(m => m.Paths).Order() }));
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false,
    ResponseWriter = HealthResponse.Write,
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = r => r.Tags.Contains("ready"),
    ResponseWriter = HealthResponse.Write,
    ResultStatusCodes = { [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable },
});
app.MapReverseProxy();
app.Run();

static string GetClientIp(HttpContext ctx)
{
    var xff = ctx.Request.Headers["X-Forwarded-For"].ToString();
    if (!string.IsNullOrWhiteSpace(xff))
    {
        var ips = xff.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (ips.Length > 0 && System.Net.IPAddress.TryParse(ips[^1], out _))
            return ips[^1];
    }
    return ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}

public partial class Program { }

namespace Nequi.Gateway
{
    /// <summary>Stable marker for <c>WebApplicationFactory</c> (route-map tests).</summary>
    public sealed class GatewayMarker;
}
