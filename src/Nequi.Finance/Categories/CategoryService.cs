using System.Globalization;
using Nequi.Finance.Common;
using Nequi.Shared.Data;

namespace Nequi.Finance.Categories;

public enum CategoryCreateOutcome { Created, Duplicate, InvalidName }
public enum CategoryUpdateOutcome { Updated, NotFound, ForbiddenSystem, TypeImmutable, Duplicate, InvalidName, NothingToUpdate }
public enum CategoryDeleteOutcome { Deactivated, NotFound, ForbiddenSystem }

/// <summary>
/// Personal category catalogue. Documents live in Firestore; name uniqueness per owner+type is
/// enforced with an atomic reservation document (category_keys). Deletion is a soft delete so
/// historical movement/budget references remain resolvable.
/// </summary>
public sealed class CategoryService(IDocumentStore docs, MovementReader movements)
{
    private const int MaxOwnDocuments = 1_000;
    private const int MaxSystemDocuments = 200;

    public async Task<IReadOnlyList<CategoryDto>> ListAsync(
        string owner, bool includeInactive, CancellationToken ct)
    {
        var documents = await ReadDocumentsAsync(owner, ct);
        var stats = await ReadStatsAsync(owner, ct);

        return documents
            .Where(c => includeInactive || c.Active)
            .OrderBy(c => c.IsSystem ? 0 : 1)
            .ThenBy(c => c.Name, StringComparer.CurrentCultureIgnoreCase)
            .Select(c =>
            {
                stats.TryGetValue(c.Id, out var s);
                return c.ToDto(s.Count, s.Total);
            })
            .ToList();
    }

