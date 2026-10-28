using System.Collections.Concurrent;
using Google.Cloud.Firestore;

namespace Nequi.Shared.Data;

/// <summary>Minimal document API over Firestore (projections, notifications, reports). Never the source of truth for money.</summary>
public interface IDocumentStore
{
    /// <summary>Creates the document; returns false if it already exists (idempotent consumers).</summary>
    Task<bool> CreateIfAbsentAsync(string collection, string id, IDictionary<string, object?> data, CancellationToken ct);
    Task UpsertAsync(string collection, string id, IDictionary<string, object?> data, CancellationToken ct);
    Task<IDictionary<string, object?>?> GetAsync(string collection, string id, CancellationToken ct);

    /// <summary>Deletes the document. Returns false when it did not exist.</summary>
    Task<bool> DeleteAsync(string collection, string id, CancellationToken ct);
    Task<IReadOnlyList<IDictionary<string, object?>>> QueryEqualsAsync(string collection, string field, object value, int limit, CancellationToken ct);

    /// <summary>
    /// Queries documents where <paramref name="field"/> equals <paramref name="value"/>,
    /// ordered by <paramref name="orderByField"/> descending, returning at most <paramref name="limit"/> results.
    /// In Firestore this requires a composite index on (field ASC, orderByField DESC).
    /// </summary>
    Task<IReadOnlyList<IDictionary<string, object?>>> QueryOrderedAsync(
        string collection, string field, object value,
        string orderByField, int limit, CancellationToken ct);

    /// <summary>Lists the newest documents of a collection ordered by <paramref name="orderByField"/> descending (single-field order: no composite index needed).</summary>
    Task<IReadOnlyList<IDictionary<string, object?>>> ListAsync(string collection, string orderByField, int limit, CancellationToken ct);

    /// <summary>
    /// Keyset-paginated variant of <see cref="QueryOrderedAsync"/>: same filter/order, but accepts the
    /// (<paramref name="orderByField"/>, <paramref name="tieBreakerField"/>) values of the last item of the
    /// previous page and returns only documents strictly after that position. Pass both cursor values as
    /// <c>null</c> to fetch the first page. <paramref name="tieBreakerField"/> must be unique per document
    /// (e.g. an event id) so rows sharing the same <paramref name="orderByField"/> value are never skipped
    /// or duplicated across pages.
    /// </summary>
    Task<IReadOnlyList<IDictionary<string, object?>>> QueryOrderedPageAsync(
        string collection, string field, object value,
        string orderByField, string tieBreakerField, int limit,
        string? afterOrderValue, string? afterTieValue, CancellationToken ct);

    Task PingAsync(CancellationToken ct);
}

