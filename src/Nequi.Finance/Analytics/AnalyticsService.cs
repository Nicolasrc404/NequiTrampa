using System.Globalization;
using Nequi.Finance.Categories;
using Nequi.Finance.Common;

namespace Nequi.Finance.Analytics;

public sealed record AnalyticsSummaryDto(
    string Period,
    string PeriodLabel,
    string Currency,
    long IncomeCents,
    long ExpenseCents,
    long NetCents,
    int MovementCount,
    long AverageDailyExpenseCents,
    string PreviousPeriod,
    string PreviousPeriodLabel,
    long PreviousIncomeCents,
    long PreviousExpenseCents,
    int? IncomeChangePercent,
    int? ExpenseChangePercent,
    DateTimeOffset GeneratedAt);

public sealed record AnalyticsCategoryDto(
    string? CategoryId,
    string Name,
    long AmountCents,
    int Percent,
    int MovementCount);

public sealed record AnalyticsCategoriesDto(
    string Period,
    string PeriodLabel,
    string Currency,
    long TotalExpenseCents,
    long UncategorizedCents,
    IReadOnlyList<AnalyticsCategoryDto> Categories);

public sealed record AnalyticsTrendWeekDto(
    int Week,
    string Label,
    long IncomeCents,
    long ExpenseCents);

public sealed record AnalyticsTrendsDto(
    string Period,
    string PeriodLabel,
    string Currency,
    IReadOnlyList<AnalyticsTrendWeekDto> Weeks);

/// <summary>
/// Read-only analytics over CONFIRMED movements of a single client. Pending, failed or unknown
/// states are never mixed in. Periods are calendar months in the business timezone.
/// Cash register entries are intentionally excluded: they are not bank movements.
/// </summary>
public sealed class AnalyticsService(MovementReader movements, CategoryService categories)
{
    private static readonly string[] MonthNames =
    [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];

    public async Task<AnalyticsSummaryDto> GetSummaryAsync(
        string owner, string? periodFilter, CancellationToken ct)
    {
        var period = ResolvePeriod(periodFilter);
        var confirmed = await movements.ReadConfirmedAsync(owner, ct);
        var current = InPeriod(confirmed, period);
        var previous = InPeriod(confirmed, period.Previous);

        var income = current.Sum(m => m.IncomeCents);
        var expense = current.Sum(m => m.ExpenseCents);
        var previousIncome = previous.Sum(m => m.IncomeCents);
        var previousExpense = previous.Sum(m => m.ExpenseCents);

        return new AnalyticsSummaryDto(
            period.Key,
            Label(period),
            "COP",
            income,
            expense,
            income - expense,
            current.Count,
            expense / Math.Max(1, period.DaysInMonth),
            period.Previous.Key,
            Label(period.Previous),
            previousIncome,
            previousExpense,
            ChangePercent(income, previousIncome),
            ChangePercent(expense, previousExpense),
            DateTimeOffset.UtcNow);
    }

    public async Task<AnalyticsCategoriesDto> GetCategoriesAsync(
        string owner, string? periodFilter, CancellationToken ct)
    {
        var period = ResolvePeriod(periodFilter);
        var confirmed = await movements.ReadConfirmedAsync(owner, ct);
        var names = await categories.GetNameMapAsync(owner, ct);

        var expenses = InPeriod(confirmed, period).Where(m => m.ExpenseCents > 0).ToList();
        var total = expenses.Sum(m => m.ExpenseCents);
        var uncategorized = expenses.Where(m => string.IsNullOrWhiteSpace(m.CategoryId)).Sum(m => m.ExpenseCents);

        var grouped = expenses
            .Where(m => !string.IsNullOrWhiteSpace(m.CategoryId))
            .GroupBy(m => m.CategoryId!, StringComparer.Ordinal)
            .Select(g =>
            {
                var amount = g.Sum(m => m.ExpenseCents);
                return new AnalyticsCategoryDto(
                    g.Key,
                    names.TryGetValue(g.Key, out var name) ? name : "Sin categoría",
                    amount,
                    Percent(amount, total),
                    g.Count());
            })
            .OrderByDescending(c => c.AmountCents)
            .ThenBy(c => c.Name, StringComparer.CurrentCultureIgnoreCase)
            .ToList();

        return new AnalyticsCategoriesDto(
            period.Key,
            Label(period),
            "COP",
            total,
            uncategorized,
            grouped);
    }

    public async Task<AnalyticsTrendsDto> GetTrendsAsync(
        string owner, string? periodFilter, CancellationToken ct)
    {
        var period = ResolvePeriod(periodFilter);
        var confirmed = await movements.ReadConfirmedAsync(owner, ct);
        var current = InPeriod(confirmed, period).ToList();

        var weeks = new List<AnalyticsTrendWeekDto>(period.WeekCount);
        for (var week = 1; week <= period.WeekCount; week++)
        {
            var inWeek = current
                .Where(m => period.WeekOfMonth(FinanceTime.ToBusinessTime(m.OccurredAt)) == week)
                .ToList();

            weeks.Add(new AnalyticsTrendWeekDto(
                week,
                $"S{week}",
                inWeek.Sum(m => m.IncomeCents),
                inWeek.Sum(m => m.ExpenseCents)));
        }

        return new AnalyticsTrendsDto(period.Key, Label(period), "COP", weeks);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    public static MonthPeriod ResolvePeriod(string? filter) =>
        MonthPeriod.TryParse(filter, out var parsed)
            ? parsed
            : CurrentPeriod();

    public static bool IsValidPeriod(string? filter) =>
        string.IsNullOrWhiteSpace(filter) || MonthPeriod.TryParse(filter, out _);

    public static MonthPeriod CurrentPeriod()
    {
        var now = FinanceTime.ToBusinessTime(DateTimeOffset.UtcNow);
        return MonthPeriod.TryParse(now.ToString("yyyy-MM", CultureInfo.InvariantCulture), out var period)
            ? period
            : throw new InvalidOperationException("Unable to resolve the current business period.");
    }

    public static string Label(MonthPeriod period) =>
        $"{MonthNames[period.Month - 1]} de {period.Year}";

    private static List<ConfirmedMovement> InPeriod(
        IReadOnlyList<ConfirmedMovement> source, MonthPeriod period) =>
        source.Where(m => m.OccurredAt >= period.StartInclusive && m.OccurredAt < period.EndExclusive).ToList();

    private static int Percent(long part, long total) =>
        total <= 0 ? 0 : (int)Math.Round(part * 100m / total, MidpointRounding.AwayFromZero);

    private static int? ChangePercent(long current, long previous)
    {
        if (previous <= 0) return null;
        return (int)Math.Round((current - previous) * 100m / previous, MidpointRounding.AwayFromZero);
    }
}

/// <summary>
/// Unattributed expense bucket. Movements without a category (legacy projections or
/// operations the user never classified) are grouped here so the UI can render
/// "Sin categoría" without inventing category names.
/// </summary>
public static class AnalyticsBuckets
{
    public const string UncategorizedName = "Sin categoría";
}
