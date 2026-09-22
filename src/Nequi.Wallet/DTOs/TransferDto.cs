using System.ComponentModel.DataAnnotations;

namespace Nequi.Wallet.DTOs;

/// <summary>
/// Solicitud de creación de transferencia interna entre clientes activos.
/// Límite por operación: $2.000.000 COP. Límite diario acumulado: $5.000.000 COP.
/// </summary>
public record CreateTransferRequestDto(
    [Required]
    [RegularExpression(@"^3\d{9}$", ErrorMessage = "El número telefónico de destino debe ser un número celular colombiano válido de 10 dígitos que inicie en 3.")]
    string DestinationPhoneNumber,

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
    string DestinationPhoneNumber,
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
/// </summary>
public record TransferReceiptDto(
    string ReceiptNumber,
    string TransferId,
    string OriginMaskedPhone,
    string DestinationMaskedPhone,
    decimal Amount,
    string Currency,
    DateTimeOffset CompletedAt,
    string AuthorizationCode,
    string Status
);
