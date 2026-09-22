using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Shared.Security;

namespace Nequi.Backoffice.Controllers.Financial;

/// <summary>
/// Reconciliación de operaciones financieras para OPERADOR_FINANCIERO.
/// Estado: TO-BE — requiere modelo de inconsistencias en Spanner o Firestore.
/// PERSISTENCIA PENDIENTE: tabla reconciliation_issues en Spanner.
/// </summary>
[ApiController]
[Route("v1/reconciliation")]
[Authorize(Policy = Policies.CanReverseOperation)]
[Produces("application/json")]
public sealed class ReconciliationController : ControllerBase
{
    /// <summary>
    /// Lista las inconsistencias de reconciliación detectadas.
    /// </summary>
    [HttpGet("issues")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetIssues()
    {
        return Ok(new { status = "TO-BE", issues = Array.Empty<object>() });
    }

    /// <summary>
    /// Obtiene el detalle de una inconsistencia de reconciliación.
    /// </summary>
    [HttpGet("issues/{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult GetIssue(string id)
    {
        return Ok(new { status = "TO-BE", issueId = id });
    }

    /// <summary>
    /// Resuelve una inconsistencia de reconciliación mediante operación formal.
    /// Requiere Idempotency-Key.
    /// </summary>
    [HttpPost("issues/{id}/resolve")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public IActionResult ResolveIssue(
        string id,
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        [FromBody] object request)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey))
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Idempotency-Key requerido para resolución de inconsistencias",
                Type = "https://errors.nequitrampa.internal/missing-idempotency-key"
            });

        return Ok(new { status = "TO-BE", issueId = id });
    }
}
