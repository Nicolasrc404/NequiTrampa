using System.Collections.Concurrent;
using System.Text.Json;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Nequi.Gateway.Health;

/// <summary>Upstream services the gateway forwards to, plus whether Cloud Run identity tokens are required.</summary>
public sealed record GatewayUpstreams(IReadOnlyDictionary<string, string> Services, bool IdentityTokens);

/// <summary>
/// Readiness of the gateway's real dependencies: the business services it proxies.
/// The gateway owns no Spanner/Firestore connection; each upstream /health/ready performs
/// its own Spanner/Firestore probes, so this check is transitive and deliberately lightweight.
/// </summary>
public sealed class UpstreamReadinessCheck(IHttpClientFactory httpFactory, GatewayUpstreams upstreams) : IHealthCheck
{
    private static readonly ConcurrentDictionary<string, OidcToken> Tokens = new();
    private static readonly Lazy<Task<GoogleCredential>> Adc =
        new(() => GoogleCredential.GetApplicationDefaultAsync());

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromSeconds(5));

        var client = httpFactory.CreateClient("upstream-health");
        var failures = new ConcurrentBag<string>();

        await Parallel.ForEachAsync(upstreams.Services, cts.Token, async (service, token) =>
        {
            try
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Get, service.Value.TrimEnd('/') + "/health/ready");

                if (upstreams.IdentityTokens)
                {
                    var audience = service.Value.TrimEnd('/');
                    if (!Tokens.TryGetValue(audience, out var oidc))
                    {
                        var credential = await Adc.Value.WaitAsync(token);
                        oidc = await credential.GetOidcTokenAsync(
                            OidcTokenOptions.FromTargetAudience(audience), token);
                        Tokens[audience] = oidc;
                    }
                    request.Headers.TryAddWithoutValidation(
                        "Authorization", $"Bearer {await oidc.GetAccessTokenAsync(cancellationToken: token)}");
                }

                using var response = await client.SendAsync(request, token);
                if (!response.IsSuccessStatusCode) failures.Add(service.Key);
            }
            catch
            {
                failures.Add(service.Key);
            }
        });

        return failures.IsEmpty
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy($"unreachable: {string.Join(",", failures.Order())}");
    }
}

/// <summary>JSON writer shared by /health/live and /health/ready (no internals in the response).</summary>
public static class HealthResponse
{
    public static Task Write(HttpContext ctx, HealthReport report)
    {
        ctx.Response.ContentType = "application/json";
        return ctx.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            status = report.Status.ToString(),
            checks = report.Entries.ToDictionary(e => e.Key, e => e.Value.Status.ToString()),
        }, JsonSerializerOptions.Web));
    }
}
