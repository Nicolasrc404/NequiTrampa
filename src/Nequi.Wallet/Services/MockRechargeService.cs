using Nequi.Wallet.DTOs;
using Nequi.Wallet.Interfaces;

namespace Nequi.Wallet.Services;

/// <summary>
/// Implementación simulada de IRechargeService.
/// Estado: MOCK — en la fase productiva se reemplaza por SpannerRechargeService con transacciones
/// atómicas en Spanner y publicación al Transactional Outbox (TO-BE).
/// Idempotencia: delegada al IdempotencyActionFilter (Nequi.Shared → IIdempotencyStore) en la capa MVC.
///
/// LIMITACIÓN DEL MOCK: la recarga crea un registro, pero NO acumula el saldo del cliente
/// (el saldo permanece fijo en MockWalletService). La acreditación real será transaccional
/// con Spanner ledger (TO-BE, pendiente de DDL).
/// </summary>
public sealed class MockRechargeService : IRechargeService
{
    private static readonly List<RechargeResponseDto> Recharges = [];

    public Task<RechargeResponseDto> CreateRechargeAsync(
        string clientId,
        string idempotencyKey,
        CreateRechargeRequestDto request,
        CancellationToken cancellationToken = default)
    {
        // Idempotencia: delegada al IdempotencyActionFilter (Nequi.Shared → IIdempotencyStore).
        // Este servicio no debe duplicar la lógica de idempotencia.

        var recharge = new RechargeResponseDto(
            RechargeId: $"rch_{Guid.NewGuid():N}"[..18],
            ClientId: clientId,
            Amount: request.Amount,
            AmountCents: (long)(request.Amount * 100),
            Currency: request.Currency,
            PaymentMethod: request.PaymentMethod,
            Status: "COMPLETED",
            LedgerOperationId: $"led_op_{Guid.NewGuid():N}"[..18],
            Timestamp: DateTimeOffset.UtcNow
        );

        lock (Recharges) { Recharges.Add(recharge); }

        return Task.FromResult(recharge);
    }

    public Task<IReadOnlyList<RechargeResponseDto>> GetRechargesByClientIdAsync(
        string clientId,
        CancellationToken cancellationToken = default)
    {
        lock (Recharges)
        {
            IReadOnlyList<RechargeResponseDto> list = Recharges
                .Where(r => r.ClientId == clientId)
                .OrderByDescending(r => r.Timestamp)
                .ToList();

            return Task.FromResult(list);
        }
    }
}
