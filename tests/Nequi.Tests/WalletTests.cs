using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Nequi.Wallet.DTOs;
using Nequi.Wallet.Exceptions;
using Nequi.Wallet.Services;

namespace Nequi.Tests;

public sealed class WalletTests
{
    [Fact]
    public async Task WalletBalance_ShouldIdentifyMockAsSource()
    {
        var service = new MockWalletService();

        var result = await service.GetOfficialBalanceAsync(
            $"client-{Guid.NewGuid():N}");

        Assert.Equal("MOCK_IN_MEMORY", result.SourceAuthority);
        Assert.Equal("COP", result.Currency);
    }

    [Fact]
    public async Task Transfer_ShouldRejectAmountAboveIndividualLimit()
    {
        var service = new MockTransferService();

        var request = new CreateTransferRequestDto(
            DestinationTransferCode: "TRF-LAU-0002",
            Amount: 2_000_001m,
            Description: "Prueba límite individual",
            Currency: "COP"
        );

        await Assert.ThrowsAsync<TransferLimitExceededException>(() =>
            service.CreateTransferAsync(
                $"client-{Guid.NewGuid():N}",
                Guid.NewGuid().ToString(),
                request));
    }

    [Fact]
    public async Task Transfer_ShouldRejectInsufficientFunds()
    {
        var service = new MockTransferService();

        var request = new CreateTransferRequestDto(
            DestinationTransferCode: "TRF-LAU-0002",
            Amount: 1_500_000m,
            Description: "Prueba saldo insuficiente",
            Currency: "COP"
        );

        await Assert.ThrowsAsync<InsufficientFundsException>(() =>
            service.CreateTransferAsync(
                $"client-{Guid.NewGuid():N}",
                Guid.NewGuid().ToString(),
                request));
    }

    [Fact]
    public async Task Transfer_ShouldRejectAccessFromAnotherClient()
    {
        var service = new MockTransferService();
        var ownerClientId = $"owner-{Guid.NewGuid():N}";

        var request = new CreateTransferRequestDto(
            DestinationTransferCode: "TRF-LAU-0002",
            Amount: 50_000m,
            Description: "Prueba autorización",
            Currency: "COP"
        );

        var transfer = await service.CreateTransferAsync(
            ownerClientId,
            Guid.NewGuid().ToString(),
            request);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.GetTransferByIdAsync(
                $"other-{Guid.NewGuid():N}",
                transfer.TransferId));
    }

    [Fact]
    public async Task Transfer_ShouldRejectWhenDailyAccumulatedLimitIsExceeded()
    {
        var service = new MockTransferService();
        var clientId = $"daily-{Guid.NewGuid():N}";

        await new MockRechargeService().CreateRechargeAsync(
            clientId,
            Guid.NewGuid().ToString(),
            new CreateRechargeRequestDto(4_000_000m, "SIMULATED_PSE", "COP"));

        for (var i = 0; i < 4; i++)
        {
            var request = new CreateTransferRequestDto(
                DestinationTransferCode: "TRF-LAU-0002",
                Amount: 1_250_000m,
                Description: $"Transferencia diaria {i + 1}",
                Currency: "COP"
            );

            await service.CreateTransferAsync(
                clientId,
                Guid.NewGuid().ToString(),
                request);
        }

        var exceedingRequest = new CreateTransferRequestDto(
            DestinationTransferCode: "TRF-LAU-0002",
            Amount: 1m,
            Description: "Supera límite diario",
            Currency: "COP"
        );

        await Assert.ThrowsAsync<TransferLimitExceededException>(() =>
            service.CreateTransferAsync(
                clientId,
                Guid.NewGuid().ToString(),
                exceedingRequest));
    }

    [Fact]
    public async Task AcademicTransfer_UpdatesBothWalletBalances()
    {
        var origin = $"origin-{Guid.NewGuid():N}";
        var transfer = await new MockTransferService().CreateTransferAsync(
            origin,
            Guid.NewGuid().ToString(),
            new CreateTransferRequestDto("TRF-DEST-0001", 50_000m, "Prueba", "COP"));
        var wallet = new MockWalletService();

        var originBalance = await wallet.GetOfficialBalanceAsync(origin);
        var destinationBalance = await wallet.GetOfficialBalanceAsync(transfer.DestinationClientId);

        Assert.Equal(1_200_000m, originBalance.AvailableBalance);
        Assert.Equal(1_300_000m, destinationBalance.AvailableBalance);
    }

    [Fact]
    public async Task AcademicRecharge_IncreasesWalletBalance()
    {
        var clientId = $"recharge-{Guid.NewGuid():N}";
        var before = await new MockWalletService().GetOfficialBalanceAsync(clientId);

        await new MockRechargeService().CreateRechargeAsync(
            clientId,
            Guid.NewGuid().ToString(),
            new CreateRechargeRequestDto(75_000m, "SIMULATED_PSE", "COP"));

        var after = await new MockWalletService().GetOfficialBalanceAsync(clientId);

        Assert.Equal(1_250_000m, before.AvailableBalance);
        Assert.Equal(1_325_000m, after.AvailableBalance);
    }
}

