using Nequi.Wallet.DTOs;
using Nequi.Wallet.Exceptions;
using Nequi.Wallet.Interfaces;

namespace Nequi.Wallet.Services;

/// <summary>
/// Implementación simulada de IWalletService para validación de contratos API y pruebas de integración.
/// Estado: MOCK — en la fase productiva se reemplaza por SpannerWalletService que lee de Cloud Spanner.
/// PERSISTENCIA PENDIENTE (TO-BE): requiere DDL físico de database/spanner/01_schema.sql (tabla wallets / accounts).
///
/// LIMITACIÓN DEL MOCK: el saldo es fijo ($1.250.000) y no refleja movimientos reales.
/// La autoridad financiera real (Spanner ledger) es TO-BE.
/// </summary>
public sealed class MockWalletService : IWalletService
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
            AvailableBalance: 1_250_000.00m,
            AvailableBalanceCents: 125_000_000L,
            Currency: "COP",
            AsOfTimestamp: DateTimeOffset.UtcNow,
            SourceAuthority: "MOCK_IN_MEMORY"
        );

        return Task.FromResult(balance);
    }
}
