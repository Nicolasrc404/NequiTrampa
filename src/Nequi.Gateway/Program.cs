using System.Collections.Concurrent;
using System.Threading.RateLimiting;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.RateLimiting;
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
    ("wallet", ["/v1/wallet", "/v1/transfers", "/v1/recharges"]),
    ("finance", ["/v1/movements"]),
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
            {
                adc ??= await GoogleCredential.GetApplicationDefaultAsync();
                var oidc = oidcCache.GetValueOrDefault(audience);
                if (oidc is null)
                {
                    oidc = await adc.GetOidcTokenAsync(OidcTokenOptions.FromTargetAudience(audience));
                    oidcCache[audience] = oidc;
                }
                headers.TryAddWithoutValidation("X-Serverless-Authorization", $"Bearer {await oidc.GetAccessTokenAsync()}");
            }
        });
    });

var origins = (cfg["Cors:AllowedOrigins"] ?? "http://localhost:3000,http://localhost:4200,http://localhost:5173")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(origins)
    .AllowAnyHeader().AllowAnyMethod()
    .WithExposedHeaders("Idempotent-Replayed", "X-Request-Id", "Retry-After")
    .SetPreflightMaxAge(TimeSpan.FromHours(1))));

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = cfg.GetValue("RateLimit:PerMinute", 600), Window = TimeSpan.FromMinutes(1), QueueLimit = 0,
        }));
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
app.MapGet("/health/live", () => Results.Ok(new { status = "Healthy" }));
app.MapGet("/health/ready", () => Results.Ok(new { status = "Healthy", upstreams = services.Keys.Order() }));
app.MapReverseProxy();
app.Run();

public partial class Program { }