public sealed class WalletIntegrationTests : IDisposable
{
    private readonly WebApplicationFactory<Nequi.Wallet.WalletMarker> _factory;

    public WalletIntegrationTests()
    {
        _factory = new WebApplicationFactory<Nequi.Wallet.WalletMarker>()
            .WithWebHostBuilder(b =>
            {
                foreach (var (k, v) in Env.Config)
                    b.UseSetting(k, v);
            });
    }

    public void Dispose() => _factory.Dispose();

    private static HttpRequestMessage PostJson(string path, object body, string? idempotencyKey = null)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(body)
        };
        if (!string.IsNullOrWhiteSpace(idempotencyKey))
            req.Headers.Add("Idempotency-Key", idempotencyKey);
        return req;
    }

    // 1. POST /v1/transfers sin Idempotency-Key -> HTTP 400
    [Fact]
    public async Task Transfers_Post_WithoutIdempotencyKey_Returns400()
    {
        var client = _factory.CreateClient().As("client-1");

        var request = new CreateTransferRequestDto(
            DestinationTransferCode: "TRF-LAU-0002",
            Amount: 50_000m,
            Description: "Test",
            Currency: "COP"
        );

        var response = await client.SendAsync(PostJson("/v1/transfers", request));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("idempotency_key_required", problem.GetProperty("code").GetString());
    }

    // 2. POST /v1/recharges sin Idempotency-Key -> HTTP 400
    [Fact]
    public async Task Recharges_Post_WithoutIdempotencyKey_Returns400()
    {
        var client = _factory.CreateClient().As("client-1");

        var request = new CreateRechargeRequestDto(
            Amount: 50_000m,
            PaymentMethod: "SIMULATED_PSE",
            Currency: "COP"
        );

        var response = await client.SendAsync(PostJson("/v1/recharges", request));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("idempotency_key_required", problem.GetProperty("code").GetString());
    }

    // 3. POST /v1/transfers con misma Idempotency-Key y mismo body -> replay
    [Fact]
    public async Task Transfers_Post_SameIdempotencyKeyAndBody_Replays()
    {
        var client = _factory.CreateClient().As("client-1");
        var key = Guid.NewGuid().ToString();

        var request = new CreateTransferRequestDto(
            DestinationTransferCode: "TRF-LAU-0002",
            Amount: 50_000m,
            Description: "Idempotency replay test",
            Currency: "COP"
        );

        // First request
        var r1 = await client.SendAsync(PostJson("/v1/transfers", request, key));
        Assert.Equal(HttpStatusCode.Created, r1.StatusCode);
        var body1 = await r1.Content.ReadFromJsonAsync<JsonElement>();
        var transferId1 = body1.GetProperty("transferId").GetString();

        // Second request with same key and body
        var r2 = await client.SendAsync(PostJson("/v1/transfers", request, key));
        Assert.Equal(HttpStatusCode.Created, r2.StatusCode);
        Assert.Equal("true", r2.Headers.GetValues("Idempotent-Replayed").Single());
        var body2 = await r2.Content.ReadFromJsonAsync<JsonElement>();
        var transferId2 = body2.GetProperty("transferId").GetString();

        // Should replay the same response (same transfer ID)
        Assert.Equal(transferId1, transferId2);
    }

    // 4. POST /v1/transfers con misma Idempotency-Key y body diferente -> HTTP 409
    [Theory]
    [InlineData("/v1/transfers", 1.999)]
    [InlineData("/v1/recharges", 1000.001)]
    public async Task Post_AmountWithMoreThanTwoDecimals_Returns422(string path, double amount)
    {
        var client = _factory.CreateClient().As("client-1");
        var amountValue = (decimal)amount;
        HttpRequestMessage request = path == "/v1/transfers"
            ? PostJson(path, new CreateTransferRequestDto("TRF-LAU-0002", amountValue, null, "COP"), Guid.NewGuid().ToString())
            : PostJson(path, new CreateRechargeRequestDto(amountValue, "SIMULATED_PSE", "COP"), Guid.NewGuid().ToString());

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task Transfers_Post_SameIdempotencyKeyDifferentBody_Returns409()
    {
        var client = _factory.CreateClient().As("client-1");
        var key = Guid.NewGuid().ToString();

        var request1 = new CreateTransferRequestDto(
            DestinationTransferCode: "TRF-LAU-0002",
            Amount: 50_000m,
            Description: "First request",
            Currency: "COP"
        );

        var request2 = new CreateTransferRequestDto(
            DestinationTransferCode: "TRF-OTH-0003",
            Amount: 60_000m,
            Description: "Different request",
            Currency: "COP"
        );

        // First request
        var r1 = await client.SendAsync(PostJson("/v1/transfers", request1, key));
        Assert.Equal(HttpStatusCode.Created, r1.StatusCode);

        // Second request with same key but different body
        var r2 = await client.SendAsync(PostJson("/v1/transfers", request2, key));
        Assert.Equal(HttpStatusCode.Conflict, r2.StatusCode);
        var problem = await r2.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("idempotency_key_conflict", problem.GetProperty("code").GetString());
    }

    // 5. Receipt de transferencia: un CLIENTE diferente al propietario intenta consultar -> HTTP 403
    [Fact]
    public async Task TransferReceipt_OtherClient_Returns403()    {
        var ownerClient = _factory.CreateClient().As("owner-client");
        var otherClient = _factory.CreateClient().As("other-client");
        var key = Guid.NewGuid().ToString();

        var request = new CreateTransferRequestDto(
            DestinationTransferCode: "TRF-LAU-0002",
            Amount: 50_000m,
            Description: "Receipt access test",
            Currency: "COP"
        );

        // Owner creates transfer
        var createResponse = await ownerClient.SendAsync(PostJson("/v1/transfers", request, key));
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var transfer = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var transferId = transfer.GetProperty("transferId").GetString();

        // Other client tries to get receipt
        var receiptResponse = await otherClient.GetAsync($"/v1/transfers/{transferId}/receipt");
        Assert.Equal(HttpStatusCode.Forbidden, receiptResponse.StatusCode);
        var problem = await receiptResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("FORBIDDEN", problem.GetProperty("code").GetString());
    }

    [Fact]
    public async Task FinancialOperations_UpdateBalanceThroughHttp()
    {
        var clientId = $"http-wallet-{Guid.NewGuid():N}";
        var client = _factory.CreateClient().As(clientId);
        var walletBefore = await client.GetFromJsonAsync<JsonElement>("/v1/wallet/balance");

        var transfer = new CreateTransferRequestDto("TRF-HTTP-0001", 100_000m, "Flujo MVP", "COP");
        var transferResponse = await client.SendAsync(PostJson("/v1/transfers", transfer, Guid.NewGuid().ToString()));
        Assert.Equal(HttpStatusCode.Created, transferResponse.StatusCode);

        var recharge = new CreateRechargeRequestDto(50_000m, "SIMULATED_PSE", "COP");
        var rechargeResponse = await client.SendAsync(PostJson("/v1/recharges", recharge, Guid.NewGuid().ToString()));
        Assert.Equal(HttpStatusCode.Created, rechargeResponse.StatusCode);

        var walletAfter = await client.GetFromJsonAsync<JsonElement>("/v1/wallet/balance");
        Assert.Equal(125_000_000, walletBefore.GetProperty("availableBalanceCents").GetInt64());
        Assert.Equal(120_000_000, walletAfter.GetProperty("availableBalanceCents").GetInt64());
    }
}

