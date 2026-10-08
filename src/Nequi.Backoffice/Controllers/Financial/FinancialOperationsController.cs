using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Backoffice.Services;
using Nequi.Shared.Http;
using Nequi.Shared.Idempotency;
using Nequi.Shared.Security;

namespace Nequi.Backoffice.Controllers.Financial;

public sealed record CreateReversalRequest([Required, StringLength(256, MinimumLength = 5)] string Reason);

/// <param name="Direction">CREDIT (suma al cliente) o DEBIT (resta).</param>
/// <param name="Amount">Monto entero en COP (no en centavos).</param>
public sealed record CreateAdjustmentRequest([Required] string ClientId, [Required] string Direction,
    [Range(1, 100_000_000)] long Amount, [Required, StringLength(256, MinimumLength = 5)] string Reason);

/// <summary>
/// Operaciones financieras formales para OPERADOR_FINANCIERO.
/// Regla: correcciones mediante operaciones formales (REVERSAL / ADJUSTMENT en el ledger de Spanner), NUNCA edición directa.
/// Cada corrección: operación inmutable + asientos de partida doble + saldo + evento en el outbox en UNA transacción, y entrada de auditoría.
/// </summary>
[ApiController]
[Authorize(Policy = Policies.CanReverseOperation)]
[Produces("application/json")]
public sealed class FinancialOperationsController(LedgerReader ledger, LedgerAdjuster adjuster, AuditLog audit) : ControllerBase
{
    private CurrentUser Me => CurrentUser.From(User)!;

    private IActionResult Map(BackofficeException e) => this.ProblemJson(e.Status, e.Title, e.Detail, e.Code);

    /// <summary>Detalle de una operación financiera (operation_id o referencia pública).</summary>
    [HttpGet("v1/financial-operations/{id}")]
    [ProducesResponseType(typeof(OperationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFinancialOperation(string id, CancellationToken ct)
    {
        var op = await ledger.FindOperationAsync(id, ct);
        return op is null ? this.ProblemJson(404, "Operation not found", code: "not_found") : Ok(op);
    }

    /// <summary>Asientos de partida doble de la operación.</summary>
    [HttpGet("v1/financial-operations/{id}/ledger")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOperationLedger(string id, CancellationToken ct)
    {
        var op = await ledger.FindOperationAsync(id, ct);
        if (op is null) return this.ProblemJson(404, "Operation not found", code: "not_found");
        var entries = await ledger.EntriesAsync(op.OperationId, ct);
        return Ok(new { operationId = op.OperationId, publicReference = op.PublicReference, balanced = entries.Sum(e => e.DeltaCents) == 0, ledgerEntries = entries });
    }

    /// <summary>Entradas de auditoría asociadas a la operación (reversos/ajustes que la afectan).</summary>
    [HttpGet("v1/financial-operations/{id}/audit")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOperationAudit(string id, CancellationToken ct)
    {
        var op = await ledger.FindOperationAsync(id, ct);
        if (op is null) return this.ProblemJson(404, "Operation not found", code: "not_found");
        var entries = (await audit.ForOperationAsync(op.OperationId, ct)).OrderBy(e => e["occurredAt"]?.ToString(), StringComparer.Ordinal).ToList();
        return Ok(new { operationId = op.OperationId, auditEntries = entries });
    }

    /// <summary>
    /// Crea un reverso formal de una operación COMPLETED (INTERNAL_TRANSFER o SIMULATED_RECHARGE). No se borra nada: se crea una operación REVERSAL
    /// con asientos inversos. Falla con 409 si ya fue revertida o si la billetera no puede absorber el reverso. Requiere Idempotency-Key.
    /// </summary>
    [HttpPost("v1/financial-operations/{id}/reversals")]
    [TypeFilter(typeof(IdempotencyActionFilter))]
    [ProducesResponseType(typeof(OperationDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateReversal(string id, [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        [FromBody] CreateReversalRequest request, CancellationToken ct)
    {
        try
        {
            var op = await adjuster.ReverseAsync(id, request.Reason, Me, idempotencyKey!, ct);
            await audit.WriteAsync(Me, "FINANCIAL_REVERSAL_CREATED", "ledger_operation", op.OperationId,
                new { original = op.OriginalOperationId, request.Reason, reference = op.PublicReference }, operationId: op.OriginalOperationId, ct: ct);
            return Created($"/v1/reversals/{op.PublicReference}", op);
        }
        catch (BackofficeException e) { return Map(e); }
    }

    /// <summary>Detalle de un reverso (referencia pública REV-... u operation_id).</summary>
    [HttpGet("v1/reversals/{id}")]
    [ProducesResponseType(typeof(OperationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReversal(string id, CancellationToken ct)
    {
        var op = await ledger.FindOperationAsync(id, ct, "REVERSAL");
        return op is null ? this.ProblemJson(404, "Reversal not found", code: "not_found") : Ok(op);
    }

    /// <summary>
    /// Ajuste compensatorio formal (operación ADMIN_ADJUSTMENT, CREDIT/DEBIT en COP) contra SYSTEM_FUNDING, con motivo, actor y auditoría. Requiere Idempotency-Key.
    /// </summary>
    [HttpPost("v1/financial-adjustments")]
    [TypeFilter(typeof(IdempotencyActionFilter))]
    [ProducesResponseType(typeof(OperationDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateAdjustment([FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        [FromBody] CreateAdjustmentRequest request, CancellationToken ct)
    {
        var dir = request.Direction.ToUpperInvariant();
        if (dir is not ("CREDIT" or "DEBIT"))
            return this.ProblemJson(422, "Invalid direction", "Use CREDIT or DEBIT.", "VALIDATION_ERROR");
        try
        {
            var op = await adjuster.AdjustAsync(request.ClientId, dir == "CREDIT", request.Amount, request.Reason, Me, idempotencyKey!, ct);
            await audit.WriteAsync(Me, "FINANCIAL_ADJUSTMENT_CREATED", "ledger_operation", op.OperationId,
                new { request.ClientId, dir, request.Amount, request.Reason, reference = op.PublicReference }, operationId: op.OperationId, ct: ct);
            return Created($"/v1/financial-adjustments/{op.PublicReference}", op);
        }
        catch (BackofficeException e) { return Map(e); }
    }

    /// <summary>Detalle de un ajuste (referencia pública ADJ-... u operation_id).</summary>
    [HttpGet("v1/financial-adjustments/{id}")]
    [ProducesResponseType(typeof(OperationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAdjustment(string id, CancellationToken ct)
    {
        var op = await ledger.FindOperationAsync(id, ct, "ADMIN_ADJUSTMENT");
        return op is null ? this.ProblemJson(404, "Adjustment not found", code: "not_found") : Ok(op);
    }
}
