namespace Nequi.Wallet.DTOs;

/// <summary>
/// Representación de la billetera digital y su estado autoritativo.
/// </summary>
public record WalletResponseDto(
    string WalletId,
    string ClientId,
    string PhoneNumber,
    string Status, // ACTIVE, BLOCKED, SUSPENDED
    string Currency, // Exclusivamente "COP"
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

/// <summary>
/// Saldo digital oficial emitido directamente por la autoridad financiera (Cloud Spanner).
/// </summary>
public record WalletBalanceResponseDto(
    string WalletId,
    string ClientId,
    decimal AvailableBalance,
    long AvailableBalanceCents,
    string Currency, // COP
    DateTimeOffset AsOfTimestamp,
    string SourceAuthority // "Cloud Spanner"
);
