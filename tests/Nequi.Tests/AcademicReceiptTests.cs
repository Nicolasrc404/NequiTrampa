using Nequi.Wallet.DTOs;
using Nequi.Wallet.Services;

namespace Nequi.Tests;

public sealed class AcademicReceiptTests
{
    [Fact]
    public async Task ReceiptIdentifiersRemainStableAcrossReads()
    {
        var service = new MockTransferService(new AcademicWalletStore());
        var transfer = await service.CreateTransferAsync(
            "academic-receipt-origin",
            "receipt-transfer-key",
            new CreateTransferRequestDto("CARL-9941", 10_000m, "Comprobante", "COP"));

        var first = await service.GetTransferReceiptAsync("academic-receipt-origin", transfer.TransferId);
        var second = await service.GetTransferReceiptAsync("academic-receipt-origin", transfer.TransferId);

        Assert.Equal(first.ReceiptNumber, second.ReceiptNumber);
        Assert.Equal(first.AuthorizationCode, second.AuthorizationCode);
        Assert.Equal(first.CompletedAt, second.CompletedAt);
    }
}
