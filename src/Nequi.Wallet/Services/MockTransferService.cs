using Nequi.Wallet.DTOs;
using Nequi.Wallet.Exceptions;
using Nequi.Wallet.Interfaces;

namespace Nequi.Wallet.Services;

/// <summary>Academic transfer service backed by the atomic local wallet store.</summary>
public sealed class MockTransferService(AcademicWalletStore? store = null) : ITransferService
{
    private readonly AcademicWalletStore _store = store ?? AcademicWalletStore.Shared;

    public Task<TransferResponseDto> CreateTransferAsync(string originClientId, string idempotencyKey, CreateTransferRequestDto request, CancellationToken cancellationToken = default)
    {
        if (request.DestinationTransferCode == "TRF-INACTIVE-0000") throw new InactiveDestinationException();
        return Task.FromResult(_store.CreateTransfer(originClientId, request));
    }

    public Task<IReadOnlyList<TransferResponseDto>> GetTransfersByClientIdAsync(string clientId, int page = 1, int pageSize = 20, CancellationToken cancellationToken = default) =>
        Task.FromResult(_store.GetTransfers(clientId, page, pageSize));

    public Task<TransferResponseDto> GetTransferByIdAsync(string clientId, string transferId, CancellationToken cancellationToken = default)
    {
        var transfer = _store.FindTransfer(transferId)
            ?? throw new WalletNotFoundException($"La transferencia con identificador '{transferId}' no fue encontrada.");
        EnsureParticipant(clientId, transfer);
        return Task.FromResult(transfer);
    }

    public Task<TransferReceiptDto> GetTransferReceiptAsync(string clientId, string transferId, CancellationToken cancellationToken = default)
    {
        var transfer = _store.FindTransfer(transferId)
            ?? throw new WalletNotFoundException($"No se encontró la transferencia '{transferId}' para generar el comprobante.");
        EnsureParticipant(clientId, transfer);
        var receipt = new TransferReceiptDto(
            $"REC-{DateTime.UtcNow:yyyyMMdd}-{transferId[..6].ToUpperInvariant()}", transfer.TransferId,
            MaskTransferCode(transfer.OriginClientId), MaskTransferCode(transfer.DestinationTransferCode),
            transfer.Amount, transfer.Currency, transfer.Timestamp,
            $"AUTH-{Guid.NewGuid():N}"[..10].ToUpperInvariant(), transfer.Status);
        return Task.FromResult(receipt);
    }

    private static void EnsureParticipant(string clientId, TransferResponseDto transfer)
    {
        if (transfer.OriginClientId != clientId && transfer.DestinationClientId != clientId)
            throw new UnauthorizedAccessException("No tiene autorización para acceder a una transferencia ajena.");
    }

    private static string MaskTransferCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return "***";
        if (code.Length >= 7) return $"{code[..3]}***{code[^4..]}";
        if (code.Length >= 4) return $"{code[..1]}***{code[^2..]}";
        return $"{code}***";
    }
}
