using System.Globalization;
using Nequi.Finance.Categories;
using Nequi.Finance.Common;
using Nequi.Shared.Data;

namespace Nequi.Finance.Budgets;

public enum BudgetCreateOutcome { Created, Duplicate, InvalidPeriod, InvalidCategory }
public enum BudgetUpdateOutcome { Updated, NotFound, NothingToUpdate, ImmutableScope, InvalidPeriod }

/// <summary>
/// Monthly expense budgets. A budget never moves money: it only references a category and a
/// limit. Consumption is always recomputed from COMPLETED projections; it is never stored.
/// </summary>
public sealed class BudgetService(
    IDocumentStore docs, CategoryService categories, MovementReader movements)
{
    private const int MaxBudgets = 500;

    public async Task<IReadOnlyList<BudgetDto>> ListAsync(
        string owner, string? periodFilter, CancellationToken ct)
    {
        MonthPeriod? filter = null;
        if (!string.IsNullOrWhiteSpace(periodFilter))
        {
            if (!MonthPeriod.TryParse(periodFilter, out var parsed)) return [];
            filter = parsed;
        }

        var documents = await ReadDocumentsAsync(owner, ct);
        var confirmed = await movements.ReadConfirmedAsync(owner, ct);
        var names = await categories.GetNameMapAsync(owner, ct);

        return documents
            .Where(b => filter is null || b.Period == filter.Key)
            .Select(b => ToDto(b, confirmed, names))
            .Where(d => d is not null)
            .Select(d => d!)
            .OrderByDescending(b => b.Period, StringComparer.Ordinal)
            .ThenBy(b => b.CategoryName, StringComparer.CurrentCultureIgnoreCase)
            .ToList();
    }

    public async Task<BudgetDetailDto?> GetAsync(string owner, string id, CancellationToken ct)
    {
        var document = await ReadOwnedAsync(owner, id, ct);
        if (document is null || !MonthPeriod.TryParse(document.Period, out var period)) return null;

        var confirmed = await movements.ReadConfirmedAsync(owner, ct);
        var names = await categories.GetNameMapAsync(owner, ct);
        var computation = BudgetComputation.For(document, period, confirmed);

        return new BudgetDetailDto(
            document.Id,
            document.CategoryId,
            ResolveName(document, names),
            document.Period,
            document.LimitCents,
            computation.SpentCents,
            computation.RemainingCents,
            computation.Percent,
            computation.Health,
            DaysRemaining(period),
            DailySuggestedCents(computation.RemainingCents, period),
            "COP",
            document.Active,
            computation.Expenses.Take(50).Select(e => new BudgetExpenseDto(
                e.EventId, e.Description, e.ExpenseCents, e.OccurredAt)).ToList(),
            document.CreatedAt,
            document.UpdatedAt);
    }

    public async Task<(BudgetCreateOutcome Outcome, BudgetDto? Budget)> CreateAsync(
        string owner, CreateBudgetRequest request, CancellationToken ct)
    {
        if (!MonthPeriod.TryParse(request.Period, out var period))
            return (BudgetCreateOutcome.InvalidPeriod, null);

        var category = await categories.FindAccessibleAsync(owner, request.CategoryId, ct);
        if (category is null || !category.Active)
            return (BudgetCreateOutcome.InvalidCategory, null);

        var id = StableKeys.Of("budget", owner, period.Key, request.CategoryId);
        var now = DateTimeOffset.UtcNow;
        var document = new BudgetDocument(
            id, owner, request.CategoryId, category.Name, period.Key,
            request.LimitCents, Active: true, CreatedAt: now, UpdatedAt: now);

        var created = await docs.CreateIfAbsentAsync(
            BudgetCollections.Budgets, id, document.ToDocument(), ct);
        if (!created) return (BudgetCreateOutcome.Duplicate, null);

        var confirmed = await movements.ReadConfirmedAsync(owner, ct);
        var names = await categories.GetNameMapAsync(owner, ct);
        return (BudgetCreateOutcome.Created, ToDto(document, confirmed, names));
    }

    public async Task<(BudgetUpdateOutcome Outcome, BudgetDto? Budget)> UpdateAsync(
        string owner, string id, UpdateBudgetRequest request, CancellationToken ct)
    {
        if (request.CategoryId is not null || request.Period is not null)
            return (BudgetUpdateOutcome.ImmutableScope, null);
        if (request.LimitCents is null)
            return (BudgetUpdateOutcome.NothingToUpdate, null);

        var document = await ReadOwnedAsync(owner, id, ct);
        if (document is null) return (BudgetUpdateOutcome.NotFound, null);
        if (!MonthPeriod.TryParse(document.Period, out _))
            return (BudgetUpdateOutcome.InvalidPeriod, null);

        var updated = document with
        {
            LimitCents = request.LimitCents.Value,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        await docs.UpsertAsync(BudgetCollections.Budgets, id, updated.ToDocument(), ct);

        var confirmed = await movements.ReadConfirmedAsync(owner, ct);
        var names = await categories.GetNameMapAsync(owner, ct);
        return (BudgetUpdateOutcome.Updated, ToDto(updated, confirmed, names));
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private async Task<List<BudgetDocument>> ReadDocumentsAsync(string owner, CancellationToken ct)
    {
        var rows = await docs.QueryEqualsAsync(BudgetCollections.Budgets, "clientId", owner, MaxBudgets, ct);
        var result = new List<BudgetDocument>();
        foreach (var row in rows)
        {
            var id = BudgetDocument.Str(row, "id");
            if (string.IsNullOrWhiteSpace(id)) continue;
            var document = BudgetDocument.From(id, row);
            if (document is not null) result.Add(document);
        }
        return result;
    }

    private async Task<BudgetDocument?> ReadOwnedAsync(string owner, string id, CancellationToken ct)
    {
        var row = await docs.GetAsync(BudgetCollections.Budgets, id, ct);
        if (row is null) return null;
        var document = BudgetDocument.From(id, row);
        return document is not null && string.Equals(document.ClientId, owner, StringComparison.Ordinal)
            ? document
            : null;
    }

    private static BudgetDto? ToDto(
        BudgetDocument document, IReadOnlyList<ConfirmedMovement> confirmed,
        IReadOnlyDictionary<string, string> names)
    {
        if (!MonthPeriod.TryParse(document.Period, out var period)) return null;
        var computation = BudgetComputation.For(document, period, confirmed);
        return new BudgetDto(
            document.Id,
            document.CategoryId,
            ResolveName(document, names),
            document.Period,
            document.LimitCents,
            computation.SpentCents,
            computation.RemainingCents,
            computation.Percent,
            computation.Health,
            "COP",
            document.Active,
            document.CreatedAt,
            document.UpdatedAt);
    }

    private static string? ResolveName(BudgetDocument document, IReadOnlyDictionary<string, string> names) =>
        names.TryGetValue(document.CategoryId, out var name) ? name : document.CategoryNameSnapshot;

    private static int DaysRemaining(MonthPeriod period)
    {
        var nowUtc = DateTimeOffset.UtcNow;
        var nowLocal = FinanceTime.ToBusinessTime(nowUtc);
        if (period.Year == nowLocal.Year && period.Month == nowLocal.Month)
            return period.DaysRemaining(nowLocal);
        return period.StartInclusive > nowUtc ? period.DaysInMonth : 0;
    }

    private static long DailySuggestedCents(long remainingCents, MonthPeriod period)
    {
        var days = DaysRemaining(period);
        if (days <= 0 || remainingCents <= 0) return 0;
        return remainingCents / days;
    }
}
