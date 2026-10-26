using System.Net;
using System.Text.Json;

namespace Nequi.Tests;

/// <summary>
/// The gateway exposes only the public BFF routes. Phase 4 must route every new domain to the
/// service that owns it: Beneficiaries to wallet-api, the rest to core-api (finance).
/// </summary>
public sealed class GatewayRouteTests : IDisposable
{
    private readonly Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Nequi.Gateway.GatewayMarker> _factory = Env.Gateway();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task RouteMap_IncludesAllPhase4Domains()
    {
        using var http = _factory.CreateClient();

        var response = await http.GetAsync("/");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var routes = (await Phase4.BodyAsync(response)).GetProperty("routes")
            .EnumerateArray()
            .Select(r => r.GetString()!)
            .ToHashSet(StringComparer.Ordinal);

        Assert.Contains("/v1/beneficiaries", routes);
        Assert.Contains("/v1/categories", routes);
        Assert.Contains("/v1/budgets", routes);
        Assert.Contains("/v1/goals", routes);
        Assert.Contains("/v1/cash", routes);
        Assert.Contains("/v1/analytics", routes);

        Assert.Contains("/v1/wallet", routes);
        Assert.Contains("/v1/transfers", routes);
        Assert.Contains("/v1/recharges", routes);
        Assert.Contains("/v1/movements", routes);
        Assert.Contains("/v1/profile", routes);
        Assert.Contains("/v1/assistant", routes);
    }

    [Fact]
    public async Task HealthEndpoints_ArePublic()
    {
        using var http = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.OK, (await http.GetAsync("/health/live")).StatusCode);
        var ready = await http.GetAsync("/health/ready");
        Assert.Equal(HttpStatusCode.OK, ready.StatusCode);

        var body = await Phase4.BodyAsync(ready);
        var upstreams = body.GetProperty("upstreams").EnumerateArray()
            .Select(u => u.GetString()!)
            .ToHashSet(StringComparer.Ordinal);
        Assert.Contains("wallet", upstreams);
        Assert.Contains("finance", upstreams);
    }
}
