using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Shared.Security;

namespace Nequi.Backoffice.Controllers.Financial;

/// <summary>
/// Operaciones financieras formales para OPERADOR_FINANCIERO.
/// Regla: correcciones mediante operaciones formales, NO edición directa.
/// Estado: TO-BE — requiere DDL de reversals, financial_adjustments en Spanner.
/// PERSISTENCIA PENDIENTE: tabla reversals, financial_adjustments, ledger_entries.
/// </summary>
[ApiController]
[Authorize(Policy = Policies.CanReverseOperation)]
[Produces("application/json")]
public sealed class FinancialOperationsController : ControllerBase
{
    /// <summary>
    /// Consulta el detalle de una operación financiera.
    /// </summary>
    [HttpGet("v1/financial-operations/{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult GetFinancialOperation(string id)
    {
        return Ok(new { status = "TO-BE", operationId = id });
    }

    /// <summary>
    /// Consulta las entradas de ledger de una operación.
    /// PERSISTENCIA PENDIENTE: tabla ledger_entries en Spanner.
    /// </summary>
    [HttpGet("v1/financial-operations/{id}/ledger")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetOperationLedger(string id)
    {
        return Ok(new { status = "TO-BE", operationId = id, ledgerEntries = Array.Empty<object>() });
    }

    /// <summary>
    /// Consulta la auditoría de una operación financiera.
    /// </summary>
    [HttpGet("v1/financial-operations/{id}/audit")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetOperationAudit(string id)
    {
        return Ok(new { status = "TO-BE", operationId = id, auditEntries = Array.Empty<object>() });
    }

    /// <summary>
    /// Crea un reverso formal de una operación completada.
    /// REGLA: no DELETE de transferencia — se crea una nueva operación REVERSAL.
    /// Requiere Idempotency-Key.
    /// PERSISTENCIA PENDIENTE: tabla reversals + ledger_entries en Spanner.
    /// </summary>
    [HttpPost("v1/financial-operations/{id}/reversals")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public IActionResult CreateReversal(
        string id,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        [FromBody] object request)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Idempotency-Key requerido para operaciones de reverso",
                Type = "https://errors.nequitrampa.internal/missing-idempotency-key"
            });

        // TO-BE: crear operación REVERSAL en Spanner con referencia a operación original
        return StatusCode(StatusCodes.Status201Created, new { status = "TO-BE", originalOperationId = id });
    }

    /// <summary>
    /// Consulta el detalle de un reverso.
    /// </summary>
    [HttpGet("v1/reversals/{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetReversal(string id)
    {
        return Ok(new { status = "TO-BE", reversalId = id });
    }

    /// <summary>
    /// Crea un ajuste compensatorio formal.
    /// REGLA: corrección mediante operación formal con motivo, actor y auditoría.
    /// PERSISTENCIA PENDIENTE: tabla financial_adjustments + ledger_entries en Spanner.
    /// </summary>
    [HttpPost("v1/financial-adjustments")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public IActionResult CreateAdjustment(
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        [FromBody] object request)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Idempotency-Key requerido para ajustes financieros",
                Type = "https://errors.nequitrampa.internal/missing-idempotency-key"
            });

        return StatusCode(StatusCodes.Status201Created, new { status = "TO-BE" });
    }

    /// <summary>
    /// Consulta el detalle de un ajuste financiero.
    /// </summary>
    [HttpGet("v1/financial-adjustments/{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetAdjustment(string id)
    {
        return Ok(new { status = "TO-BE", adjustmentId = id });
    }
}
