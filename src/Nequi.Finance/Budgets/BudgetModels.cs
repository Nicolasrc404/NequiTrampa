using System.ComponentModel.DataAnnotations;
using System.Globalization;
using Nequi.Finance.Common;

namespace Nequi.Finance.Budgets;

public static class BudgetCollections
{
    public const string Budgets = "budgets";
}

public sealed record CreateBudgetRequest(
    [Required(ErrorMessage = "La categoría es obligatoria.")]
    [StringLength(64, MinimumLength = 1, ErrorMessage = "El id de categoría no es válido.")]
    string CategoryId,
    [Required(ErrorMessage = "El periodo es obligatorio.")]
    [RegularExpression(@"^\d{4}-(0[1-9]|1[0-2])$", ErrorMessage = "El periodo debe tener el formato YYYY-MM.")]
    string Period,
    [Range(1, 1_000_000_000_000, ErrorMessage = "El límite debe ser un valor positivo en centavos de COP.")]
    long LimitCents);

/// <summary>Only the limit is editable. Category and period define the budget scope and are immutable.</summary>
public sealed record UpdateBudgetRequest(
    [Range(1, 1_000_000_000_000, ErrorMessage = "El límite debe ser un valor positivo en centavos de COP.")]
    long? LimitCents,
    [StringLength(64, MinimumLength = 1)] string? CategoryId = null,
    [RegularExpression(@"^\d{4}-(0[1-9]|1[0-2])$", ErrorMessage = "El periodo debe tener el formato YYYY-MM.")]
    string? Period = null);

public sealed record BudgetExpenseDto(
    string Id,
    string? Merchant,
    long AmountCents,
    DateTimeOffset OccurredAt);

public sealed record BudgetDto(
    string Id,
    string CategoryId,
    string? CategoryName,
    string Period,
    long LimitCents,
    long SpentCents,
    long RemainingCents,
    int Percent,
    string Health,
    string Currency,
    bool Active,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record BudgetDetailDto(
    string Id,
    string CategoryId,
    string? CategoryName,
    string Period,
    long LimitCents,
    long SpentCents,
    long RemainingCents,
    int Percent,
    string Health,
    int DaysRemaining,
    long DailySuggestedCents,
    string Currency,
    bool Active,
    IReadOnlyList<BudgetExpenseDto> Expenses,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

internal sealed record BudgetDocument(
    string Id,
    string ClientId,
    string CategoryId,
    string? CategoryNameSnapshot,
    string Period,
    long LimitCents,
    bool Active,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    public static BudgetDocument? From(string id, IDictionary<string, object?> d)
    {
        var clientId = Str(d, "clientId");
        var categoryId = Str(d, "categoryId");
        var period = Str(d, "period");
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(categoryId) ||
            string.IsNullOrWhiteSpace(period) || !TryLong(d, "limitCents", out var limit))
            return null;

        var created = ParseDate(Str(d, "createdAt")) ?? DateTimeOffset.UnixEpoch;
        return new BudgetDocument(
            id, clientId, categoryId, Str(d, "categoryName"), period, limit,
            !d.TryGetValue("active", out var a) || a is null || Convert.ToBoolean(a, CultureInfo.InvariantCulture),
            created, ParseDate(Str(d, "updatedAt")) ?? created);
    }

    public Dictionary<string, object?> ToDocument() => new()
    {
        ["id"] = Id,
        ["clientId"] = ClientId,
        ["categoryId"] = CategoryId,
        ["categoryName"] = CategoryNameSnapshot,
        ["period"] = Period,
        ["limitCents"] = LimitCents,
        ["currency"] = "COP",
        ["active"] = Active,
        ["createdAt"] = CreatedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
        ["updatedAt"] = UpdatedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
    };

    internal static string? Str(IDictionary<string, object?> d, string key) =>
        d.TryGetValue(key, out var v) && v is not null ? Convert.ToString(v, CultureInfo.InvariantCulture) : null;

    internal static DateTimeOffset? ParseDate(string? value) =>
        DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed)
            ? parsed
            : null;

    private static bool TryLong(IDictionary<string, object?> d, string key, out long value)
    {
        value = 0;
        if (!d.TryGetValue(key, out var raw) || raw is null) return false;
        try { value = Convert.ToInt64(raw, CultureInfo.InvariantCulture); return true; }
        catch (Exception e) when (e is FormatException or InvalidCastException or OverflowException) { return false; }
    }
}

internal sealed record BudgetComputation(
    long SpentCents,
    long RemainingCents,
    int Percent,
    string Health,
    IReadOnlyList<ConfirmedMovement> Expenses)
{
    public const int WarningThresholdPercent = 80;

    public static BudgetComputation For(BudgetDocument budget, MonthPeriod period, IReadOnlyList<ConfirmedMovement> confirmed)
    {
        var expenses = confirmed
            .Where(m => m.ExpenseCents > 0 &&
                        string.Equals(m.CategoryId, budget.CategoryId, StringComparison.Ordinal) &&
                        m.OccurredAt >= period.StartInclusive && m.OccurredAt < period.EndExclusive)
            .OrderByDescending(m => m.OccurredAt)
            .ToList();

        var spent = expenses.Sum(m => m.ExpenseCents);
        var percent = budget.LimitCents <= 0 ? 0 : (int)(spent * 100m / budget.LimitCents);
        var health = spent > budget.LimitCents
            ? "exceeded"
            : percent >= WarningThresholdPercent ? "warning" : "on-track";

        return new BudgetComputation(spent, budget.LimitCents - spent, percent, health, expenses);
    }
}
