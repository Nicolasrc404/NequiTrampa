using NequiTrampa.WalletApi.DTOs;

namespace NequiTrampa.WalletApi.Interfaces;

/// <summary>
/// Contrato de servicio para operaciones de billetera y consulta autoritativa de saldo en Spanner.
/// </summary>
public interface IWalletService
{
    /// <summary>
    /// Obtiene los detalles de la billetera digital vinculada al cliente autenticado.
    /// </summary>
    Task<WalletResponseDto> GetWalletByClientIdAsync(string clientId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene el saldo digital oficial y vigente directamente desde Cloud Spanner.
    /// </summary>
    Task<WalletBalanceResponseDto> GetOfficialBalanceAsync(string clientId, CancellationToken cancellationToken = default);
}