public sealed class InMemoryDocumentStore : IDocumentStore
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, IDictionary<string, object?>>> _c = new();
    private ConcurrentDictionary<string, IDictionary<string, object?>> Col(string n) => _c.GetOrAdd(n, _ => new());
    private static IDictionary<string, object?> Copy(IDictionary<string, object?> d) => new Dictionary<string, object?>(d);

    public Task<bool> CreateIfAbsentAsync(string collection, string id, IDictionary<string, object?> data, CancellationToken ct) =>
        Task.FromResult(Col(collection).TryAdd(id, Copy(data)));

    public Task UpsertAsync(string collection, string id, IDictionary<string, object?> data, CancellationToken ct)
    {
        Col(collection)[id] = Copy(data);
        return Task.CompletedTask;
    }

    public Task<IDictionary<string, object?>?> GetAsync(string collection, string id, CancellationToken ct) =>
        Task.FromResult(Col(collection).TryGetValue(id, out var d) ? Copy(d) : null);

    public Task<bool> DeleteAsync(string collection, string id, CancellationToken ct) =>
        Task.FromResult(Col(collection).TryRemove(id, out _));

    public Task<IReadOnlyList<IDictionary<string, object?>>> QueryEqualsAsync(string collection, string field, object value, int limit, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<IDictionary<string, object?>>>(Col(collection).Values
            .Where(d => d.TryGetValue(field, out var v) && Equals(v, value)).Take(limit).Select(Copy).ToList());

    public Task<IReadOnlyList<IDictionary<string, object?>>> QueryOrderedAsync(
        string collection, string field, object value,
        string orderByField, int limit, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<IDictionary<string, object?>>>(Col(collection).Values
            .Where(d => d.TryGetValue(field, out var v) && Equals(v, value))
            .OrderByDescending(d => d.TryGetValue(orderByField, out var v) ? v?.ToString() : null)
            .Take(limit)
            .Select(Copy)
            .ToList());

    public Task<IReadOnlyList<IDictionary<string, object?>>> ListAsync(string collection, string orderByField, int limit, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<IDictionary<string, object?>>>(Col(collection).Values
            .OrderByDescending(d => d.TryGetValue(orderByField, out var v) ? v?.ToString() : null)
            .Take(limit).Select(Copy).ToList());

    public Task<IReadOnlyList<IDictionary<string, object?>>> QueryOrderedPageAsync(
        string collection, string field, object value,
        string orderByField, string tieBreakerField, int limit,
        string? afterOrderValue, string? afterTieValue, CancellationToken ct)
    {
        var ordered = Col(collection).Values
            .Where(d => d.TryGetValue(field, out var v) && Equals(v, value))
            .Select(d => (Doc: d,
                Order: d.TryGetValue(orderByField, out var o) ? o?.ToString() : null,
                Tie: d.TryGetValue(tieBreakerField, out var t) ? t?.ToString() : null))
            .OrderByDescending(x => x.Order, StringComparer.Ordinal)
            .ThenByDescending(x => x.Tie, StringComparer.Ordinal)
            .AsEnumerable();

        if (afterOrderValue != null)
        {
            ordered = ordered.SkipWhile(x =>
            {
                var cmp = string.CompareOrdinal(x.Order, afterOrderValue);
                return cmp > 0 || (cmp == 0 && string.CompareOrdinal(x.Tie, afterTieValue) >= 0);
            });
        }

        return Task.FromResult<IReadOnlyList<IDictionary<string, object?>>>(
            ordered.Take(limit).Select(x => Copy(x.Doc)).ToList());
    }

    public Task PingAsync(CancellationToken ct) => Task.CompletedTask;
}

public sealed class FirestoreDocumentStore(FirestoreDb db) : IDocumentStore
{
    public async Task<bool> CreateIfAbsentAsync(string collection, string id, IDictionary<string, object?> data, CancellationToken ct)
    {
        try
        {
            await db.Collection(collection).Document(id).CreateAsync(data, ct);
            return true;
        }
        catch (Grpc.Core.RpcException e) when (e.StatusCode == Grpc.Core.StatusCode.AlreadyExists)
        {
            return false;
        }
    }

    public Task UpsertAsync(string collection, string id, IDictionary<string, object?> data, CancellationToken ct) =>
        db.Collection(collection).Document(id).SetAsync(data, cancellationToken: ct);

    public async Task<IDictionary<string, object?>?> GetAsync(string collection, string id, CancellationToken ct)
    {
        var snap = await db.Collection(collection).Document(id).GetSnapshotAsync(ct);
        return snap.Exists ? snap.ToDictionary()!.ToDictionary(kv => kv.Key, kv => (object?)kv.Value) : null;
    }

    public async Task<bool> DeleteAsync(string collection, string id, CancellationToken ct)
    {
        var reference = db.Collection(collection).Document(id);
        var snap = await reference.GetSnapshotAsync(ct);
        if (!snap.Exists) return false;
        await reference.DeleteAsync(cancellationToken: ct);
        return true;
    }

    public async Task<IReadOnlyList<IDictionary<string, object?>>> QueryEqualsAsync(string collection, string field, object value, int limit, CancellationToken ct)
    {
        var snap = await db.Collection(collection).WhereEqualTo(field, value).Limit(limit).GetSnapshotAsync(ct);
        return snap.Documents.Select(d => (IDictionary<string, object?>)d.ToDictionary().ToDictionary(kv => kv.Key, kv => (object?)kv.Value)).ToList();
    }

    public async Task<IReadOnlyList<IDictionary<string, object?>>> QueryOrderedAsync(
        string collection, string field, object value,
        string orderByField, int limit, CancellationToken ct)
    {
        // Requires a composite index on (field ASC, orderByField DESC) in Firestore.
        var snap = await db.Collection(collection)
            .WhereEqualTo(field, value)
            .OrderByDescending(orderByField)
            .Limit(limit)
            .GetSnapshotAsync(ct);
        return snap.Documents
            .Select(d => (IDictionary<string, object?>)d.ToDictionary().ToDictionary(kv => kv.Key, kv => (object?)kv.Value))
            .ToList();
    }

    public async Task<IReadOnlyList<IDictionary<string, object?>>> ListAsync(string collection, string orderByField, int limit, CancellationToken ct)
    {
        var snap = await db.Collection(collection).OrderByDescending(orderByField).Limit(limit).GetSnapshotAsync(ct);
        return snap.Documents
            .Select(d => (IDictionary<string, object?>)d.ToDictionary().ToDictionary(kv => kv.Key, kv => (object?)kv.Value))
            .ToList();
    }

    public async Task<IReadOnlyList<IDictionary<string, object?>>> QueryOrderedPageAsync(
        string collection, string field, object value,
        string orderByField, string tieBreakerField, int limit,
        string? afterOrderValue, string? afterTieValue, CancellationToken ct)
    {
        // Requires a composite index on (field ASC, orderByField DESC, tieBreakerField DESC) in Firestore.
        Query query = db.Collection(collection)
            .WhereEqualTo(field, value)
            .OrderByDescending(orderByField)
            .OrderByDescending(tieBreakerField);

        if (afterOrderValue != null && afterTieValue != null)
            query = query.StartAfter(afterOrderValue, afterTieValue);

        var snap = await query.Limit(limit).GetSnapshotAsync(ct);
        return snap.Documents
            .Select(d => (IDictionary<string, object?>)d.ToDictionary().ToDictionary(kv => kv.Key, kv => (object?)kv.Value))
            .ToList();
    }

    public async Task PingAsync(CancellationToken ct) =>
        await db.Collection("_health").Document("ping").GetSnapshotAsync(ct);
}
