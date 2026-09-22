using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NequiTrampa.WalletApi.DTOs;
using NequiTrampa.WalletApi.Errors;
using NequiTrampa.WalletApi.Interfaces;
using NequiTrampa.WalletApi.Security;

namespace NequiTrampa.WalletApi.Controllers;

/// <summary>
/// Controlador para transferencias de dinero simulado con procesamiento transaccional atómico en Cloud Spanner.
/// </summary>
[ApiController]
[Route("v1/transfers")]
[Authorize(Roles = AuthorizationRoles.Cliente)]
[Authorize(Policy = AuthorizationPolicies.CanCreateTransfer)]
[Produces("application/json")]
public class TransfersController : ControllerBase
{
    private readonly ITransferService _transferService;
    private readonly ILogger<TransfersController> _logger;

    public TransfersController(ITransferService transferService, ILogger<TransfersController> logger)
    {
        _transferService = transferService;
        _logger = logger;
    }

    /// <summary>
    /// Crea y procesa una transferencia interna entre clientes registrados.
    /// Operación atómica en Spanner protegida por Idempotency-Key y validación de límites.
    /// </summary>
    /// <param name="idempotencyKey">Clave UUID única enviada en el encabezado para garantizar idempotencia.</param>
    /// <param name="request">Datos de la transferencia (monto en COP y teléfono destino).</param>
    /// <param name="cancellationToken">Token de cancelación.</param>
    /// <response code="201">Transferencia confirmada y registrada exitosamente en Spanner.</response>
    /// <response code="400">Solicitud mal formada o falta encabezado Idempotency-Key.</response>
    /// <response code="401">No autenticado o token inválido.</response>
    /// <response code="404">Cliente o cuenta de destino no existe en el sistema.</response>
    /// <response code="409">Conflicto de idempotencia (reintento con cuerpo incompatible) o concurrencia.</response>
    /// <response code="422">Regla financiera incumplida: saldo insuficiente, límites excedidos o destino inactivo.</response>
    /// <response code="429">Demasiadas solicitudes por minuto (Rate limit).</response>
    /// <response code="503">Dependencia financiera (Spanner/PubSub) temporalmente no disponible.</response>
    [HttpPost]
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
        {
            var problem = HttpContext.CreateProblemDetails(
                StatusCodes.Status400BadRequest,
                "https://errors.nequitrampa.internal/missing-idempotency-key",
                "Encabezado Idempotency-Key requerido",
                "Las operaciones de transferencia requieren un encabezado 'Idempotency-Key' con un UUID válido para prevenir pagos duplicados.",
                "MISSING_IDEMPOTENCY_KEY");

            return BadRequest(problem);
        }

        var originClientId = GetCurrentClientId();
        _logger.LogInformation("Iniciando transferencia del cliente {OriginClientId} hacia {DestinationPhone} por {Amount} COP con Idempotency-Key {Key}",
            originClientId, request.DestinationPhoneNumber, request.Amount, idempotencyKey);

        var result = await _transferService.CreateTransferAsync(originClientId, idempotencyKey, request, cancellationToken);

        return CreatedAtAction(
            nameof(GetTransferById),
            new { id = result.TransferId },
            result);
    }

    /// <summary>
    /// Lista el historial de transferencias propias enviadas o recibidas por el cliente autenticado.
    /// </summary>
    /// <response code="200">Listado de transferencias obtenido exitosamente.</response>
    /// <response code="401">No autenticado.</response>
    /// <response code="429">Límite de peticiones excedido.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TransferResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<IReadOnlyList<TransferResponseDto>>> GetTransfers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var clientId = GetCurrentClientId();
        var transfers = await _transferService.GetTransfersByClientIdAsync(clientId, page, pageSize, cancellationToken);
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
        var clientId = GetCurrentClientId();
        var transfer = await _transferService.GetTransferByIdAsync(clientId, id, cancellationToken);
        return Ok(transfer);
    }

    /// <summary>
    /// Genera y obtiene el comprobante oficial de la transferencia realizada.
    /// </summary>
    /// <response code="200">Comprobante generado exitosamente.</response>
    /// <response code="401">No autenticado.</response>
    /// <response code="404">Transferencia o comprobante no encontrado.</response>
    [HttpGet("{id}/receipt")]
    [ProducesResponseType(typeof(TransferReceiptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TransferReceiptDto>> GetReceipt(
        string id,
        CancellationToken cancellationToken)
    {
        var clientId = GetCurrentClientId();
        var receipt = await _transferService.GetTransferReceiptAsync(clientId, id, cancellationToken);
        return Ok(receipt);
    }

    private string GetCurrentClientId()
    {
        var clientId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? User.FindFirst("user_id")?.Value;

        if (string.IsNullOrWhiteSpace(clientId))
        {
            throw new UnauthorizedAccessException("El token JWT no contiene un identificador de usuario válido.");
        }

        return clientId;
    }
}
