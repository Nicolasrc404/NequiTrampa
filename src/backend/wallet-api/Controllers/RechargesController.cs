using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NequiTrampa.WalletApi.DTOs;
using NequiTrampa.WalletApi.Errors;
using NequiTrampa.WalletApi.Interfaces;
using NequiTrampa.WalletApi.Security;

namespace NequiTrampa.WalletApi.Controllers;

/// <summary>
/// Controlador para recargas simuladas de saldo digital sobre Cloud Spanner.
/// </summary>
[ApiController]
[Route("v1/recharges")]
[Authorize(Roles = AuthorizationRoles.Cliente)]
[Authorize(Policy = AuthorizationPolicies.CanCreateRecharge)]
[Produces("application/json")]
public class RechargesController : ControllerBase
{
    private readonly IRechargeService _rechargeService;
    private readonly ILogger<RechargesController> _logger;

    public RechargesController(IRechargeService rechargeService, ILogger<RechargesController> logger)
    {
        _rechargeService = rechargeService;
        _logger = logger;
    }

    /// <summary>
    /// Crea y procesa una recarga simulada de saldo digital.
    /// Operación autoritativa en Spanner protegida por Idempotency-Key.
    /// </summary>
    /// <param name="idempotencyKey">Clave UUID obligatoria en el encabezado.</param>
    /// <param name="request">Datos del medio de pago simulado y monto.</param>
    /// <param name="cancellationToken">Token de cancelación.</param>
    /// <response code="201">Recarga simulada completada exitosamente y saldo digital acreditado.</response>
    /// <response code="400">Solicitud inválida o falta Idempotency-Key.</response>
    /// <response code="401">No autenticado o token inválido.</response>
    /// <response code="409">Conflicto de idempotencia por reintento con cuerpo modificado.</response>
    /// <response code="422">Regla de negocio no superada (monto fuera de rango).</response>
    /// <response code="429">Límite de solicitudes excedido.</response>
    [HttpPost]
    [ProducesResponseType(typeof(RechargeResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<RechargeResponseDto>> CreateRecharge(
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        [FromBody] CreateRechargeRequestDto request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            var problem = HttpContext.CreateProblemDetails(
                StatusCodes.Status400BadRequest,
                "https://errors.nequitrampa.internal/missing-idempotency-key",
                "Encabezado Idempotency-Key requerido",
                "Las operaciones de recarga requieren un encabezado 'Idempotency-Key' para garantizar no duplicación de fondos.",
                "MISSING_IDEMPOTENCY_KEY");

            return BadRequest(problem);
        }

        var clientId = GetCurrentClientId();
        _logger.LogInformation("Iniciando recarga simulada para cliente {ClientId} por {Amount} COP vía {Method}",
            clientId, request.Amount, request.PaymentMethod);

        var result = await _rechargeService.CreateRechargeAsync(clientId, idempotencyKey, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Obtiene el listado histórico de recargas simuladas del cliente autenticado.
    /// </summary>
    /// <response code="200">Historial de recargas obtenido exitosamente.</response>
    /// <response code="401">No autenticado.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<RechargeResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<RechargeResponseDto>>> GetRecharges(CancellationToken cancellationToken)
    {
        var clientId = GetCurrentClientId();
        var recharges = await _rechargeService.GetRechargesByClientIdAsync(clientId, cancellationToken);
        return Ok(recharges);
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
