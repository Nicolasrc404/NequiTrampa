using Nequi.Wallet.DTOs;

namespace Nequi.Wallet.Interfaces;

/// <summary>
/// Contrato de servicio para operaciones de billetera.
/// Implementación actual: MOCK (MockWalletService). La consulta autoritativa de saldo será desde Cloud Spanner (TO-BE).
/// </summary>
public interface IWalletService
{
    /// <summary>
    /// Obtiene los detalles de la billetera digital vinculada al cliente autenticado.
    /// </summary>
    Task<WalletResponseDto> GetWalletByClientIdAsync(string clientId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene el saldo digital simulado (MOCK). En producción leerá directamente desde Cloud Spanner (TO-BE).
    /// </summary>
    Task<WalletBalanceResponseDto> GetOfficialBalanceAsync(string clientId, CancellationToken cancellationToken = default);
}
