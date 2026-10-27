using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Nequi.Shared.Data;

namespace Nequi.Tests;

/// <summary>Shared helpers for the Phase 4 domain tests (Finance + Wallet).</summary>
internal static class Phase4
{
    public static HttpClient Client(
        this WebApplicationFactory<Nequi.Finance.FinanceMarker> factory,
        string uid, string role = "CLIENTE", string? clientId = null)
    {
        var client = factory.CreateClient();
        client.As(uid, role);
        if (clientId is not null) client.DefaultRequestHeaders.Add("X-Demo-Client-Id", clientId);
        return client;
    }

    public static HttpClient Client(
        this WebApplicationFactory<Nequi.Wallet.WalletMarker> factory,
        string uid, string role = "CLIENTE", string? clientId = null)
    {
        var client = factory.CreateClient();
        client.As(uid, role);
        if (clientId is not null) client.DefaultRequestHeaders.Add("X-Demo-Client-Id", clientId);
        return client;
    }

    public static HttpContent Json(object body) => JsonContent.Create(body);

    /// <summary>POST helper; adds Idempotency-Key only when provided.</summary>
    public static HttpRequestMessage Post(string path, object body, string? idempotencyKey = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(body) };
        if (!string.IsNullOrWhiteSpace(idempotencyKey))
            request.Headers.Add("Idempotency-Key", idempotencyKey);
        return request;
    }

    public static async Task<JsonElement> BodyAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    public static async Task<string> ProblemCodeAsync(HttpResponseMessage response) =>
        (await BodyAsync(response)).GetProperty("code").GetString() ?? "";

    public static async Task SeedMovementAsync(
        IServiceProvider services,
        string clientId,
        string eventId,
        long amountCents,
        DateTimeOffset occurredAt,
        string status = "COMPLETED",
        string? categoryId = null,
        string? description = null)
    {
        var docs = services.GetRequiredService<IDocumentStore>();
        var data = new Dictionary<string, object?>
        {
            ["eventId"] = eventId,
            ["operationId"] = $"op-{eventId}",
            ["clientId"] = clientId,
            ["type"] = amountCents >= 0 ? "RECHARGE_COMPLETED" : "TRANSFER_COMPLETED",
            ["amountCents"] = amountCents,
            ["currency"] = "COP",
            ["description"] = description,
            ["balanceAfterCents"] = 0L,
            ["occurredAt"] = occurredAt.ToUniversalTime().ToString("O"),
            ["syncStatus"] = "SYNCED",
            ["status"] = status,
        };
        if (categoryId is not null) data["categoryId"] = categoryId;

        await docs.CreateIfAbsentAsync("financial_movements", eventId, data, default);
    }

    public static async Task SeedSystemCategoryAsync(
        IServiceProvider services, string id, string name, string type)
    {
        var docs = services.GetRequiredService<IDocumentStore>();
        await docs.CreateIfAbsentAsync("categories", id, new Dictionary<string, object?>
        {
            ["id"] = id,
            ["clientId"] = null,
            ["name"] = name,
            ["type"] = type,
            ["isSystem"] = true,
            ["active"] = true,
            ["scope"] = "SYSTEM",
            ["createdAt"] = DateTimeOffset.UtcNow.ToString("O"),
            ["updatedAt"] = DateTimeOffset.UtcNow.ToString("O"),
        }, default);
    }

    public static string NewClient() => $"client-{Guid.NewGuid():N}";
}

/// <summary>
/// Delegating document store that can simulate a storage failure on CreateIfAbsent
/// (used to verify compensation of uniqueness reservations).
/// </summary>
internal sealed class FlakyDocumentStore(IDocumentStore inner) : IDocumentStore
{
    public Func<string, string, bool>? FailCreate { get; set; }

    /// <summary>Runs before a create is forwarded; lets a test hold a write in flight.</summary>
    public Func<string, string, CancellationToken, Task>? BeforeCreateAsync { get; set; }

    public async Task<bool> CreateIfAbsentAsync(string collection, string id, IDictionary<string, object?> data, CancellationToken ct)
    {
        if (FailCreate?.Invoke(collection, id) == true) throw new IOException("simulated Firestore failure");
        if (BeforeCreateAsync is not null) await BeforeCreateAsync(collection, id, ct);
        return await inner.CreateIfAbsentAsync(collection, id, data, ct);
    }

    public Task UpsertAsync(string collection, string id, IDictionary<string, object?> data, CancellationToken ct) =>
        inner.UpsertAsync(collection, id, data, ct);

    public Task<IDictionary<string, object?>?> GetAsync(string collection, string id, CancellationToken ct) =>
        inner.GetAsync(collection, id, ct);

    public Task<bool> DeleteAsync(string collection, string id, CancellationToken ct) =>
        inner.DeleteAsync(collection, id, ct);

    public Task<IReadOnlyList<IDictionary<string, object?>>> QueryEqualsAsync(
        string collection, string field, object value, int limit, CancellationToken ct) =>
        inner.QueryEqualsAsync(collection, field, value, limit, ct);

    public Task<IReadOnlyList<IDictionary<string, object?>>> QueryOrderedAsync(
        string collection, string field, object value,
        string orderByField, int limit, CancellationToken ct) =>
        inner.QueryOrderedAsync(collection, field, value, orderByField, limit, ct);

    public Task<IReadOnlyList<IDictionary<string, object?>>> ListAsync(
        string collection, string orderByField, int limit, CancellationToken ct) =>
        inner.ListAsync(collection, orderByField, limit, ct);

    public Task PingAsync(CancellationToken ct) => inner.PingAsync(ct);
}
