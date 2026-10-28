using NequiTrampa.WalletApi.DTOs;
using NequiTrampa.WalletApi.Errors;
using NequiTrampa.WalletApi.Interfaces;

namespace NequiTrampa.WalletApi.Services;

/// <summary>
/// Implementación simulada de IWalletService para pruebas de contrato y validación de APIs.
/// En la siguiente fase se reemplaza por SpannerWalletService.
/// </summary>
public class MockWalletService : IWalletService
{
    public Task<WalletResponseDto> GetWalletByClientIdAsync(string clientId, CancellationToken cancellationToken = default)
    {
        var wallet = new WalletResponseDto(
            WalletId: $"wlt_{clientId[..Math.Min(8, clientId.Length)]}",
            ClientId: clientId,
            PhoneNumber: "3001234567",
            Status: "ACTIVE",
            Currency: "COP",
            CreatedAt: DateTimeOffset.UtcNow.AddMonths(-3),
            UpdatedAt: DateTimeOffset.UtcNow
        );

        return Task.FromResult(wallet);
    }

    public Task<WalletBalanceResponseDto> GetOfficialBalanceAsync(string clientId, CancellationToken cancellationToken = default)
    {
        var balance = new WalletBalanceResponseDto(
            WalletId: $"wlt_{clientId[..Math.Min(8, clientId.Length)]}",
            ClientId: clientId,
            AvailableBalance: 1250000.00m,
            AvailableBalanceCents: 125000000,
            Currency: "COP",
            AsOfTimestamp: DateTimeOffset.UtcNow,
            SourceAuthority: "Cloud Spanner"
        );

        return Task.FromResult(balance);
    }
}
