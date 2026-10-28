using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Nequi.Shared.Health;

/// <summary>/health/live = container is up. /health/ready = dependencies (Spanner, Firestore, Pub/Sub) reachable.</summary>
public static class HealthExtensions
{
    public const string ReadyTag = "ready";

    public static IHealthChecksBuilder AddDelegateCheck(this IHealthChecksBuilder b, string name, Func<CancellationToken, Task> probe) =>
        b.Add(new HealthCheckRegistration(name, _ => new DelegateCheck(probe), HealthStatus.Unhealthy, [ReadyTag], TimeSpan.FromSeconds(5)));

    public static IEndpointRouteBuilder MapNequiHealth(this IEndpointRouteBuilder app)
    {
        app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false, ResponseWriter = Write }).AllowAnonymous();
        app.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = r => r.Tags.Contains(ReadyTag),
            ResponseWriter = Write,
            ResultStatusCodes = { [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable },
        }).AllowAnonymous();
        return app;
    }

    private static Task Write(HttpContext ctx, HealthReport report)
    {
        ctx.Response.ContentType = "application/json";
        return ctx.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            status = report.Status.ToString(),
            checks = report.Entries.ToDictionary(e => e.Key, e => e.Value.Status.ToString()),
        }, JsonSerializerOptions.Web));
    }

    private sealed class DelegateCheck(Func<CancellationToken, Task> probe) : IHealthCheck
    {
        public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
        {
            try { await probe(ct); return HealthCheckResult.Healthy(); }
            catch (Exception e) { return HealthCheckResult.Unhealthy(e.GetType().Name); } // no internals in the response
        }
    }
}
