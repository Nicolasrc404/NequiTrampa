using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Finance.Common;
using Nequi.Shared.Http;
using Nequi.Shared.Security;

namespace Nequi.Finance.Analytics;

/// <summary>
/// Analítica financiera de solo lectura del cliente autenticado. Nunca modifica saldos ni
/// movimientos y nunca mezcla estados pendientes con confirmados.
/// </summary>
[ApiController]
[Route("v1/analytics")]
[Authorize(Policy = Policies.Client)]
[Produces("application/json")]
public sealed class AnalyticsController(
    AnalyticsService service, ClientIdentityResolver identities) : ControllerBase
{
    /// <summary>Resumen del periodo (mes calendario). Sin 'period' usa el mes en curso.</summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(AnalyticsSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Summary([FromQuery] string? period, CancellationToken ct)
    {
        if (!AnalyticsService.IsValidPeriod(period))
            return this.ProblemJson(400, "Invalid period", "period must use the YYYY-MM format.", "invalid_period");

        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        return Ok(await service.GetSummaryAsync(owner, period, ct));
    }

    /// <summary>Gastos confirmados agrupados por categoría en el periodo.</summary>
    [HttpGet("categories")]
    [ProducesResponseType(typeof(AnalyticsCategoriesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Categories([FromQuery] string? period, CancellationToken ct)
    {
        if (!AnalyticsService.IsValidPeriod(period))
            return this.ProblemJson(400, "Invalid period", "period must use the YYYY-MM format.", "invalid_period");

        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        return Ok(await service.GetCategoriesAsync(owner, period, ct));
    }

    /// <summary>Tendencia semanal de ingresos y gastos confirmados dentro del periodo.</summary>
    [HttpGet("trends")]
    [ProducesResponseType(typeof(AnalyticsTrendsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Trends([FromQuery] string? period, CancellationToken ct)
    {
        if (!AnalyticsService.IsValidPeriod(period))
            return this.ProblemJson(400, "Invalid period", "period must use the YYYY-MM format.", "invalid_period");

        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        return Ok(await service.GetTrendsAsync(owner, period, ct));
    }
}
