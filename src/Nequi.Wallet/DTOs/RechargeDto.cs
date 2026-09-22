using System.ComponentModel.DataAnnotations;

namespace Nequi.Wallet.DTOs;

/// <summary>
/// Solicitud de recarga simulada de saldo digital.
/// </summary>
public record CreateRechargeRequestDto(
    [Required]
    [Range(1000, 5000000, ErrorMessage = "El monto mínimo de recarga es $1.000 COP y el máximo $5.000.000 COP.")]
    decimal Amount,

    [Required]
    [RegularExpression("^(SIMULATED_PSE|SIMULATED_CARD|SIMULATED_CORRESPONSAL)$", 
        ErrorMessage = "Método de recarga simulada no soportado.")]
    string PaymentMethod,

    [Required]
    [RegularExpression("^COP$", ErrorMessage = "La moneda debe ser exclusivamente COP.")]
    string Currency = "COP"
);

/// <summary>
/// Respuesta tras la acreditación autoritativa en Spanner.
/// </summary>
public record RechargeResponseDto(
    string RechargeId,
    string ClientId,
    decimal Amount,
    long AmountCents,
    string Currency,
    string PaymentMethod,
    string Status, // COMPLETED
    string LedgerOperationId,
    DateTimeOffset Timestamp
);
