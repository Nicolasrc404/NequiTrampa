using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Shared.Security;

namespace Nequi.Backoffice.Controllers.Support;

/// <summary>
/// Investigación de operaciones financieras por parte de SOPORTE.
/// Regla: SOPORTE puede investigar dinero, pero NO moverlo.
/// Estado: TO-BE — requiere acceso de solo lectura a operaciones en Spanner.
/// PERSISTENCIA PENDIENTE: lectura de transfers, ledger_entries en Spanner.
/// </summary>
[ApiController]
[Route("v1/support")]
[Authorize(Policy = Policies.CanViewSupport)]
[Produces("application/json")]
public sealed class SupportInvestigationController : ControllerBase
{
    /// <summary>
    /// Consulta el estado de una operación financiera específica.
    /// SOPORTE: solo lectura. NO puede modificar ni revertir.
    /// </summary>
    [HttpGet("operations/{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult GetOperationStatus(string id)
    {
        // TO-BE: consultar operación en Spanner (solo lectura)
        return Ok(new { status = "TO-BE", operationId = id });
    }

    /// <summary>
    /// Obtiene el timeline de eventos de una operación.
    /// </summary>
    [HttpGet("operations/{id}/timeline")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult GetOperationTimeline(string id)
    {
        return Ok(new { status = "TO-BE", operationId = id, timeline = Array.Empty<object>() });
    }

    /// <summary>
    /// Consulta el estado de proyección Firestore de una operación.
    /// </summary>
    [HttpGet("operations/{id}/projection-status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetProjectionStatus(string id)
    {
        return Ok(new { status = "TO-BE", operationId = id, projectionStatus = "PENDING_IMPLEMENTATION" });
    }

    /// <summary>
    /// Consulta información básica de un cliente (minimización de datos).
    /// SOPORTE solo recibe la información necesaria para atender el caso.
    /// </summary>
    [HttpGet("clients/{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult GetClientInfo(string id)
    {
        // TO-BE: minimización de datos — solo nombre, teléfono enmascarado, estado de cuenta
        return Ok(new { status = "TO-BE", clientId = id });
    }

    /// <summary>
    /// Lista las operaciones de un cliente para investigación de soporte.
    /// </summary>
    [HttpGet("clients/{id}/operations")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetClientOperations(string id)
    {
        return Ok(new { status = "TO-BE", clientId = id, operations = Array.Empty<object>() });
    }
}
