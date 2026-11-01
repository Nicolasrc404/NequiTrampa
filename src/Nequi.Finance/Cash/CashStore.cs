using System.Globalization;
using Nequi.Finance.Common;

namespace Nequi.Finance.Cash;

/// <summary>
/// Persistence boundary of the personal cash register. Implementations MUST apply the
/// duplicate check, the "expense cannot exceed available cash" rule and the summary update
/// atomically: a rejected or failed entry leaves no partial state.
/// </summary>
public interface ICashStore
{
    Task<CashAccountSnapshot> ReadAccountAsync(string owner, CancellationToken ct);

    /// <summary>
    /// Keyset-paginated history ordered by (occurredOn, createdAt, id), all descending.
    /// Pass every <c>after*</c> value as <c>null</c> to fetch the first page.
    /// </summary>
    Task<IReadOnlyList<CashMovementDto>> ReadMovementsAsync(
        string owner, int limit,
        string? afterOccurredOn, string? afterCreatedAt, string? afterId,
        CancellationToken ct);

    Task<CashAppendResult> AppendAsync(string owner, CashMovementDraft draft, CancellationToken ct);
}

/// <summary>Development/test store: one semaphore per client emulates the atomic transaction.</summary>
public sealed class InMemoryCashStore : ICashStore
{
    private readonly Dictionary<string, CashAccountSnapshot> _accounts = new(StringComparer.Ordinal);
    private readonly Dictionary<string, List<CashMovementDto>> _movements = new(StringComparer.Ordinal);
    private readonly HashSet<string> _dedupe = new(StringComparer.Ordinal);
    private readonly Dictionary<string, SemaphoreSlim> _locks = new(StringComparer.Ordinal);
    private readonly object _gate = new();

    private SemaphoreSlim LockFor(string owner)
    {
        lock (_gate)
        {
            if (!_locks.TryGetValue(owner, out var sem))
            {
                sem = new SemaphoreSlim(1, 1);
                _locks[owner] = sem;
            }
            return sem;
        }
    }

    public Task<CashAccountSnapshot> ReadAccountAsync(string owner, CancellationToken ct)
    {
        lock (_gate)
        {
            return Task.FromResult(_accounts.TryGetValue(owner, out var account)
                ? account
                : CashAccountSnapshot.Empty);
        }
    }

    public Task<IReadOnlyList<CashMovementDto>> ReadMovementsAsync(
        string owner, int limit,
        string? afterOccurredOn, string? afterCreatedAt, string? afterId,
        CancellationToken ct)
    {
        lock (_gate)
        {
            if (!_movements.TryGetValue(owner, out var list)) return Task.FromResult<IReadOnlyList<CashMovementDto>>([]);

            var ordered = list
                .OrderByDescending(m => m.OccurredOn, StringComparer.Ordinal)
                .ThenByDescending(m => CreatedAtKey(m), StringComparer.Ordinal)
                .ThenByDescending(m => m.Id, StringComparer.Ordinal)
                .AsEnumerable();

            if (afterOccurredOn != null)
            {
                ordered = ordered.SkipWhile(m =>
                {
                    var cmp = string.CompareOrdinal(m.OccurredOn, afterOccurredOn);
                    if (cmp != 0) return cmp > 0;
                    cmp = string.CompareOrdinal(CreatedAtKey(m), afterCreatedAt);
                    if (cmp != 0) return cmp > 0;
                    return string.CompareOrdinal(m.Id, afterId) >= 0;
                });
            }

            return Task.FromResult<IReadOnlyList<CashMovementDto>>(ordered.Take(limit).ToList());
        }
    }

    private static string CreatedAtKey(CashMovementDto m) =>
        m.CreatedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture);

    public async Task<CashAppendResult> AppendAsync(string owner, CashMovementDraft draft, CancellationToken ct)
    {
        var sem = LockFor(owner);
        await sem.WaitAsync(ct);
        try
        {
            lock (_gate)
            {
                if (!_dedupe.Add(draft.DedupeKey))
                {
                    return new CashAppendResult(
                        CashAppendOutcome.Duplicate, null,
                        _accounts.TryGetValue(owner, out var dupAccount) ? dupAccount : CashAccountSnapshot.Empty);
                }

                var account = _accounts.TryGetValue(owner, out var current) ? current : CashAccountSnapshot.Empty;
                var balance = account.AvailableCents + draft.SignedCents;
                if (balance < 0)
                {
                    _dedupe.Remove(draft.DedupeKey); // rejected entries do not block a future valid entry
                    return new CashAppendResult(CashAppendOutcome.InsufficientCash, null, account);
                }

                var updated = new CashAccountSnapshot(
                    balance,
                    account.IncomeCents + (draft.SignedCents > 0 ? draft.SignedCents : 0),
                    account.ExpenseCents + (draft.SignedCents < 0 ? -draft.SignedCents : 0),
                    account.MovementCount + 1,
                    draft.CreatedAt);

                var movement = new CashMovementDto(
                    draft.Id, draft.Direction, draft.AmountCents, draft.CategoryId,
                    draft.CategoryName, draft.Note, draft.OccurredOn, balance, draft.CreatedAt);

                _accounts[owner] = updated;
                if (!_movements.TryGetValue(owner, out var list))
                {
                    list = [];
                    _movements[owner] = list;
                }
                list.Add(movement);

                return new CashAppendResult(CashAppendOutcome.Created, movement, updated);
            }
        }
        finally
        {
            sem.Release();
        }
    }
}

