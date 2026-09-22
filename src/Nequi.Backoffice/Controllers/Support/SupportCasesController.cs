using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Shared.Security;

namespace Nequi.Backoffice.Controllers.Support;

/// <summary>
/// Gestión de casos de soporte.
/// Acceso: SOPORTE, OPERADOR_FINANCIERO, ADMIN.
/// Estado: TO-BE — requiere modelo de datos de casos en Spanner o colección Firestore.
/// PERSISTENCIA PENDIENTE: tabla support_cases / colección Firestore.
/// </summary>
[ApiController]
[Route("v1/support/cases")]
[Authorize(Policy = Policies.CanViewSupport)]
[Produces("application/json")]
public sealed class SupportCasesController : ControllerBase
{
    /// <summary>
    /// Lista los casos de soporte asignados o disponibles.
    /// </summary>
    /// <response code="200">Lista de casos obtenida.</response>
    /// <response code="401">No autenticado.</response>
    /// <response code="403">Rol insuficiente.</response>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public IActionResult GetCases()
    {
        // TO-BE: consultar repositorio de casos
        return Ok(new { status = "TO-BE", message = "Implementación pendiente de modelo de datos de soporte." });
    }

    /// <summary>
    /// Obtiene el detalle de un caso específico.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult GetCase(string id)
    {
        return Ok(new { status = "TO-BE", caseId = id });
    }

    /// <summary>
    /// Actualiza el estado de un caso de soporte.
    /// </summary>
    [HttpPatch("{id}/status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult UpdateCaseStatus(string id, [FromBody] object request)
    {
        return Ok(new { status = "TO-BE", caseId = id });
    }

    /// <summary>
    /// Agrega un mensaje a un caso de soporte.
    /// </summary>
    [HttpPost("{id}/messages")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public IActionResult AddMessage(string id, [FromBody] object request)
    {
        return StatusCode(StatusCodes.Status201Created, new { status = "TO-BE", caseId = id });
    }

    /// <summary>
    /// Asigna el caso a un agente de soporte.
    /// </summary>
    [HttpPost("{id}/assignments")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public IActionResult AssignCase(string id, [FromBody] object request)
    {
        return StatusCode(StatusCodes.Status201Created, new { status = "TO-BE", caseId = id });
    }

    /// <summary>
    /// Escala el caso a un nivel superior.
    /// </summary>
    [HttpPost("{id}/escalations")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public IActionResult EscalateCase(string id, [FromBody] object request)
    {
        return StatusCode(StatusCodes.Status201Created, new { status = "TO-BE", caseId = id });
    }
}
