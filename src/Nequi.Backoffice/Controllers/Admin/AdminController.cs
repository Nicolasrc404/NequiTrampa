using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Backoffice.Services;
using Nequi.Shared.Data;
using Nequi.Shared.Http;
using Nequi.Shared.Security;

namespace Nequi.Backoffice.Controllers.Admin;

public sealed record UpdateUserStatusRequest([Required] string Status);
public sealed record SetRolesRequest([Required] string[] Roles);
public sealed record UpdateConfigurationRequest(bool? MaintenanceMode, bool? NotificationsEnabled, string? SupportEmail, string? SupportHours);

/// <summary>
/// Administración de usuarios, roles y configuración de plataforma. Acceso: exclusivo ADMIN.
/// Regla: ADMIN administra la plataforma, NO la contabilidad (no puede mover dinero ni cambiar saldos).
/// Usuarios = clientes en Spanner; roles = custom claims de Identity Platform; configuración y auditoría en Firestore.
/// </summary>
[ApiController]
[Route("v1/admin")]
[Authorize(Policy = Policies.CanManageRoles)]
[Produces("application/json")]
public sealed class AdminController(LedgerReader ledger, LedgerAdjuster adjuster, IdentityAdmin identity, IDocumentStore docs, AuditLog audit,
    ILogger<AdminController> logger) : ControllerBase
{
    private const string Config = "platform_config";
    private static readonly string[] UserStatuses = ["ACTIVE", "SUSPENDED", "CLOSED"];
    private CurrentUser Me => CurrentUser.From(User)!;

    /// <summary>Lista usuarios (clientes) con paginación. Filtro opcional: status.</summary>
    [HttpGet("users")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? status = null, CancellationToken ct = default)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var (items, total) = await ledger.ListClientsAsync(page, pageSize, status?.ToUpperInvariant(), ct);
        return Ok(new { users = items, page, pageSize, total });
    }

    /// <summary>Administradores del backoffice (tabla administrators de Spanner).</summary>
    [HttpGet("administrators")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAdministrators(CancellationToken ct) => Ok(new { administrators = await ledger.ListAdministratorsAsync(ct) });

    /// <summary>Detalle del usuario (client_id, auth_subject o código de transferencia) incluyendo sus roles.</summary>
    [HttpGet("users/{id}")]
    [ProducesResponseType(typeof(ClientDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUser(string id, CancellationToken ct)
    {
        var c = await ledger.FindClientAsync(id, ct);
        if (c is null) return this.ProblemJson(404, "User not found", code: "not_found");
        IReadOnlyList<string>? roles = null;
        try { var claims = await identity.GetClaimsAsync(c.AuthSubject, ct); roles = claims is null ? null : IdentityAdmin.RolesOf(claims); }
        catch (Exception e) { logger.LogWarning(e, "Could not read identity claims"); }
        return Ok(new { user = c, roles });
    }

    /// <summary>Activa, suspende o cierra un usuario y congela/cierra su billetera. No elimina ni modifica saldo.</summary>
    [HttpPatch("users/{id}/status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUserStatus(string id, [FromBody] UpdateUserStatusRequest request, CancellationToken ct)
    {
        var status = request.Status.ToUpperInvariant();
        if (!UserStatuses.Contains(status))
            return this.ProblemJson(422, "Invalid status", $"Use one of: {string.Join(", ", UserStatuses)}.", "VALIDATION_ERROR");
        try
        {
            var (old, now) = await adjuster.SetClientStatusAsync(id, status, ct);
            await audit.WriteAsync(Me, "USER_STATUS_CHANGED", "client", id, new { from = old, to = now }, ct: ct);
            return Ok(new { userId = id, previousStatus = old, status = now });
        }
        catch (BackofficeException e) { return this.ProblemJson(e.Status, e.Title, e.Detail, e.Code); }
    }

    /// <summary>Roles disponibles del sistema.</summary>
    [HttpGet("roles")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetRoles() => Ok(new { status = "IMPLEMENTADO", roles = Roles.All });

    /// <summary>Roles asignados a una identidad (custom claim <c>roles</c> en Identity Platform).</summary>
    [HttpGet("users/{id}/roles")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUserRoles(string id, CancellationToken ct)
    {
        var uid = await ResolveUidAsync(id, ct);
        var claims = await identity.GetClaimsAsync(uid, ct);
        return claims is null
            ? this.ProblemJson(404, "Identity not found", code: "not_found")
            : Ok(new { userId = uid, roles = IdentityAdmin.RolesOf(claims) });
    }

    /// <summary>Reemplaza los roles de una identidad. Solo roles del sistema. Surte efecto en el siguiente refresco de token.</summary>
    [HttpPut("users/{id}/roles")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetUserRoles(string id, [FromBody] SetRolesRequest request, CancellationToken ct)
    {
        var roles = request.Roles.Select(r => r.ToUpperInvariant()).Distinct().ToList();
        if (roles.Count == 0 || !IdentityAdmin.AreValid(roles))
            return this.ProblemJson(422, "Invalid roles", $"Use one or more of: {string.Join(", ", Roles.All)}.", "VALIDATION_ERROR");
        var uid = await ResolveUidAsync(id, ct);
        if (uid == Me.Uid && !roles.Contains(Roles.Admin))
            return this.ProblemJson(409, "Cannot remove your own ADMIN role", code: "self_lockout");
        var before = await identity.GetClaimsAsync(uid, ct);
        if (before is null) return this.ProblemJson(404, "Identity not found", code: "not_found");
        await identity.SetRolesAsync(uid, roles, ct);
        await audit.WriteAsync(Me, "USER_ROLES_CHANGED", "identity", uid, new { from = IdentityAdmin.RolesOf(before), to = roles }, ct: ct);
        return Ok(new { userId = uid, roles });
    }

    /// <summary>Configuración de plataforma permitida (no incluye configuración financiera crítica).</summary>
    [HttpGet("configuration")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConfiguration(CancellationToken ct)
    {
        var cfg = await docs.GetAsync(Config, "default", ct) ?? Defaults();
        return Ok(new { configuration = cfg });
    }

    /// <summary>Actualiza campos permitidos de la configuración (merge parcial).</summary>
    [HttpPatch("configuration")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateConfiguration([FromBody] UpdateConfigurationRequest request, CancellationToken ct)
    {
        var cfg = await docs.GetAsync(Config, "default", ct) ?? Defaults();
        var changes = new Dictionary<string, object?>();
        if (request.MaintenanceMode is { } m) changes["maintenanceMode"] = m;
        if (request.NotificationsEnabled is { } n) changes["notificationsEnabled"] = n;
        if (request.SupportEmail is { } e) changes["supportEmail"] = e;
        if (request.SupportHours is { } h) changes["supportHours"] = h;
        if (changes.Count == 0) return this.ProblemJson(422, "No changes", "Send at least one configuration field.", "VALIDATION_ERROR");
        foreach (var (k, v) in changes) cfg[k] = v;
        cfg["updatedAt"] = DateTimeOffset.UtcNow.UtcDateTime.ToString("O");
        cfg["updatedBy"] = Me.Uid;
        await docs.UpsertAsync(Config, "default", cfg, ct);
        await audit.WriteAsync(Me, "PLATFORM_CONFIG_CHANGED", "platform_config", "default", changes, ct: ct);
        return Ok(new { configuration = cfg });
    }

    /// <summary>Eventos de auditoría (más recientes primero).</summary>
    [HttpGet("audit-events")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuditEvents([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? action = null, CancellationToken ct = default)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        var all = await audit.ListAsync(500, ct);
        var filtered = all.Where(e => action is null || e["action"]?.ToString() == action).ToList();
        return Ok(new { events = filtered.Skip((page - 1) * pageSize).Take(pageSize), page, pageSize, total = filtered.Count });
    }

    /// <summary>Detalle de un evento de auditoría.</summary>
    [HttpGet("audit-events/{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAuditEvent(string id, CancellationToken ct)
    {
        var e = await audit.GetAsync(id, ct);
        return e is null ? this.ProblemJson(404, "Audit event not found", code: "not_found") : Ok(e);
    }

    /// <summary>The identity uid is the client's auth_subject; accept a client_id/transfer code too.</summary>
    private async Task<string> ResolveUidAsync(string id, CancellationToken ct) =>
        (await ledger.FindClientAsync(id, ct))?.AuthSubject ?? id;

    private static Dictionary<string, object?> Defaults() => new()
    {
        ["maintenanceMode"] = false, ["notificationsEnabled"] = true, ["supportEmail"] = null, ["supportHours"] = "L-V 08:00-18:00 America/Bogota",
    };
}