/// <summary>
/// Firestore implementation. The account summary, the movement and the duplicate marker are
/// written in a single read-write transaction, so concurrent entries cannot produce a negative
/// balance or double-apply the same declared entry. Firestore holds a PERSONAL record only:
/// no Spanner wallet balance is touched and no ledger entry is created.
/// </summary>
public sealed class FirestoreCashStore(Google.Cloud.Firestore.FirestoreDb db) : ICashStore
{
    public async Task<CashAccountSnapshot> ReadAccountAsync(string owner, CancellationToken ct)
    {
        var snap = await db.Collection(CashCollections.Accounts).Document(owner).GetSnapshotAsync(ct);
        if (!snap.Exists) return CashAccountSnapshot.Empty;
        return CashDocuments.ToSnapshot(
            snap.ToDictionary()!.ToDictionary(kv => kv.Key, kv => (object?)kv.Value));
    }

    public async Task<IReadOnlyList<CashMovementDto>> ReadMovementsAsync(
        string owner, int limit,
        string? afterOccurredOn, string? afterCreatedAt, string? afterId,
        CancellationToken ct)
    {
        // Requires a composite index on (clientId ASC, occurredOn DESC, createdAt DESC, id DESC).
        // No re-clamp here: CashService.MaxMovementLimit is the single ceiling on page size, and
        // it already requests limit+1 to detect a next page - clamping again at the same ceiling
        // would silently drop that lookahead row right at the max page size.
        Google.Cloud.Firestore.Query query = db.Collection(CashCollections.Movements)
            .WhereEqualTo("clientId", owner)
            .OrderByDescending("occurredOn")
            .OrderByDescending("createdAt")
            .OrderByDescending("id");

        if (afterOccurredOn != null)
            query = query.StartAfter(afterOccurredOn, afterCreatedAt, afterId);

        var snap = await query.Limit(limit).GetSnapshotAsync(ct);

        var result = new List<CashMovementDto>(snap.Documents.Count);
        foreach (var document in snap.Documents)
        {
            var data = document.ToDictionary()!.ToDictionary(kv => kv.Key, kv => (object?)kv.Value);
            result.Add(CashDocuments.ToDto(document.Id, data));
        }
        return result;
    }

    public async Task<CashAppendResult> AppendAsync(
        string owner, CashMovementDraft draft, CancellationToken ct)
    {
        var accountRef = db.Collection(CashCollections.Accounts).Document(owner);
        var dedupeRef = db.Collection(CashCollections.Dedupe).Document(draft.DedupeKey);
        var movementRef = db.Collection(CashCollections.Movements).Document(draft.Id);

        return await db.RunTransactionAsync(async transaction =>
        {
            var accountSnap = await transaction.GetSnapshotAsync(accountRef, ct);
            var dedupeSnap = await transaction.GetSnapshotAsync(dedupeRef, ct);

            var account = accountSnap.Exists
                ? CashDocuments.ToSnapshot(accountSnap.ToDictionary()!.ToDictionary(kv => kv.Key, kv => (object?)kv.Value))
                : CashAccountSnapshot.Empty;

            if (dedupeSnap.Exists)
                return new CashAppendResult(CashAppendOutcome.Duplicate, null, account);

            var balance = account.AvailableCents + draft.SignedCents;
            if (balance < 0)
                return new CashAppendResult(CashAppendOutcome.InsufficientCash, null, account);

            var updated = new CashAccountSnapshot(
                balance,
                account.IncomeCents + (draft.SignedCents > 0 ? draft.SignedCents : 0),
                account.ExpenseCents + (draft.SignedCents < 0 ? -draft.SignedCents : 0),
                account.MovementCount + 1,
                draft.CreatedAt);

            transaction.Set(accountRef, CashDocuments.ToDocument(updated, owner));
            transaction.Set(movementRef, new Dictionary<string, object?>(CashDocuments.ToDocument(draft, balance))
            {
                ["clientId"] = owner,
            });
            transaction.Set(dedupeRef, new Dictionary<string, object?>
            {
                ["clientId"] = owner,
                ["movementId"] = draft.Id,
                ["createdAt"] = draft.CreatedAt.ToUniversalTime().ToString("O", System.Globalization.CultureInfo.InvariantCulture),
            });

            var movement = new CashMovementDto(
                draft.Id, draft.Direction, draft.AmountCents, draft.CategoryId,
                draft.CategoryName, draft.Note, draft.OccurredOn, balance, draft.CreatedAt);

            return new CashAppendResult(CashAppendOutcome.Created, movement, updated);
        }, cancellationToken: ct);
    }
}
