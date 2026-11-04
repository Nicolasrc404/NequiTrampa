using Nequi.Wallet.DTOs;
using Nequi.Wallet.Exceptions;
using Nequi.Wallet.Services;

namespace Nequi.Tests;

public sealed class AcademicDemoRecipientTests
{
    [Fact]
    public async Task ActiveDemoRecipientReceivesTheExactAmount()
    {
        var store = new AcademicWalletStore();
        var service = new MockTransferService(store);
        var origin = "academic-laura-test";

        var transfer = await service.CreateTransferAsync(
            origin,
            "recipient-test-key",
            new CreateTransferRequestDto("CARL-9941", 10_000m, "Prueba", "COP"));

        Assert.Equal("academic-carlos", transfer.DestinationClientId);
        Assert.Equal(1_240_000m, store.GetBalanceCents(origin) / 100m);
        Assert.Equal(1_260_000m, store.GetBalanceCents("academic-carlos") / 100m);
    }

    [Fact]
    public async Task UnknownRecipientIsRejectedWithoutChangingBalances()
    {
        var store = new AcademicWalletStore();
        var service = new MockTransferService(store);
        var origin = "academic-unknown-recipient-test";

        await Assert.ThrowsAsync<DestinationNotFoundException>(() => service.CreateTransferAsync(
            origin,
            "unknown-recipient-key",
            new CreateTransferRequestDto("NO-EXISTE-0000", 10_000m, "Prueba", "COP")));

        Assert.Equal(0, store.GetTransfers(origin, 1, 20).Count);
        Assert.Equal(1_250_000m, store.GetBalanceCents(origin) / 100m);
    }

    [Fact]
    public async Task InactiveRecipientIsRejectedWithoutChangingBalances()
    {
        var store = new AcademicWalletStore();
        var service = new MockTransferService(store);
        var origin = "academic-inactive-recipient-test";

        var exception = await Assert.ThrowsAsync<InactiveDestinationException>(() => service.CreateTransferAsync(
            origin,
            "inactive-recipient-key",
            new CreateTransferRequestDto("ANA-3092", 10_000m, "Prueba", "COP")));

        Assert.Equal("DESTINATION_ACCOUNT_INACTIVE", exception.ErrorCode);
        Assert.Empty(store.GetTransfers(origin, 1, 20));
        Assert.Equal(1_250_000m, store.GetBalanceCents(origin) / 100m);
    }

    [Fact]
    public async Task SelfTransferIsRejectedWithoutChangingBalances()
    {
        var store = new AcademicWalletStore();
        var service = new MockTransferService(store);

        var exception = await Assert.ThrowsAsync<SelfTransferException>(() => service.CreateTransferAsync(
            "academic-laura",
            "self-transfer-key",
            new CreateTransferRequestDto("LAUR-5120", 10_000m, "Prueba", "COP")));

        Assert.Equal("SELF_TRANSFER_NOT_ALLOWED", exception.ErrorCode);
        Assert.Empty(store.GetTransfers("academic-laura", 1, 20));
        Assert.Equal(1_250_000m, store.GetBalanceCents("academic-laura") / 100m);
    }
}
