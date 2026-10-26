using System.ComponentModel.DataAnnotations;
using System.Globalization;
using Nequi.Finance.Common;

namespace Nequi.Finance.Goals;

public static class GoalCollections
{
    public const string Goals = "goals";
    public const string Keys = "goal_keys";
}

public sealed record CreateGoalRequest(
    [Required(ErrorMessage = "El nombre de la meta es obligatorio.")]
    [StringLength(80, MinimumLength = 2, ErrorMessage = "El nombre debe tener entre 2 y 80 caracteres.")]
    string Name,
    [Range(1, 1_000_000_000_000, ErrorMessage = "El objetivo debe ser un valor positivo en centavos de COP.")]
    long TargetCents,
    [Required(ErrorMessage = "La fecha objetivo es obligatoria.")]
    [RegularExpression(@"^\d{4}-\d{2}-\d{2}$", ErrorMessage = "La fecha objetivo debe usar el formato YYYY-MM-DD.")]
    string TargetDate);

/// <summary>
/// savedCents is INFORMATIONAL declared progress. It never reserves, transfers or blocks funds
/// and does not create any ledger entry.
/// </summary>
public sealed record UpdateGoalRequest(
    [StringLength(80, MinimumLength = 2, ErrorMessage = "El nombre debe tener entre 2 y 80 caracteres.")]
    string? Name = null,
    [Range(1, 1_000_000_000_000, ErrorMessage = "El objetivo debe ser un valor positivo en centavos de COP.")]
    long? TargetCents = null,
    [RegularExpression(@"^\d{4}-\d{2}-\d{2}$", ErrorMessage = "La fecha objetivo debe usar el formato YYYY-MM-DD.")]
    string? TargetDate = null,
    [Range(0, 1_000_000_000_000, ErrorMessage = "El ahorro declarado no puede ser negativo.")]
    long? SavedCents = null);

public sealed record GoalDto(
    string Id,
    string Name,
    long TargetCents,
    long SavedCents,
    int Percent,
    bool IsAchieved,
    string TargetDate,
    int DaysRemaining,
    string Currency,
    bool Active,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

internal sealed record GoalDocument(
    string Id,
    string ClientId,
    string Name,
    long TargetCents,
    long SavedCents,
    string TargetDate,
    bool Active,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    public static GoalDocument? From(string id, IDictionary<string, object?> d)
    {
        var clientId = Str(d, "clientId");
        var name = Str(d, "name");
        var targetDate = Str(d, "targetDate");
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(name) ||
            string.IsNullOrWhiteSpace(targetDate) ||
            !TryLong(d, "targetCents", out var target) || !TryLong(d, "savedCents", out var saved))
            return null;

        var created = ParseDate(Str(d, "createdAt")) ?? DateTimeOffset.UnixEpoch;
        return new GoalDocument(
            id, clientId, name, target, saved, targetDate,
            !d.TryGetValue("active", out var a) || a is null || Convert.ToBoolean(a, CultureInfo.InvariantCulture),
            created, ParseDate(Str(d, "updatedAt")) ?? created);
    }

    public Dictionary<string, object?> ToDocument() => new()
    {
        ["id"] = Id,
        ["clientId"] = ClientId,
        ["name"] = Name,
        ["targetCents"] = TargetCents,
        ["savedCents"] = SavedCents,
        ["targetDate"] = TargetDate,
        ["currency"] = "COP",
        ["active"] = Active,
        ["createdAt"] = CreatedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
        ["updatedAt"] = UpdatedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
    };

    public GoalDto ToDto(DateOnly today) => GoalDtoFactory.Build(this, today);

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

internal static class GoalDtoFactory
{
    public static GoalDto Build(GoalDocument g, DateOnly today)
    {
        var percent = g.TargetCents <= 0 ? 0 : (int)Math.Min(100m, g.SavedCents * 100m / g.TargetCents);
        var daysRemaining = 0;
        if (DateOnly.TryParseExact(g.TargetDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var target))
            daysRemaining = Math.Max(0, target.DayNumber - today.DayNumber);

        return new GoalDto(
            g.Id, g.Name, g.TargetCents, g.SavedCents, percent,
            g.SavedCents >= g.TargetCents, g.TargetDate, daysRemaining,
            "COP", g.Active, g.CreatedAt, g.UpdatedAt);
    }
}
