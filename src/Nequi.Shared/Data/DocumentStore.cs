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
    Task<IReadOnlyList<IDictionary<string, object?>>> QueryEqualsAsync(string collection, string field, object value, int limit, CancellationToken ct);
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

    public Task<IReadOnlyList<IDictionary<string, object?>>> QueryEqualsAsync(string collection, string field, object value, int limit, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<IDictionary<string, object?>>>(Col(collection).Values
            .Where(d => d.TryGetValue(field, out var v) && Equals(v, value)).Take(limit).Select(Copy).ToList());

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

    public async Task<IReadOnlyList<IDictionary<string, object?>>> QueryEqualsAsync(string collection, string field, object value, int limit, CancellationToken ct)
    {
        var snap = await db.Collection(collection).WhereEqualTo(field, value).Limit(limit).GetSnapshotAsync(ct);
        return snap.Documents.Select(d => (IDictionary<string, object?>)d.ToDictionary().ToDictionary(kv => kv.Key, kv => (object?)kv.Value)).ToList();
    }

    public async Task PingAsync(CancellationToken ct) =>
        await db.Collection("_health").Document("ping").GetSnapshotAsync(ct);
}
