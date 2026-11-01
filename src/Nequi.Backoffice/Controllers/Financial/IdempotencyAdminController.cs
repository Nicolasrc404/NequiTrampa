using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Shared.Http;
using Nequi.Shared.Idempotency;
using Nequi.Shared.Security;

namespace Nequi.Backoffice.Controllers.Financial;

public sealed record StaleIdempotencyKeyDto(string ActorId, string Scope, string Key, DateTimeOffset CreatedAt);

public sealed record ReleaseIdempotencyKeyRequest(
    [Required] string ActorId,
    [Required] string Scope,
    [Required] string Key,
    [Required, StringLength(256, MinimumLength = 5)] string Reason);

/// <summary>
/// Manual resolution for idempotency_records stuck IN_PROGRESS (the owning request crashed
/// before CompleteAsync/AbandonAsync ran - see ARCHITECTURE.md). There is no automatic recovery:
/// this table alone cannot tell whether the underlying financial effect committed, so an
/// OPERADOR_FINANCIERO must check the ledger for the actor/scope first. Releasing a key that
/// actually completed would let a client retry and re-execute the movement.
/// </summary>
[ApiController]
[Authorize(Policy = Policies.CanReverseOperation)]
[Produces("application/json")]
public sealed class IdempotencyAdminController(IIdempotencyStore store) : ControllerBase
{
    private const int DefaultStaleAfterMinutes = 10;
    private const int MaxResults = 200;

    private CurrentUser Me => CurrentUser.From(User)!;

    /// <summary>Claves IN_PROGRESS más viejas que <paramref name="staleAfterMinutes"/>; requieren revisión manual contra el ledger.</summary>
    [HttpGet("v1/admin/idempotency/stale")]
    [ProducesResponseType(typeof(IReadOnlyList<StaleIdempotencyKeyDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListStale([FromQuery] int? staleAfterMinutes, CancellationToken ct)
    {
        var staleAfter = TimeSpan.FromMinutes(staleAfterMinutes is > 0 ? staleAfterMinutes.Value : DefaultStaleAfterMinutes);
        var records = await store.FindStaleInProgressAsync(staleAfter, MaxResults, ct);
        return Ok(records.Select(r => new StaleIdempotencyKeyDto(r.ActorId, r.Scope, r.Key, r.CreatedAt)).ToList());
    }

    /// <summary>
    /// Libera una clave IN_PROGRESS atascada para que un reintento vuelva a ser posible.
    /// Úsalo solo después de confirmar en el ledger que la operación original NO se aplicó;
    /// si ya se aplicó, liberar la clave permite un reintento que la ejecutaría de nuevo.
    /// </summary>
    [HttpPost("v1/admin/idempotency/release")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public Task<IActionResult> Release([FromBody] ReleaseIdempotencyKeyRequest request, CancellationToken ct) =>
        Task.FromResult<IActionResult>(this.ProblemJson(
            StatusCodes.Status409Conflict,
            "Administrative idempotency release is disabled",
            "Release remains disabled until safe financial reconciliation is available. Do not create another Idempotency-Key for an equivalent financial intention.",
            "idempotency_release_disabled"));
}
