using Nequi.Wallet.DTOs;

namespace Nequi.Wallet.Interfaces;

/// <summary>
/// Contrato de servicio para transferencias monetarias atómicas con validación estricta de idempotencia.
/// </summary>
public interface ITransferService
{
    /// <summary>
    /// Ejecuta una transferencia transaccional en Cloud Spanner verificando saldo, límites e idempotencia.
    /// </summary>
    Task<TransferResponseDto> CreateTransferAsync(
        string originClientId, 
        string idempotencyKey, 
        CreateTransferRequestDto request, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Lista el historial de transferencias propias del cliente autenticado.
    /// </summary>
    Task<IReadOnlyList<TransferResponseDto>> GetTransfersByClientIdAsync(
        string clientId, 
        int page = 1, 
        int pageSize = 20, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene el detalle de una transferencia propia.
    /// </summary>
    Task<TransferResponseDto> GetTransferByIdAsync(
        string clientId, 
        string transferId, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Genera u obtiene el comprobante formal de la transferencia.
    /// </summary>
    Task<TransferReceiptDto> GetTransferReceiptAsync(
        string clientId, 
        string transferId, 
        CancellationToken cancellationToken = default);
}