public sealed class RechargePolicyTests
{
    private static WebApplicationFactory<Nequi.Wallet.WalletMarker> Wallet(bool allowSimulated) =>
        new WebApplicationFactory<Nequi.Wallet.WalletMarker>().WithWebHostBuilder(b =>
        {
            foreach (var (k, v) in Env.Config)
                b.UseSetting(k, v);
            b.UseSetting("Recharges:AllowSimulatedPaymentMethods", allowSimulated ? "true" : "false");
        });

    private static HttpRequestMessage Recharge(string paymentMethod, string idempotencyKey) =>
        new(HttpMethod.Post, "/v1/recharges")
        {
            Content = JsonContent.Create(new CreateRechargeRequestDto(50_000m, paymentMethod, "COP")),
            Headers = { { "Idempotency-Key", idempotencyKey } },
        };

    [Fact]
    public async Task SimulatedMethod_IsAccepted_WhenEnvironmentExplicitlyAllowsIt()
    {
        using var factory = Wallet(allowSimulated: true);
        var client = factory.CreateClient().As("policy-allowed");

        var response = await client.SendAsync(Recharge("SIMULATED_PSE", Guid.NewGuid().ToString()));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task SimulatedMethod_IsRejectedByDefault_WithExplicitProblemCode()
    {
        using var factory = Wallet(allowSimulated: false);
        var client = factory.CreateClient().As("policy-denied");

        var response = await client.SendAsync(Recharge("SIMULATED_PSE", Guid.NewGuid().ToString()));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("SIMULATED_METHOD_NOT_ALLOWED", problem.GetProperty("code").GetString());
    }

    [Fact]
    public void Policy_DeniesSimulatedByDefault_AndAllowsRealMethods()
    {
        var denyAll = new RechargePolicy(new ConfigurationBuilder().Build());
        Assert.False(denyAll.AllowSimulatedPaymentMethods);
        Assert.False(denyAll.IsPaymentMethodAllowed("SIMULATED_PSE"));
        Assert.False(denyAll.IsPaymentMethodAllowed(null));
        Assert.False(denyAll.IsPaymentMethodAllowed(""));
        Assert.True(denyAll.IsPaymentMethodAllowed("PSE"));

        var allow = new RechargePolicy(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Recharges:AllowSimulatedPaymentMethods"] = "true",
            })
            .Build());
        Assert.True(allow.IsPaymentMethodAllowed("SIMULATED_CARD"));
    }
}
