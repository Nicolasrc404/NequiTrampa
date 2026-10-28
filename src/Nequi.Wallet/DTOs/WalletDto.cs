namespace Nequi.Wallet.DTOs;

/// <summary>
/// Representación de la billetera digital y su estado (MOCK).
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
/// Saldo digital simulado en memoria (MOCK).
/// La autoridad financiera real será Cloud Spanner (TO-BE, pendiente de DDL).
/// </summary>
public record WalletBalanceResponseDto(
    string WalletId,
    string ClientId,
    decimal AvailableBalance,
    long AvailableBalanceCents,
    string Currency, // COP
    DateTimeOffset AsOfTimestamp,
    string SourceAuthority // "MOCK_IN_MEMORY" en fase actual; Cloud Spanner en TO-BE
);
