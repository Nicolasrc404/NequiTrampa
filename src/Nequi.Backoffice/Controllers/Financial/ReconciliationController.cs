using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Backoffice.Services;
using Nequi.Shared.Data;
using Nequi.Shared.Http;
using Nequi.Shared.Idempotency;
using Nequi.Shared.Security;

namespace Nequi.Backoffice.Controllers.Financial;

/// <param name="Resolution">REQUEUE_EVENT (reencola un evento del outbox), ACKNOWLEDGED (revisado, sin acción), FALSE_POSITIVE (no era una inconsistencia) o ADJUSTED (se corrigió con un ajuste: indicar adjustmentId).</param>
public sealed record ResolveIssueRequest([Required] string Resolution, [Required, StringLength(500, MinimumLength = 3)] string Note, string? AdjustmentId);

/// <summary>
/// Reconciliación para OPERADOR_FINANCIERO. Las inconsistencias se detectan bajo demanda comparando Spanner (saldos, ledger, outbox)
/// con Firestore (proyecciones). Resolver deja un registro trazable y, si aplica, ejecuta la acción formal (reencolar evento).
/// </summary>
[ApiController]
[Route("v1/reconciliation")]
[Authorize(Policy = Policies.CanReverseOperation)]
[Produces("application/json")]
public sealed class ReconciliationController(ReconciliationService recon, LedgerAdjuster adjuster, IDocumentStore docs, AuditLog audit) : ControllerBase
{
    private static readonly string[] Resolutions = ["REQUEUE_EVENT", "ACKNOWLEDGED", "FALSE_POSITIVE", "ADJUSTED"];

    /// <summary>Lista inconsistencias. Por defecto solo las abiertas; use ?status=all para incluir resueltas.</summary>
    [HttpGet("issues")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetIssues([FromQuery] string? status, CancellationToken ct)
    {
        var all = await recon.DetectAsync(ct);
        var items = status == "all" ? all : all.Where(i => i.Status == (status?.ToUpperInvariant() ?? "OPEN")).ToList();
        return Ok(new { count = items.Count, items });
    }

    /// <summary>Detalle de una inconsistencia.</summary>
    [HttpGet("issues/{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetIssue(string id, CancellationToken ct)
    {
        var issue = await recon.FindAsync(id, ct);
        return issue is null ? this.ProblemJson(404, "Issue not found", code: "not_found") : Ok(issue);
    }

    /// <summary>Resuelve una inconsistencia mediante una acción formal con nota. Requiere Idempotency-Key.</summary>
    [HttpPost("issues/{id}/resolve")]
    [TypeFilter(typeof(IdempotencyActionFilter))]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResolveIssue(string id, [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        [FromBody] ResolveIssueRequest request, CancellationToken ct)
    {
        var resolution = request.Resolution.ToUpperInvariant();
        if (!Resolutions.Contains(resolution))
            return this.ProblemJson(422, "Invalid resolution", $"Use one of: {string.Join(", ", Resolutions)}.", "VALIDATION_ERROR");
        var issue = await recon.FindAsync(id, ct);
        if (issue is null) return this.ProblemJson(404, "Issue not found", code: "not_found");
        if (issue.Status == "RESOLVED") return this.ProblemJson(409, "Issue already resolved", code: "already_resolved");
        if (resolution == "ADJUSTED" && string.IsNullOrWhiteSpace(request.AdjustmentId))
            return this.ProblemJson(422, "adjustmentId required", "Resolution ADJUSTED must reference the adjustment that fixed it.", "VALIDATION_ERROR");

        if (resolution == "REQUEUE_EVENT")
        {
            if (issue.Kind != "OUTBOX_STUCK" || issue.Data["eventId"] is not string eventId)
                return this.ProblemJson(422, "Cannot requeue", "REQUEUE_EVENT only applies to OUTBOX_STUCK issues.", "VALIDATION_ERROR");
            if (!await adjuster.RequeueOutboxAsync(eventId, ct))
                return this.ProblemJson(409, "Event already published", code: "already_published");
        }

        var me = CurrentUser.From(User)!;
        if (issue.Kind == ReconciliationService.BalanceKind)
        {
            if (resolution == "REQUEUE_EVENT")
                return this.ProblemJson(422, "Cannot requeue", "REQUEUE_EVENT only applies to OUTBOX_STUCK issues.", "VALIDATION_ERROR");
            var note = request.AdjustmentId is null ? request.Note : $"{request.Note} (adjustment {request.AdjustmentId})";
            await recon.ResolveBalanceIssueAsync(id, resolution == "FALSE_POSITIVE" ? "FALSE_POSITIVE" : "RESOLVED", note, me.Uid, ct);
        }
        var record = new Dictionary<string, object?>
        {
            ["id"] = id, ["kind"] = issue.Kind, ["reference"] = issue.Reference, ["resolution"] = resolution, ["note"] = request.Note,
            ["adjustmentId"] = request.AdjustmentId, ["resolvedBy"] = me.Uid, ["resolvedAt"] = DateTimeOffset.UtcNow.UtcDateTime.ToString("O"),
        };
        await docs.UpsertAsync(ReconciliationService.ResolutionsCollection, id, record, ct);
        await audit.WriteAsync(me, "RECONCILIATION_ISSUE_RESOLVED", "reconciliation_issue", id, new { resolution, request.Note, request.AdjustmentId }, ct: ct);
        return Ok(new { issueId = id, status = "RESOLVED", resolution = record });
    }
}
