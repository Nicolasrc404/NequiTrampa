using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Shared.Idempotency;
using Nequi.Shared.Security;
using Nequi.Wallet.DTOs;
using Nequi.Wallet.Interfaces;

namespace Nequi.Wallet.Controllers;

/// <summary>
/// Controlador para transferencias de dinero simulado.
/// Acceso exclusivo: rol CLIENTE sobre sus propias transferencias.
/// Idempotencia: IdempotencyActionFilter (Nequi.Shared) aplica Idempotency-Key en POST.
/// Implementación actual: MOCK (MockTransferService). La autoridad financiera real será Cloud Spanner (TO-BE).
/// </summary>
[ApiController]
[Route("v1/transfers")]
[Authorize(Policy = Policies.Client)]
[Produces("application/json")]
public sealed class TransfersController(ITransferService transferService, ILogger<TransfersController> logger) : ControllerBase
{
    /// <summary>
    /// Crea y procesa una transferencia interna entre clientes registrados.
    /// Idempotencia protegida por Idempotency-Key (IdempotencyActionFilter). Validación de límites y saldo en MOCK.
    /// Límite por operación: $2.000.000 COP. Límite diario acumulado: $5.000.000 COP.
    /// Implementación actual: MOCK (MockTransferService). Persistencia autoritativa en Spanner = TO-BE.
    /// </summary>
    /// <param name="idempotencyKey">Clave UUID única enviada en el encabezado para garantizar idempotencia.</param>
    /// <param name="request">Datos de la transferencia (monto en COP y teléfono destino).</param>
    /// <param name="cancellationToken">Token de cancelación.</param>
    /// <response code="201">Transferencia confirmada y registrada (MOCK).</response>
    /// <response code="400">Solicitud mal formada o falta encabezado Idempotency-Key.</response>
    /// <response code="401">No autenticado o token JWT inválido/expirado (RFC 8725 / RFC 9457).</response>
    /// <response code="404">Cliente o cuenta de destino no existe en el sistema.</response>
    /// <response code="409">Conflicto de idempotencia (reintento con cuerpo incompatible) o concurrencia.</response>
    /// <response code="422">Regla financiera incumplida: saldo insuficiente, límites excedidos o destino inactivo.</response>
    /// <response code="429">Demasiadas solicitudes por minuto (Rate limit).</response>
    /// <response code="503">Dependencia financiera no disponible temporalmente.</response>
    [HttpPost]
    [TypeFilter(typeof(IdempotencyActionFilter))]
    [ProducesResponseType(typeof(TransferResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<TransferResponseDto>> CreateTransfer(
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        [FromBody] CreateTransferRequestDto request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Encabezado Idempotency-Key requerido",
                Detail = "Las operaciones de transferencia requieren un encabezado 'Idempotency-Key' con un UUID válido para prevenir pagos duplicados.",
                Type = "https://errors.nequitrampa.internal/missing-idempotency-key",
                Extensions = { ["code"] = "MISSING_IDEMPOTENCY_KEY" }
            });

        var user = CurrentUser.From(User);
        if (user is null) return Unauthorized();

        logger.LogInformation(
            "Iniciando transferencia cliente {OriginClientId} → {DestinationPhone} por {Amount} COP key={Key}",
            user.Uid, request.DestinationPhoneNumber, request.Amount, idempotencyKey);

        var result = await transferService.CreateTransferAsync(user.Uid, idempotencyKey, request, cancellationToken);

        return CreatedAtAction(nameof(GetTransferById), new { id = result.TransferId }, result);
    }

    /// <summary>
    /// Lista el historial de transferencias propias del cliente autenticado.
    /// NOTA: <c>CurrentUser.Uid</c> se usa como clave de cliente de forma temporal (MOCK);
    /// en producción se resolverá UID → clientId financiero desde Spanner (TO-BE).
    /// </summary>
    /// <response code="200">Listado de transferencias obtenido exitosamente.</response>
    /// <response code="401">No autenticado.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TransferResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<TransferResponseDto>>> GetTransfers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var user = CurrentUser.From(User);
        if (user is null) return Unauthorized();

        var transfers = await transferService.GetTransfersByClientIdAsync(user.Uid, page, pageSize, cancellationToken);
        return Ok(transfers);
    }

    /// <summary>
    /// Consulta el detalle de una transferencia específica propia.
    /// </summary>
    /// <response code="200">Detalle de la transferencia obtenido exitosamente.</response>
    /// <response code="401">No autenticado.</response>
    /// <response code="403">La transferencia pertenece a otro cliente (Resource authorization violation).</response>
    /// <response code="404">La transferencia no fue encontrada.</response>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(TransferResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TransferResponseDto>> GetTransferById(
        string id,
        CancellationToken cancellationToken)
    {
        var user = CurrentUser.From(User);
        if (user is null) return Unauthorized();

        var transfer = await transferService.GetTransferByIdAsync(user.Uid, id, cancellationToken);
        return Ok(transfer);
    }

    /// <summary>
    /// Genera y obtiene el comprobante de una transferencia propia.
    /// Aplica la misma autorización por recurso que <see cref="GetTransferById"/>: un cliente
    /// solo puede obtener el comprobante de sus propias transferencias (rol origen o destino).
    /// </summary>
    /// <response code="200">Comprobante generado exitosamente.</response>
    /// <response code="401">No autenticado.</response>
    /// <response code="403">El cliente no es origen ni destino de la transferencia (resource authorization).</response>
    /// <response code="404">Transferencia no encontrada.</response>
    [HttpGet("{id}/receipt")]
    [ProducesResponseType(typeof(TransferReceiptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TransferReceiptDto>> GetReceipt(
        string id,
        CancellationToken cancellationToken)
    {
        var user = CurrentUser.From(User);
        if (user is null) return Unauthorized();

        var receipt = await transferService.GetTransferReceiptAsync(user.Uid, id, cancellationToken);
        return Ok(receipt);
    }
}
