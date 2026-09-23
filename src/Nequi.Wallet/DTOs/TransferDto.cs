using System.ComponentModel.DataAnnotations;

namespace Nequi.Wallet.DTOs;

/// <summary>
/// Solicitud de creación de transferencia interna entre clientes activos.
/// Límite por operación: $2.000.000 COP. Límite diario acumulado: $5.000.000 COP.
/// </summary>
public record CreateTransferRequestDto(
    [Required(ErrorMessage = "El código público de transferencia de destino es obligatorio.")]
    [StringLength(20, MinimumLength = 1, ErrorMessage = "El código de transferencia no puede superar los 20 caracteres.")]
    [RegularExpression(@"^[A-Za-z0-9_-]+$", ErrorMessage = "El código de transferencia solo puede contener caracteres alfanuméricos, guiones y guiones bajos.")]
    string DestinationTransferCode,

    [Required]
    [Range(1, 2000000, ErrorMessage = "El monto debe ser superior a 0 y no exceder $2.000.000 COP por transferencia.")]
    decimal Amount,

    [MaxLength(140, ErrorMessage = "La descripción no puede exceder los 140 caracteres.")]
    string? Description = null,

    [Required]
    [RegularExpression("^COP$", ErrorMessage = "La única moneda autorizada en el sistema es COP.")]
    string Currency = "COP"
);

/// <summary>
/// Respuesta tras la creación exitosa de una transferencia (MOCK).
/// En producción: confirmación atómica (COMMIT) en Cloud Spanner (TO-BE).
/// </summary>
public record TransferResponseDto(
    string TransferId,
    string OriginClientId,
    string DestinationClientId,
    string DestinationTransferCode,
    decimal Amount,
    long AmountCents,
    string Currency,
    string Status, // COMPLETED, REVERSED
    string LedgerOperationId,
    DateTimeOffset Timestamp,
    string? Description
);

/// <summary>
/// Comprobante formal emitido para visualización y descarga por el cliente.
/// Los códigos de transferencia se enmascaran: primeros 3 chars + *** + últimos 4 chars.
/// Ejemplo: TRF-ALE-0001 → TRF***0001
/// </summary>
public record TransferReceiptDto(
    string ReceiptNumber,
    string TransferId,
    string OriginMaskedTransferCode,
    string DestinationMaskedTransferCode,
    decimal Amount,
    string Currency,
    DateTimeOffset CompletedAt,
    string AuthorizationCode,
    string Status
);
