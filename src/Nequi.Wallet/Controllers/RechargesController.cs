using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Shared.Idempotency;
using Nequi.Shared.Security;
using Nequi.Wallet.DTOs;
using Nequi.Wallet.Interfaces;

namespace Nequi.Wallet.Controllers;

/// <summary>
/// Controlador para recargas simuladas de saldo digital.
/// Acceso exclusivo: rol CLIENTE sobre sus propias recargas.
/// Idempotencia: IdempotencyActionFilter (Nequi.Shared) aplica Idempotency-Key en POST.
/// Implementación actual: MOCK (MockRechargeService). La autoridad financiera real será Cloud Spanner (TO-BE).
/// </summary>
[ApiController]
[Route("v1/recharges")]
[Authorize(Policy = Policies.Client)]
[Produces("application/json")]
public sealed class RechargesController(IRechargeService rechargeService, ILogger<RechargesController> logger) : ControllerBase
{
    /// <summary>
    /// Crea y procesa una recarga simulada de saldo digital.
    /// Idempotencia protegida por Idempotency-Key (IdempotencyActionFilter).
    /// Rango permitido: $1.000 – $5.000.000 COP (validado en DTO).
    /// Implementación actual: MOCK — el saldo no se acumula transaccionalmente (TO-BE: Spanner).
    /// </summary>
    /// <param name="idempotencyKey">Clave UUID obligatoria en el encabezado.</param>
    /// <param name="request">Datos del medio de pago simulado y monto.</param>
    /// <param name="cancellationToken">Token de cancelación.</param>
    /// <response code="201">Recarga simulada completada exitosamente (MOCK).</response>
    /// <response code="400">Solicitud inválida o falta Idempotency-Key.</response>
    /// <response code="401">No autenticado o token inválido.</response>
    /// <response code="409">Conflicto de idempotencia por reintento con cuerpo modificado.</response>
    /// <response code="422">Regla de negocio no superada (monto fuera de rango).</response>
    /// <response code="429">Límite de solicitudes excedido.</response>
    [HttpPost]
    [TypeFilter(typeof(IdempotencyActionFilter))]
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
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Encabezado Idempotency-Key requerido",
                Detail = "Las operaciones de recarga requieren un encabezado 'Idempotency-Key' para garantizar no duplicación de fondos.",
                Type = "https://errors.nequitrampa.internal/missing-idempotency-key",
                Extensions = { ["code"] = "MISSING_IDEMPOTENCY_KEY" }
            });

        var user = CurrentUser.From(User);
        if (user is null) return Unauthorized();

        logger.LogInformation(
            "Iniciando recarga simulada cliente {ClientId} por {Amount} COP vía {Method}",
            user.Uid, request.Amount, request.PaymentMethod);

        var result = await rechargeService.CreateRechargeAsync(user.Uid, idempotencyKey, request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Obtiene el listado histórico de recargas simuladas del cliente autenticado.
    /// NOTA: <c>CurrentUser.Uid</c> se usa como clave de cliente de forma temporal (MOCK);
    /// en producción se resolverá UID → clientId financiero desde Spanner (TO-BE).
    /// </summary>
    /// <response code="200">Historial de recargas obtenido exitosamente.</response>
    /// <response code="401">No autenticado.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<RechargeResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<RechargeResponseDto>>> GetRecharges(CancellationToken cancellationToken)
    {
        var user = CurrentUser.From(User);
        if (user is null) return Unauthorized();

        var recharges = await rechargeService.GetRechargesByClientIdAsync(user.Uid, cancellationToken);
        return Ok(recharges);
    }
}
