using System.Globalization;
using Nequi.Finance.Common;
using Nequi.Shared.Data;

namespace Nequi.Finance.Goals;

public enum GoalCreateOutcome { Created, Duplicate, InvalidName, InvalidDate }
public enum GoalUpdateOutcome { Updated, NotFound, Duplicate, InvalidName, InvalidDate, NothingToUpdate }

/// <summary>
/// Personal savings goals. Goals are informational: creating or updating one never reserves,
/// transfers or blocks money. savedCents is a declared progress figure, not a balance.
/// </summary>
public sealed class GoalService(IDocumentStore docs)
{
    private const int MaxGoals = 500;

    public static DateOnly Today() =>
        DateOnly.FromDateTime(FinanceTime.ToBusinessTime(DateTimeOffset.UtcNow).DateTime);

    public async Task<IReadOnlyList<GoalDto>> ListAsync(string owner, CancellationToken ct)
    {
        var rows = await docs.QueryEqualsAsync(GoalCollections.Goals, "clientId", owner, MaxGoals, ct);
        var today = Today();
        return rows
            .Select(row =>
            {
                var id = GoalDocument.Str(row, "id");
                return string.IsNullOrWhiteSpace(id) ? null : GoalDocument.From(id, row);
            })
            .Where(g => g is not null && string.Equals(g.ClientId, owner, StringComparison.Ordinal))
            .Select(g => g!.ToDto(today))
            .OrderByDescending(g => g.CreatedAt)
            .ToList();
    }

    public async Task<GoalDto?> GetAsync(string owner, string id, CancellationToken ct)
    {
        var document = await ReadOwnedAsync(owner, id, ct);
        return document?.ToDto(Today());
    }

    public async Task<(GoalCreateOutcome Outcome, GoalDto? Goal)> CreateAsync(
        string owner, CreateGoalRequest request, CancellationToken ct)
    {
        var name = StableKeys.NormalizeName(request.Name, 80);
        if (name is null) return (GoalCreateOutcome.InvalidName, null);
        if (!TryParseTargetDate(request.TargetDate, out var targetDate)) return (GoalCreateOutcome.InvalidDate, null);
        if (targetDate < Today()) return (GoalCreateOutcome.InvalidDate, null);

        var nameKey = StableKeys.NameKey(name);
        var keyId = KeyId(owner, nameKey);
        var goalId = Guid.NewGuid().ToString();
        var now = DateTimeOffset.UtcNow;

        if (!await TryReserveKeyAsync(owner, nameKey, keyId, goalId, ct))
            return (GoalCreateOutcome.Duplicate, null);

        var document = new GoalDocument(
            goalId, owner, name, request.TargetCents, SavedCents: 0,
            targetDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Active: true, CreatedAt: now, UpdatedAt: now);

        try
        {
            var created = await docs.CreateIfAbsentAsync(GoalCollections.Goals, goalId, document.ToDocument(), ct);
            if (!created)
            {
                await docs.DeleteAsync(GoalCollections.Keys, keyId, ct);
                return (GoalCreateOutcome.Duplicate, null);
            }
        }
        catch
        {
            await docs.DeleteAsync(GoalCollections.Keys, keyId, CancellationToken.None);
            throw;
        }

        return (GoalCreateOutcome.Created, document.ToDto(Today()));
    }

    public async Task<(GoalUpdateOutcome Outcome, GoalDto? Goal)> UpdateAsync(
        string owner, string id, UpdateGoalRequest request, CancellationToken ct)
    {
        if (request.Name is null && request.TargetCents is null &&
            request.TargetDate is null && request.SavedCents is null)
            return (GoalUpdateOutcome.NothingToUpdate, null);

        var existing = await ReadOwnedAsync(owner, id, ct);
        if (existing is null) return (GoalUpdateOutcome.NotFound, null);

        var name = existing.Name;
        if (request.Name is not null)
        {
            name = StableKeys.NormalizeName(request.Name, 80);
            if (name is null) return (GoalUpdateOutcome.InvalidName, null);
        }

        var targetDate = existing.TargetDate;
        if (request.TargetDate is not null)
        {
            if (!TryParseTargetDate(request.TargetDate, out var parsed) || parsed < Today())
                return (GoalUpdateOutcome.InvalidDate, null);
            targetDate = parsed.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        var newNameKey = StableKeys.NameKey(name);
        var oldNameKey = StableKeys.NameKey(existing.Name);
        var renamed = newNameKey != oldNameKey;
        var newKeyId = KeyId(owner, newNameKey);

        if (renamed && !await TryReserveKeyAsync(owner, newNameKey, newKeyId, id, ct))
            return (GoalUpdateOutcome.Duplicate, null);

        var updated = existing with
        {
            Name = name,
            TargetCents = request.TargetCents ?? existing.TargetCents,
            SavedCents = request.SavedCents ?? existing.SavedCents,
            TargetDate = targetDate,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        try
        {
            await docs.UpsertAsync(GoalCollections.Goals, id, updated.ToDocument(), ct);
        }
        catch
        {
            if (renamed) await docs.DeleteAsync(GoalCollections.Keys, newKeyId, CancellationToken.None);
            throw;
        }

        if (renamed)
            await docs.DeleteAsync(GoalCollections.Keys, KeyId(owner, oldNameKey), CancellationToken.None);

        return (GoalUpdateOutcome.Updated, updated.ToDto(Today()));
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private async Task<GoalDocument?> ReadOwnedAsync(string owner, string id, CancellationToken ct)
    {
        var row = await docs.GetAsync(GoalCollections.Goals, id, ct);
        if (row is null) return null;
        var document = GoalDocument.From(id, row);
        return document is not null && string.Equals(document.ClientId, owner, StringComparison.Ordinal)
            ? document
            : null;
    }

    /// <summary>
    /// Reserves the (owner,normalized-name) key. Never reclaims an existing reservation inline:
    /// a concurrent request cannot distinguish a fresh reservation from an abandoned one, and
    /// deleting it would allow two goals with the same name. The catch block compensates
    /// in-process write failures; a key leaked by a hard process crash needs operational cleanup.
    /// </summary>
    private async Task<bool> TryReserveKeyAsync(
        string owner, string nameKey, string keyId, string goalId, CancellationToken ct)
    {
        var payload = new Dictionary<string, object?>
        {
            ["goalId"] = goalId,
            ["clientId"] = owner,
            ["nameKey"] = nameKey,
            ["createdAt"] = DateTimeOffset.UtcNow.ToString("O", CultureInfo.InvariantCulture),
        };

        return await docs.CreateIfAbsentAsync(GoalCollections.Keys, keyId, payload, ct);
    }

    private static string KeyId(string owner, string nameKey) =>
        StableKeys.Of("goal", owner, nameKey);

    private static bool TryParseTargetDate(string value, out DateOnly date) =>
        DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date);
}
