using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Finance.Common;
using Nequi.Shared.Http;
using Nequi.Shared.Security;

namespace Nequi.Finance.Goals;

/// <summary>
/// Metas de ahorro personales del cliente autenticado. Son informativas: crearlas o editarlas
/// no aparta, transfiere ni bloquea dinero y no genera asientos contables.
/// </summary>
[ApiController]
[Route("v1/goals")]
[Authorize(Policy = Policies.Client)]
[Produces("application/json")]
public sealed class GoalsController(
    GoalService service, ClientIdentityResolver identities) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<GoalDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        return Ok(await service.ListAsync(owner, ct));
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(GoalDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(string id, CancellationToken ct)
    {
        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        var goal = await service.GetAsync(owner, id, ct);
        return goal is null
            ? this.ProblemJson(404, "Goal not found", "No goal with this id belongs to you.", "GOAL_NOT_FOUND")
            : Ok(goal);
    }

    [HttpPost]
    [ProducesResponseType(typeof(GoalDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Create([FromBody] CreateGoalRequest request, CancellationToken ct)
    {
        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        var (outcome, goal) = await service.CreateAsync(owner, request, ct);
        return outcome switch
        {
            GoalCreateOutcome.Created => Created($"/v1/goals/{goal!.Id}", goal),
            GoalCreateOutcome.Duplicate => this.ProblemJson(
                409, "Goal already exists", "You already have a goal with this name.", "GOAL_DUPLICATE"),
            GoalCreateOutcome.InvalidDate => this.ProblemJson(
                422, "Invalid target date",
                "targetDate must be a valid YYYY-MM-DD date that is not in the past.",
                "INVALID_TARGET_DATE"),
            _ => this.ProblemJson(
                422, "Invalid goal name",
                "The name must contain 2-80 printable characters.",
                "VALIDATION_ERROR"),
        };
    }

    /// <summary>
    /// Actualiza nombre, objetivo, fecha o el ahorro declarado. savedCents es solo informativo.
    /// </summary>
    [HttpPatch("{id}")]
    [ProducesResponseType(typeof(GoalDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Update(
        string id, [FromBody] UpdateGoalRequest request, CancellationToken ct)
    {
        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        var (outcome, goal) = await service.UpdateAsync(owner, id, request, ct);
        return outcome switch
        {
            GoalUpdateOutcome.Updated => Ok(goal),
            GoalUpdateOutcome.NotFound => this.ProblemJson(
                404, "Goal not found", "No goal with this id belongs to you.", "GOAL_NOT_FOUND"),
            GoalUpdateOutcome.Duplicate => this.ProblemJson(
                409, "Goal already exists", "You already have a goal with this name.", "GOAL_DUPLICATE"),
            GoalUpdateOutcome.InvalidDate => this.ProblemJson(
                422, "Invalid target date",
                "targetDate must be a valid YYYY-MM-DD date that is not in the past.",
                "INVALID_TARGET_DATE"),
            GoalUpdateOutcome.NothingToUpdate => this.ProblemJson(
                422, "Nothing to update",
                "Send at least one of name, targetCents, targetDate or savedCents.",
                "VALIDATION_ERROR"),
            _ => this.ProblemJson(
                422, "Invalid goal name",
                "The name must contain 2-80 printable characters.",
                "VALIDATION_ERROR"),
        };
    }
}
