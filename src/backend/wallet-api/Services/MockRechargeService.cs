using System.Collections.Concurrent;
using NequiTrampa.WalletApi.DTOs;
using NequiTrampa.WalletApi.Errors;
using NequiTrampa.WalletApi.Interfaces;

namespace NequiTrampa.WalletApi.Services;

/// <summary>
/// Implementación simulada de IRechargeService con soporte de idempotencia.
/// </summary>
public class MockRechargeService : IRechargeService
{
    private static readonly ConcurrentDictionary<string, (string PayloadHash, RechargeResponseDto Response)> IdempotencyCache = new();
    private static readonly List<RechargeResponseDto> Recharges = new();

    public Task<RechargeResponseDto> CreateRechargeAsync(
        string clientId, 
        string idempotencyKey, 
        CreateRechargeRequestDto request, 
        CancellationToken cancellationToken = default)
    {
        var payloadHash = $"{clientId}:{request.Amount}:{request.PaymentMethod}:{request.Currency}";
        if (IdempotencyCache.TryGetValue(idempotencyKey, out var existingRecord))
        {
            if (existingRecord.PayloadHash != payloadHash)
            {
                throw new IdempotencyConflictException("La clave de idempotencia enviada ya fue procesada con un monto o método de recarga diferente.");
            }
            return Task.FromResult(existingRecord.Response);
        }

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

        IdempotencyCache.TryAdd(idempotencyKey, (payloadHash, recharge));
        lock (Recharges)
        {
            Recharges.Add(recharge);
        }

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
