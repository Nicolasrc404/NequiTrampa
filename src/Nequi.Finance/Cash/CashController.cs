using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Finance.Common;
using Nequi.Shared.Http;
using Nequi.Shared.Idempotency;
using Nequi.Shared.Security;

namespace Nequi.Finance.Cash;

/// <summary>
/// Registro personal de efectivo del cliente autenticado. Es un dominio separado de la billetera:
/// no acredita, debita ni aparta saldo bancario y no genera asientos en el ledger.
/// </summary>
[ApiController]
[Route("v1/cash")]
[Authorize(Policy = Policies.Client)]
[Produces("application/json")]
public sealed class CashController(
    CashService service, ClientIdentityResolver identities) : ControllerBase
{
    /// <summary>Efectivo disponible declarado por el cliente (autoridad: resumen del registro de efectivo).</summary>
    [HttpGet("balance")]
    [ProducesResponseType(typeof(CashBalanceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Balance(CancellationToken ct)
    {
        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        return Ok(await service.GetBalanceAsync(owner, ct));
    }

    /// <summary>Historial de registros de efectivo, del más reciente al más antiguo.</summary>
    [HttpGet("movements")]
    [ProducesResponseType(typeof(IReadOnlyList<CashMovementDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Movements([FromQuery] int? limit, CancellationToken ct)
    {
        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        return Ok(await service.ListMovementsAsync(owner, limit, ct));
    }

    /// <summary>
    /// Registra un ingreso o gasto de efectivo. Idempotente por Idempotency-Key: repetir la
    /// misma clave devuelve la misma respuesta, mientras que dos declaraciones idénticas con
    /// claves distintas son dos intenciones legítimas y se registran por separado.
    /// </summary>
    [HttpPost("movements")]
    [TypeFilter(typeof(IdempotencyActionFilter))]
    [ProducesResponseType(typeof(CashMovementCreatedDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Create(
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        [FromBody] CreateCashMovementRequest request,
        CancellationToken ct)
    {
        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        var (outcome, movement, balance) = await service.CreateAsync(owner, request, idempotencyKey ?? "", ct);
        return outcome switch
        {
            CashCreateOutcome.Created => Created(
                $"/v1/cash/movements/{movement!.Id}",
                new CashMovementCreatedDto(movement, balance)),
            CashCreateOutcome.Duplicate => this.ProblemJson(
                409, "Cash entry already exists",
                "An identical cash entry (date, direction, amount, category and note) was already registered.",
                "CASH_DUPLICATE"),
            CashCreateOutcome.InsufficientCash => this.ProblemJson(
                422, "Insufficient cash",
                "The declared expense exceeds your available cash.",
                "CASH_INSUFFICIENT"),
            CashCreateOutcome.InvalidCategory => this.ProblemJson(
                404, "Category not found",
                "The category does not exist, is inactive or does not belong to you.",
                "CATEGORY_NOT_FOUND"),
            _ => this.ProblemJson(
                422, "Invalid date",
                "occurredOn must be a valid YYYY-MM-DD date that is not in the future.",
                "VALIDATION_ERROR"),
        };
    }
}
