using System.Globalization;
using Nequi.Finance.Categories;
using Nequi.Finance.Common;

namespace Nequi.Finance.Cash;

public enum CashCreateOutcome { Created, Duplicate, InsufficientCash, InvalidCategory, InvalidDate }

/// <summary>
/// Personal cash register. It is deliberately independent from the wallet: registering cash
/// never credits or debits the Spanner wallet balance and never creates a ledger entry.
/// The available amount is derived from the store's own authoritative summary.
/// </summary>
public sealed class CashService(ICashStore store, CategoryService categories)
{
    private const int DefaultMovementLimit = 100;
    private const int MaxMovementLimit = 500;

    public Task<CashBalanceDto> GetBalanceAsync(string owner, CancellationToken ct) =>
        BuildBalanceAsync(owner, ct);

    /// <summary>
    /// Keyset-paginated history. <paramref name="afterOccurredOn"/>/<paramref name="afterCreatedAt"/>/
    /// <paramref name="afterId"/> must all be <c>null</c> (first page) or all set (the previous
    /// page's last item). Returns one more item than requested internally to detect whether a
    /// next page exists; <c>NextCursor</c> is <c>null</c> once the history is exhausted.
    /// </summary>
    public async Task<(IReadOnlyList<CashMovementDto> Items, string? NextCursor)> ListMovementsAsync(
        string owner, int? limit,
        string? afterOccurredOn, string? afterCreatedAt, string? afterId,
        CancellationToken ct)
    {
        var take = Math.Clamp(limit ?? DefaultMovementLimit, 1, MaxMovementLimit);
        var rows = await store.ReadMovementsAsync(owner, take + 1, afterOccurredOn, afterCreatedAt, afterId, ct);

        var hasMore = rows.Count > take;
        var items = hasMore ? rows.Take(take).ToList() : rows;

        string? nextCursor = null;
        if (hasMore && items.Count > 0)
        {
            var last = items[^1];
            nextCursor = KeysetCursor.Encode(
                last.OccurredOn, last.CreatedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture), last.Id);
        }

        return (items, nextCursor);
    }

    public async Task<(CashCreateOutcome Outcome, CashMovementDto? Movement, CashBalanceDto Balance)>
        CreateAsync(
            string owner,
            CreateCashMovementRequest request,
            string idempotencyKey,
            CancellationToken ct)
    {
        // The HTTP layer already rejects missing keys (IdempotencyActionFilter). This guard
        // keeps direct callers from silently writing an entry that cannot be replayed safely.
        if (string.IsNullOrWhiteSpace(idempotencyKey))
            throw new ArgumentException("Idempotency-Key is required.", nameof(idempotencyKey));

        var occurredOn = request.OccurredOn ?? CashTime.TodayKey();
        if (!CashTime.TryParseDate(occurredOn, out var date))
            return (CashCreateOutcome.InvalidDate, null, await BuildBalanceAsync(owner, ct));

        var today = CashTime.TodayKey();
        if (!string.IsNullOrWhiteSpace(request.OccurredOn) &&
            CashTime.TryParseDate(today, out var todayDate) && date > todayDate)
            return (CashCreateOutcome.InvalidDate, null, await BuildBalanceAsync(owner, ct));

        string? categoryName = null;
        if (!string.IsNullOrWhiteSpace(request.CategoryId))
        {
            var category = await categories.FindAccessibleAsync(owner, request.CategoryId, ct);
            if (category is null || !category.Active)
                return (CashCreateOutcome.InvalidCategory, null, await BuildBalanceAsync(owner, ct));
            categoryName = category.Name;
        }

        var note = StableKeys.NormalizeName(request.Note, 140);

        // Identity of the intention, not of the content: two identical entries declared with
        // different Idempotency-Key values are legitimate independent entries. Repeating the
        // same key replays at the HTTP idempotency filter; the store keeps a second guard for
        // concurrent calls that bypass that filter.
        var dedupeKey = StableKeys.Of("cash", owner, idempotencyKey.Trim());

        var draft = new CashMovementDraft(
            Guid.NewGuid().ToString(),
            request.Direction,
            request.AmountCents,
            request.CategoryId,
            categoryName,
            note,
            occurredOn,
            dedupeKey,
            DateTimeOffset.UtcNow);

        var result = await store.AppendAsync(owner, draft, ct);
        return (
            result.Outcome switch
            {
                CashAppendOutcome.Created => CashCreateOutcome.Created,
                CashAppendOutcome.Duplicate => CashCreateOutcome.Duplicate,
                _ => CashCreateOutcome.InsufficientCash,
            },
            result.Movement,
            ToBalance(result.Account));
    }

    private async Task<CashBalanceDto> BuildBalanceAsync(string owner, CancellationToken ct) =>
        ToBalance(await store.ReadAccountAsync(owner, ct));

    private static CashBalanceDto ToBalance(CashAccountSnapshot account) => new(
        account.AvailableCents,
        account.IncomeCents,
        account.ExpenseCents,
        account.MovementCount,
        "COP",
        account.UpdatedAt == DateTimeOffset.UnixEpoch ? DateTimeOffset.UtcNow : account.UpdatedAt);
}
