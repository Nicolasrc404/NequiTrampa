using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Backoffice.Services;
using Nequi.Shared.Data;
using Nequi.Shared.Http;
using Nequi.Shared.Security;

namespace Nequi.Backoffice.Controllers.Support;

public sealed record CreateCaseRequest([Required, StringLength(120, MinimumLength = 3)] string Subject, [Required] string ClientId,
    [StringLength(2000)] string? Description, string? Priority);
public sealed record UpdateCaseStatusRequest([Required] string Status);
public sealed record AddMessageRequest([Required, StringLength(2000, MinimumLength = 1)] string Body);
public sealed record AssignCaseRequest([Required] string AssigneeId);
public sealed record EscalateCaseRequest([Required, StringLength(500, MinimumLength = 3)] string Reason);

/// <summary>
/// Gestión de casos de soporte (Firestore: <c>support_cases</c> + <c>support_case_messages</c>).
/// Acceso: SOPORTE, OPERADOR_FINANCIERO, ADMIN. Cada mutación queda en la auditoría.
/// </summary>
[ApiController]
[Route("v1/support/cases")]
[Authorize(Policy = Policies.CanViewSupport)]
[Produces("application/json")]
public sealed class SupportCasesController(IDocumentStore docs, AuditLog audit) : ControllerBase
{
    private const string Cases = "support_cases";
    private const string Messages = "support_case_messages";
    private static readonly string[] Statuses = ["OPEN", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"];
    private static readonly string[] Priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

    private CurrentUser Me => CurrentUser.From(User)!;
    private static string Now() => DateTimeOffset.UtcNow.UtcDateTime.ToString("O");

    /// <summary>Lista casos (más recientes primero). Filtros: status, assignedTo, clientId.</summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCases([FromQuery] string? status, [FromQuery] string? assignedTo, [FromQuery] string? clientId,
        [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        var rows = await docs.ListAsync(Cases, "createdAt", 500, ct);
        var items = rows.Where(r => (status is null || r["status"]?.ToString() == status)
                                    && (assignedTo is null || r["assignedTo"]?.ToString() == assignedTo)
                                    && (clientId is null || r["clientId"]?.ToString() == clientId))
            .Take(Math.Clamp(limit, 1, 200)).ToList();
        return Ok(new { count = items.Count, items });
    }

    /// <summary>Abre un caso a nombre de un cliente.</summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> CreateCase([FromBody] CreateCaseRequest request, CancellationToken ct)
    {
        var priority = (request.Priority ?? "MEDIUM").ToUpperInvariant();
        if (!Priorities.Contains(priority))
            return this.ProblemJson(422, "Invalid priority", $"Use one of: {string.Join(", ", Priorities)}.", "VALIDATION_ERROR");
        var id = "CASE-" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant();
        var doc = new Dictionary<string, object?>
        {
            ["id"] = id, ["clientId"] = request.ClientId, ["subject"] = request.Subject, ["description"] = request.Description,
            ["priority"] = priority, ["status"] = "OPEN", ["assignedTo"] = null, ["escalationLevel"] = 0L,
            ["createdBy"] = Me.Uid, ["createdAt"] = Now(), ["updatedAt"] = Now(),
        };
        await docs.UpsertAsync(Cases, id, doc, ct);
        await audit.WriteAsync(Me, "SUPPORT_CASE_CREATED", "support_case", id, new { request.ClientId, priority }, ct: ct);
        return Created($"/v1/support/cases/{id}", doc);
    }

    /// <summary>Detalle del caso con su conversación.</summary>
    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCase(string id, CancellationToken ct)
    {
        var c = await docs.GetAsync(Cases, id, ct);
        if (c is null) return this.ProblemJson(404, "Case not found", code: "not_found");
        var msgs = (await docs.QueryEqualsAsync(Messages, "caseId", id, 500, ct)).OrderBy(m => m["createdAt"]?.ToString(), StringComparer.Ordinal).ToList();
        return Ok(new { @case = c, messages = msgs });
    }

    /// <summary>Cambia el estado (OPEN, IN_PROGRESS, ESCALATED, RESOLVED, CLOSED). Un caso CLOSED no se reabre.</summary>
    [HttpPatch("{id}/status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCaseStatus(string id, [FromBody] UpdateCaseStatusRequest request, CancellationToken ct)
    {
        var status = request.Status.ToUpperInvariant();
        if (!Statuses.Contains(status))
            return this.ProblemJson(422, "Invalid status", $"Use one of: {string.Join(", ", Statuses)}.", "VALIDATION_ERROR");
        var c = await docs.GetAsync(Cases, id, ct);
        if (c is null) return this.ProblemJson(404, "Case not found", code: "not_found");
        var old = c["status"]?.ToString();
        if (old == "CLOSED") return this.ProblemJson(409, "Case is closed", "Closed cases cannot be reopened.", "case_closed");
        c["status"] = status; c["updatedAt"] = Now();
        await docs.UpsertAsync(Cases, id, c, ct);
        await audit.WriteAsync(Me, "SUPPORT_CASE_STATUS_CHANGED", "support_case", id, new { from = old, to = status }, ct: ct);
        return Ok(c);
    }

    /// <summary>Agrega un mensaje a la conversación del caso.</summary>
    [HttpPost("{id}/messages")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddMessage(string id, [FromBody] AddMessageRequest request, CancellationToken ct)
    {
        var c = await docs.GetAsync(Cases, id, ct);
        if (c is null) return this.ProblemJson(404, "Case not found", code: "not_found");
        if (c["status"]?.ToString() == "CLOSED") return this.ProblemJson(409, "Case is closed", code: "case_closed");
        var mid = Guid.NewGuid().ToString("N");
        var msg = new Dictionary<string, object?> { ["id"] = mid, ["caseId"] = id, ["authorId"] = Me.Uid, ["body"] = request.Body, ["createdAt"] = Now() };
        await docs.UpsertAsync(Messages, mid, msg, ct);
        c["updatedAt"] = Now();
        await docs.UpsertAsync(Cases, id, c, ct);
        return Created($"/v1/support/cases/{id}", msg);
    }

    /// <summary>Asigna el caso a un agente (pasa a IN_PROGRESS si estaba OPEN).</summary>
    [HttpPost("{id}/assignments")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AssignCase(string id, [FromBody] AssignCaseRequest request, CancellationToken ct)
    {
        var c = await docs.GetAsync(Cases, id, ct);
        if (c is null) return this.ProblemJson(404, "Case not found", code: "not_found");
        if (c["status"]?.ToString() == "CLOSED") return this.ProblemJson(409, "Case is closed", code: "case_closed");
        var old = c["assignedTo"]?.ToString();
        c["assignedTo"] = request.AssigneeId;
        if (c["status"]?.ToString() == "OPEN") c["status"] = "IN_PROGRESS";
        c["updatedAt"] = Now();
        await docs.UpsertAsync(Cases, id, c, ct);
        await audit.WriteAsync(Me, "SUPPORT_CASE_ASSIGNED", "support_case", id, new { from = old, to = request.AssigneeId }, ct: ct);
        return Created($"/v1/support/cases/{id}", c);
    }

    /// <summary>Escala el caso al siguiente nivel.</summary>
    [HttpPost("{id}/escalations")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> EscalateCase(string id, [FromBody] EscalateCaseRequest request, CancellationToken ct)
    {
        var c = await docs.GetAsync(Cases, id, ct);
        if (c is null) return this.ProblemJson(404, "Case not found", code: "not_found");
        if (c["status"]?.ToString() is "CLOSED" or "RESOLVED") return this.ProblemJson(409, "Case already finished", code: "case_finished");
        var level = (c.TryGetValue("escalationLevel", out var l) && l is long n ? n : 0L) + 1;
        c["escalationLevel"] = level; c["status"] = "ESCALATED"; c["escalationReason"] = request.Reason; c["updatedAt"] = Now();
        await docs.UpsertAsync(Cases, id, c, ct);
        await audit.WriteAsync(Me, "SUPPORT_CASE_ESCALATED", "support_case", id, new { level, request.Reason }, ct: ct);
        return Created($"/v1/support/cases/{id}", c);
    }
}