    /// <summary>Id → display name for own + system categories (including deactivated ones).</summary>
    public async Task<IReadOnlyDictionary<string, string>> GetNameMapAsync(string owner, CancellationToken ct)
    {
        var documents = await ReadDocumentsAsync(owner, ct);
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var document in documents) map[document.Id] = document.Name;
        return map;
    }

    /// <summary>Returns a category only when it belongs to the owner or is a system category.</summary>
    public async Task<CategoryDto?> FindAccessibleAsync(string owner, string id, CancellationToken ct)
    {
        var document = await ReadAccessibleAsync(owner, id, ct);
        return document?.ToDto();
    }

    public async Task<(CategoryCreateOutcome Outcome, CategoryDto? Category)> CreateAsync(
        string owner, CreateCategoryRequest request, CancellationToken ct)
    {
        var name = StableKeys.NormalizeName(request.Name, 40);
        var type = request.Type;
        if (name is null) return (CategoryCreateOutcome.InvalidName, null);

        var nameKey = StableKeys.NameKey(name);
        var keyId = StableKeys.Of("category", owner, type, nameKey);
        var categoryId = Guid.NewGuid().ToString();
        var now = DateTimeOffset.UtcNow;

        var reserved = await TryReserveKeyAsync(owner, type, nameKey, keyId, categoryId, ct);
        if (!reserved) return (CategoryCreateOutcome.Duplicate, null);

        var document = new CategoryDocument(
            categoryId, owner, name, type,
            IsSystem: false, Active: true, Scope: CategoryCollections.ScopeClient,
            CreatedAt: now, UpdatedAt: now);

        try
        {
            var created = await docs.CreateIfAbsentAsync(
                CategoryCollections.Categories, categoryId, document.ToDocument(), ct);
            if (!created)
            {
                await docs.DeleteAsync(CategoryCollections.Keys, keyId, ct);
                return (CategoryCreateOutcome.Duplicate, null);
            }
        }
        catch
        {
            // Compensate the reservation so a failed write does not block the name forever.
            await docs.DeleteAsync(CategoryCollections.Keys, keyId, CancellationToken.None);
            throw;
        }

        return (CategoryCreateOutcome.Created, document.ToDto());
    }

    public async Task<(CategoryUpdateOutcome Outcome, CategoryDto? Category)> UpdateAsync(
        string owner, string id, UpdateCategoryRequest request, CancellationToken ct)
    {
        if (request.Name is null && request.Type is null)
            return (CategoryUpdateOutcome.NothingToUpdate, null);

        var existing = await ReadAccessibleAsync(owner, id, ct);
        if (existing is null) return (CategoryUpdateOutcome.NotFound, null);
        if (existing.IsSystem) return (CategoryUpdateOutcome.ForbiddenSystem, null);

        var type = request.Type ?? existing.Type;
        if (!string.Equals(type, existing.Type, StringComparison.Ordinal))
            return (CategoryUpdateOutcome.TypeImmutable, null);

        var name = request.Name is null ? existing.Name : StableKeys.NormalizeName(request.Name, 40);
        if (name is null) return (CategoryUpdateOutcome.InvalidName, null);

        var nameKey = StableKeys.NameKey(name);
        var oldKeyId = KeyId(owner, existing.Type, StableKeys.NameKey(existing.Name));
        var newKeyId = KeyId(owner, existing.Type, nameKey);
        var renamed = !string.Equals(nameKey, StableKeys.NameKey(existing.Name), StringComparison.Ordinal);

        if (renamed)
        {
            var reserved = await TryReserveKeyAsync(owner, existing.Type, nameKey, newKeyId, id, ct);
            if (!reserved) return (CategoryUpdateOutcome.Duplicate, null);
        }

        var updated = existing with { Name = name, UpdatedAt = DateTimeOffset.UtcNow };
        try
        {
            await docs.UpsertAsync(
                CategoryCollections.Categories, id, updated.ToDocument(), ct);
        }
        catch
        {
            if (renamed) await docs.DeleteAsync(CategoryCollections.Keys, newKeyId, CancellationToken.None);
            throw;
        }

        if (renamed && oldKeyId != newKeyId)
            await docs.DeleteAsync(CategoryCollections.Keys, oldKeyId, CancellationToken.None);

        return (CategoryUpdateOutcome.Updated, updated.ToDto());
    }

    /// <summary>Soft delete: the category is deactivated, never removed, so history stays intact.</summary>
    public async Task<CategoryDeleteOutcome> DeactivateAsync(string owner, string id, CancellationToken ct)
    {
        var existing = await ReadAccessibleAsync(owner, id, ct);
        if (existing is null) return CategoryDeleteOutcome.NotFound;
        if (existing.IsSystem) return CategoryDeleteOutcome.ForbiddenSystem;

        var updated = existing with { Active = false, UpdatedAt = DateTimeOffset.UtcNow };
        await docs.UpsertAsync(
            CategoryCollections.Categories, id,
            updated.ToDocument(), ct);

        // Release the name so a new ACTIVE category can reuse it; historical references keep
        // resolving by id (soft delete).
        await docs.DeleteAsync(
            CategoryCollections.Keys, KeyId(owner, existing.Type, StableKeys.NameKey(existing.Name)), ct);
        return CategoryDeleteOutcome.Deactivated;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private async Task<List<CategoryDocument>> ReadDocumentsAsync(string owner, CancellationToken ct)
    {
        var own = await docs.QueryEqualsAsync(
            CategoryCollections.Categories, "clientId", owner, MaxOwnDocuments, ct);
        var system = await docs.QueryEqualsAsync(
            CategoryCollections.Categories, "scope", CategoryCollections.ScopeSystem, MaxSystemDocuments, ct);

        var result = new List<CategoryDocument>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var row in own.Concat(system))
        {
            var id = CategoryDocument.Str(row, "id");
            if (string.IsNullOrWhiteSpace(id) || !seen.Add(id)) continue;
            var document = CategoryDocument.From(id, row);
            if (document is not null) result.Add(document);
        }
        return result;
    }

    private async Task<CategoryDocument?> ReadAccessibleAsync(string owner, string id, CancellationToken ct)
    {
        var row = await docs.GetAsync(CategoryCollections.Categories, id, ct);
        if (row is null) return null;
        var document = CategoryDocument.From(id, row);
        if (document is null) return null;
        if (!document.IsSystem && !string.Equals(document.ClientId, owner, StringComparison.Ordinal))
            return null; // never reveal that another client's category exists
        return document;
    }

    private async Task<Dictionary<string, (int Count, long Total)>> ReadStatsAsync(string owner, CancellationToken ct)
    {
        var confirmed = await movements.ReadConfirmedAsync(owner, ct);
        return confirmed
            .Where(m => !string.IsNullOrWhiteSpace(m.CategoryId))
            .GroupBy(m => m.CategoryId!, StringComparer.Ordinal)
            .ToDictionary(
                g => g.Key,
                g => (g.Count(), g.Sum(m => Math.Abs(m.AmountCents))),
                StringComparer.Ordinal);
    }

    /// <summary>Reserves the (owner,type,normalized-name) key. Cleans stale reservations left by a failed write.</summary>
    private async Task<bool> TryReserveKeyAsync(
        string owner, string type, string nameKey, string keyId, string categoryId, CancellationToken ct)
    {
        var payload = new Dictionary<string, object?>
        {
            ["categoryId"] = categoryId,
            ["clientId"] = owner,
            ["type"] = type,
            ["nameKey"] = nameKey,
            ["createdAt"] = DateTimeOffset.UtcNow.ToString("O", CultureInfo.InvariantCulture),
        };

        if (await docs.CreateIfAbsentAsync(CategoryCollections.Keys, keyId, payload, ct)) return true;

        var existing = await docs.GetAsync(CategoryCollections.Keys, keyId, ct);
        var existingCategoryId = existing is null ? null : CategoryDocument.Str(existing, "categoryId");
        if (existingCategoryId is null) return false; // key exists but is unreadable: treat as taken

        var category = await docs.GetAsync(CategoryCollections.Categories, existingCategoryId, ct);
        if (category is not null) return false; // real duplicate

        // Stale reservation (category write failed): remove and retry once.
        await docs.DeleteAsync(CategoryCollections.Keys, keyId, ct);
        return await docs.CreateIfAbsentAsync(CategoryCollections.Keys, keyId, payload, ct);
    }

    private static string KeyId(string owner, string type, string nameKey) =>
        StableKeys.Of("category", owner, type, nameKey);
}
