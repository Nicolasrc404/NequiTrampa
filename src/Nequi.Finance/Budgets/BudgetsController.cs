using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Finance.Common;
using Nequi.Shared.Http;
using Nequi.Shared.Security;

namespace Nequi.Finance.Budgets;

/// <summary>
/// Presupuestos mensuales de gasto del cliente autenticado. Crear o editar un presupuesto
/// no modifica saldos: el consumo se calcula desde movimientos confirmados.
/// </summary>
[ApiController]
[Route("v1/budgets")]
[Authorize(Policy = Policies.Client)]
[Produces("application/json")]
public sealed class BudgetsController(
    BudgetService service, ClientIdentityResolver identities) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<BudgetDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List([FromQuery] string? period, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(period) && !MonthPeriod.TryParse(period, out _))
            return this.ProblemJson(400, "Invalid period", "period must use the YYYY-MM format.", "invalid_period");

        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        return Ok(await service.ListAsync(owner, period, ct));
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(BudgetDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(string id, CancellationToken ct)
    {
        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        var budget = await service.GetAsync(owner, id, ct);
        return budget is null
            ? this.ProblemJson(404, "Budget not found", "No budget with this id belongs to you.", "BUDGET_NOT_FOUND")
            : Ok(budget);
    }

    [HttpPost]
    [ProducesResponseType(typeof(BudgetDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Create([FromBody] CreateBudgetRequest request, CancellationToken ct)
    {
        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        var (outcome, budget) = await service.CreateAsync(owner, request, ct);
        return outcome switch
        {
            BudgetCreateOutcome.Created => Created($"/v1/budgets/{budget!.Id}", budget),
            BudgetCreateOutcome.Duplicate => this.ProblemJson(
                409, "Budget already exists",
                "You already have a budget for this category and period.", "BUDGET_DUPLICATE"),
            BudgetCreateOutcome.InvalidCategory => this.ProblemJson(
                422, "Invalid category",
                "The category does not exist, is inactive or does not belong to you.", "INVALID_CATEGORY"),
            _ => this.ProblemJson(
                422, "Invalid period", "period must use the YYYY-MM format.", "VALIDATION_ERROR"),
        };
    }

    [HttpPatch("{id}")]
    [ProducesResponseType(typeof(BudgetDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Update(
        string id, [FromBody] UpdateBudgetRequest request, CancellationToken ct)
    {
        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        var (outcome, budget) = await service.UpdateAsync(owner, id, request, ct);
        return outcome switch
        {
            BudgetUpdateOutcome.Updated => Ok(budget),
            BudgetUpdateOutcome.NotFound => this.ProblemJson(
                404, "Budget not found", "No budget with this id belongs to you.", "BUDGET_NOT_FOUND"),
            BudgetUpdateOutcome.ImmutableScope => this.ProblemJson(
                422, "Budget scope is immutable",
                "categoryId and period cannot be changed; create a new budget instead.",
                "BUDGET_SCOPE_IMMUTABLE"),
            BudgetUpdateOutcome.NothingToUpdate => this.ProblemJson(
                422, "Nothing to update", "Send 'limitCents'.", "VALIDATION_ERROR"),
            _ => this.ProblemJson(
                422, "Invalid period", "The stored period is not a valid YYYY-MM value.", "VALIDATION_ERROR"),
        };
    }
}
