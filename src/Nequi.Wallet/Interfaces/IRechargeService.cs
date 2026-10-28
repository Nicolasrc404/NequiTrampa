using Nequi.Wallet.DTOs;

namespace Nequi.Wallet.Interfaces;

/// <summary>
/// Contrato de servicio para recargas simuladas de saldo digital.
/// Implementación actual: MOCK (MockRechargeService). En producción: acreditación en Spanner (TO-BE).
/// </summary>
public interface IRechargeService
{
    /// <summary>
    /// Acredita saldo en la billetera del cliente de manera atómica e idempotente.
    /// </summary>
    Task<RechargeResponseDto> CreateRechargeAsync(
        string clientId, 
        string idempotencyKey, 
        CreateRechargeRequestDto request, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene el historial de recargas simuladas del cliente autenticado.
    /// </summary>
    Task<IReadOnlyList<RechargeResponseDto>> GetRechargesByClientIdAsync(
        string clientId, 
        CancellationToken cancellationToken = default);
}
