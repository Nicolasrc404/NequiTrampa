using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Shared.Security;

namespace Nequi.Backoffice.Controllers.Admin;

/// <summary>
/// Administración de usuarios, roles y configuración de plataforma.
/// Acceso: exclusivo ADMIN.
/// Regla: ADMIN administra la plataforma, NO la contabilidad.
/// Estado: TO-BE — requiere tabla business_users / user_roles en Spanner.
/// PERSISTENCIA PENDIENTE: business_users, user_role_assignments, platform_config en Spanner.
/// </summary>
[ApiController]
[Route("v1/admin")]
[Authorize(Policy = Policies.CanManageRoles)]
[Produces("application/json")]
public sealed class AdminController : ControllerBase
{
    /// <summary>
    /// Lista todos los usuarios de la plataforma con filtros.
    /// </summary>
    [HttpGet("users")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        return Ok(new { status = "TO-BE", users = Array.Empty<object>(), page, pageSize });
    }

    /// <summary>
    /// Consulta el detalle de un usuario específico.
    /// </summary>
    [HttpGet("users/{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult GetUser(string id)
    {
        return Ok(new { status = "TO-BE", userId = id });
    }

    /// <summary>
    /// Activa o bloquea un usuario. No elimina ni modifica saldo.
    /// </summary>
    [HttpPatch("users/{id}/status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult UpdateUserStatus(string id, [FromBody] object request)
    {
        // TO-BE: actualizar estado en business_users (Spanner) — no toca wallets ni balance
        return Ok(new { status = "TO-BE", userId = id });
    }

    /// <summary>
    /// Lista los roles disponibles del sistema.
    /// </summary>
    [HttpGet("roles")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetRoles()
    {
        return Ok(new
        {
            status = "IMPLEMENTADO",
            roles = new[] { "CLIENTE", "SOPORTE", "OPERADOR_FINANCIERO", "ADMIN" }
        });
    }

    /// <summary>
    /// Consulta los roles asignados a un usuario.
    /// </summary>
    [HttpGet("users/{id}/roles")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetUserRoles(string id)
    {
        return Ok(new { status = "TO-BE", userId = id, roles = Array.Empty<string>() });
    }

    /// <summary>
    /// Asigna roles a un usuario. Solo roles del sistema (CLIENTE, SOPORTE, OPERADOR_FINANCIERO, ADMIN).
    /// </summary>
    [HttpPut("users/{id}/roles")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public IActionResult SetUserRoles(string id, [FromBody] object request)
    {
        // TO-BE: actualizar user_role_assignments en Spanner + propagar a Identity Platform
        return Ok(new { status = "TO-BE", userId = id });
    }

    /// <summary>
    /// Consulta la configuración de plataforma permitida.
    /// </summary>
    [HttpGet("configuration")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetConfiguration()
    {
        return Ok(new { status = "TO-BE", configuration = new { } });
    }

    /// <summary>
    /// Actualiza configuración de plataforma autorizada.
    /// No incluye configuración financiera crítica.
    /// </summary>
    [HttpPatch("configuration")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult UpdateConfiguration([FromBody] object request)
    {
        return Ok(new { status = "TO-BE" });
    }

    /// <summary>
    /// Lista eventos de auditoría de la plataforma.
    /// PERSISTENCIA PENDIENTE: tabla audit_events en Spanner.
    /// </summary>
    [HttpGet("audit-events")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetAuditEvents([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        return Ok(new { status = "TO-BE", events = Array.Empty<object>(), page, pageSize });
    }

    /// <summary>
    /// Consulta el detalle de un evento de auditoría específico.
    /// </summary>
    [HttpGet("audit-events/{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult GetAuditEvent(string id)
    {
        return Ok(new { status = "TO-BE", eventId = id });
    }
}
