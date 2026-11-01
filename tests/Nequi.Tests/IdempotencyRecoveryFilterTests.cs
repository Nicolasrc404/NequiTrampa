using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.DependencyInjection;
using Nequi.Shared.Idempotency;

namespace Nequi.Tests;

/// <summary>
/// Verifies only the filter short-circuit. Durable financial correlation is
/// covered by the Spanner Emulator recovery tests, not by this stub.
/// </summary>
public sealed class IdempotencyRecoveryFilterTests
{
    [Fact]
    public async Task InProgressReservationUsesReadOnlyRecoveryAndSkipsTheAction()
    {
        var store = new InMemoryIdempotencyStore();
        await store.BeginAsync("client-1", "POST:/v1/transfers", "key-1", Hash("{}"), default);
        var recovery = new StubRecoveryHandler(new IdempotencyRecoveryResponse(200, "{\"recovered\":true}"));
        var services = new ServiceCollection()
            .AddSingleton<IIdempotencyStore>(store)
            .AddSingleton<IIdempotencyRecoveryHandler>(recovery)
            .BuildServiceProvider();
        var http = CreateContext(services, "key-1", "{}");
        var filter = new IdempotencyFilter();
        var executions = 0;

        var result = await filter.InvokeAsync(
            EndpointFilterInvocationContext.Create(http),
            _ =>
            {
                executions++;
                return ValueTask.FromResult<object?>(Results.Ok());
            });

        Assert.Equal(200, Assert.IsAssignableFrom<IStatusCodeHttpResult>(result).StatusCode);
        Assert.Equal(0, executions);
        Assert.Equal("true", http.Response.Headers["Idempotent-Recovered"].ToString());
        Assert.Equal("POST:/v1/transfers", recovery.Scope);
    }

    private static DefaultHttpContext CreateContext(IServiceProvider services, string key, string body)
    {
        var http = new DefaultHttpContext { RequestServices = services };
        http.Request.Method = "POST";
        http.Request.Path = "/v1/transfers";
        http.Request.Headers[IdempotencyFilter.HeaderName] = key;
        http.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        http.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("user_id", "client-1")]));
        return http;
    }

    private static string Hash(string body) =>
        IdempotencyRequestHash.Compute(Encoding.UTF8.GetBytes(body));

    private sealed class StubRecoveryHandler(IdempotencyRecoveryResponse response) : IIdempotencyRecoveryHandler
    {
        public string? Scope { get; private set; }

        public Task<IdempotencyRecoveryResponse?> TryRecoverAsync(
            HttpContext http,
            string actorId,
            string scope,
            string idempotencyKey,
            string requestHash,
            CancellationToken ct)
        {
            Scope = scope;
            return Task.FromResult<IdempotencyRecoveryResponse?>(response);
        }
    }
}
