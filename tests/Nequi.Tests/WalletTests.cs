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
            DestinationPhoneNumber: "3001234567",
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
            DestinationPhoneNumber: "3001234567",
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
            DestinationPhoneNumber: "3001234567",
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

        for (var i = 0; i < 4; i++)
        {
            var request = new CreateTransferRequestDto(
                DestinationPhoneNumber: "3001234567",
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
            DestinationPhoneNumber: "3001234567",
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
}