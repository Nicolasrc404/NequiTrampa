using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Backoffice.Services;
using Nequi.Shared.Data;
using Nequi.Shared.Http;
using Nequi.Shared.Security;

namespace Nequi.Backoffice.Controllers.Support;

public sealed record TimelineStep(string At, string Step, string Detail, string? EventId);
public sealed record ProjectionItem(string EventId, string EventType, bool Published, long Attempts, string? LastError, bool Projected);

/// <summary>
/// Investigación de operaciones financieras por parte de SOPORTE (solo lectura sobre Spanner + estado de proyección en Firestore).
/// Regla: SOPORTE puede investigar dinero, pero NO moverlo.
/// </summary>
[ApiController]
[Route("v1/support")]
[Authorize(Policy = Policies.CanViewSupport)]
[Produces("application/json")]
public sealed class SupportInvestigationController(LedgerReader ledger, IDocumentStore docs) : ControllerBase
{
    /// <summary>Estado de una operación financiera (por operation_id o referencia pública).</summary>
    [HttpGet("operations/{id}")]
    [ProducesResponseType(typeof(OperationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOperationStatus(string id, CancellationToken ct)
    {
        var op = await ledger.FindOperationAsync(id, ct);
        return op is null ? this.ProblemJson(404, "Operation not found", code: "not_found") : Ok(op);
    }

    /// <summary>Línea de tiempo: creación en el ledger, asientos, publicación del evento y proyección.</summary>
    [HttpGet("operations/{id}/timeline")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOperationTimeline(string id, CancellationToken ct)
    {
        var op = await ledger.FindOperationAsync(id, ct);
        if (op is null) return this.ProblemJson(404, "Operation not found", code: "not_found");
        var events = await ledger.OutboxAsync(op.OperationId, ct);
        var timeline = new List<TimelineStep>
        {
            new(op.CreatedAt.UtcDateTime.ToString("O"), "LEDGER_OPERATION_CREATED", $"{op.Type} {op.Status}", null),
        };
        foreach (var e in events)
        {
            timeline.Add(new(e.CreatedAt.UtcDateTime.ToString("O"), "OUTBOX_EVENT_RECORDED", e.EventType, e.EventId));
            if (e.PublishedAt is { } p) timeline.Add(new(p.UtcDateTime.ToString("O"), "EVENT_PUBLISHED", e.EventType, e.EventId));
            if (await docs.GetAsync("financial_movements", e.EventId, ct) is { } m)
                timeline.Add(new(m.TryGetValue("occurredAt", out var occ) ? occ?.ToString() ?? "" : "", "PROJECTED_TO_FIRESTORE", e.EventType, e.EventId));
        }
        return Ok(new { operationId = op.OperationId, publicReference = op.PublicReference, timeline = timeline.OrderBy(t => t.At, StringComparer.Ordinal) });
    }

    /// <summary>Compara Spanner (outbox) con Firestore (proyección) para esta operación.</summary>
    [HttpGet("operations/{id}/projection-status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProjectionStatus(string id, CancellationToken ct)
    {
        var op = await ledger.FindOperationAsync(id, ct);
        if (op is null) return this.ProblemJson(404, "Operation not found", code: "not_found");
        var events = await ledger.OutboxAsync(op.OperationId, ct);
        var items = new List<ProjectionItem>();
        foreach (var e in events)
            items.Add(new(e.EventId, e.EventType, e.PublishedAt is not null, e.Attempts, e.LastError,
                await docs.GetAsync("financial_movements", e.EventId, ct) is not null));
        var overall = items.Count == 0 ? "NO_EVENTS" : items.All(i => i.Published && i.Projected) ? "SYNCED" : "PENDING";
        return Ok(new { operationId = op.OperationId, status = overall, events = items });
    }

    /// <summary>Consulta un cliente por client_id, auth_subject o código de transferencia.</summary>
    [HttpGet("clients/{id}")]
    [ProducesResponseType(typeof(ClientDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetClient(string id, CancellationToken ct)
    {
        var c = await ledger.FindClientAsync(id, ct);
        return c is null ? this.ProblemJson(404, "Client not found", code: "not_found") : Ok(c);
    }

    /// <summary>Últimas operaciones del cliente (más recientes primero).</summary>
    [HttpGet("clients/{id}/operations")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetClientOperations(string id, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        var c = await ledger.FindClientAsync(id, ct);
        if (c is null) return this.ProblemJson(404, "Client not found", code: "not_found");
        var ops = await ledger.ClientOperationsAsync(c.ClientId, Math.Clamp(limit, 1, 200), ct);
        return Ok(new { clientId = c.ClientId, count = ops.Count, items = ops });
    }
}
