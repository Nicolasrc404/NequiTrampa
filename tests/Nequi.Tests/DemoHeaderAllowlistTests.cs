using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Nequi.Tests;

public sealed class DemoHeaderAllowlistTests : IDisposable
{
    private readonly WebApplicationFactory<Nequi.Wallet.WalletMarker> _factory =
        new WebApplicationFactory<Nequi.Wallet.WalletMarker>()
            .WithWebHostBuilder(builder =>
            {
                foreach (var (key, value) in Env.Config)
                    builder.UseSetting(key, value);
                builder.UseSetting(
                    "Auth:DemoAllowedUsers",
                    "academic-laura,academic-carlos,academic-sofia,academic-ana");
            });

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task AllowlistedDemoIdentity_IsAuthenticated()
    {
        using var client = _factory.CreateClient().As("academic-laura");

        var response = await client.GetAsync("/v1/wallet/balance");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task DemoIdentityOutsideAllowlist_IsRejected()
    {
        using var client = _factory.CreateClient().As("academic-unknown");

        var response = await client.GetAsync("/v1/wallet/balance");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
