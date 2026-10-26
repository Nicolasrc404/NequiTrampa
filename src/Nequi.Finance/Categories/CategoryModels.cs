using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace Nequi.Finance.Categories;

public static class CategoryCollections
{
    public const string Categories = "categories";
    public const string Keys = "category_keys";
    public const string ScopeSystem = "SYSTEM";
    public const string ScopeClient = "CLIENT";
}

public sealed record CreateCategoryRequest(
    [Required(ErrorMessage = "El nombre de la categoría es obligatorio.")]
    [StringLength(40, MinimumLength = 2, ErrorMessage = "El nombre debe tener entre 2 y 40 caracteres.")]
    string Name,
    [Required(ErrorMessage = "El tipo de categoría es obligatorio.")]
    [RegularExpression("^(gasto|ingreso)$", ErrorMessage = "El tipo debe ser 'gasto' o 'ingreso'.")]
    string Type);

/// <summary>
/// Only the display name is mutable. Changing the type would reclassify historical movements,
/// so a different type is rejected with 422 (category type is immutable).
/// </summary>
public sealed record UpdateCategoryRequest(
    [StringLength(40, MinimumLength = 2, ErrorMessage = "El nombre debe tener entre 2 y 40 caracteres.")]
    string? Name,
    [RegularExpression("^(gasto|ingreso)$", ErrorMessage = "El tipo debe ser 'gasto' o 'ingreso'.")]
    string? Type);

public sealed record CategoryDto(
    string Id,
    string Name,
    string Type,
    bool IsSystem,
    bool Active,
    int MovementsCount,
    long TotalAmountCents,
    string Currency,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

internal sealed record CategoryDocument(
    string Id,
    string? ClientId,
    string Name,
    string Type,
    bool IsSystem,
    bool Active,
    string Scope,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    public static CategoryDocument? From(string id, IDictionary<string, object?> d)
    {
        var name = Str(d, "name");
        var type = Str(d, "type");
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(type)) return null;

        var created = ParseDate(Str(d, "createdAt")) ?? DateTimeOffset.UnixEpoch;
        var updated = ParseDate(Str(d, "updatedAt")) ?? created;
        return new CategoryDocument(
            id,
            Str(d, "clientId"),
            name,
            type,
            Bool(d, "isSystem"),
            !d.TryGetValue("active", out var a) || a is null || Convert.ToBoolean(a, CultureInfo.InvariantCulture),
            Str(d, "scope") ?? CategoryCollections.ScopeClient,
            created,
            updated);
    }

    public Dictionary<string, object?> ToDocument() => new()
    {
        ["id"] = Id,
        ["clientId"] = ClientId,
        ["name"] = Name,
        ["type"] = Type,
        ["isSystem"] = IsSystem,
        ["active"] = Active,
        ["scope"] = Scope,
        ["createdAt"] = CreatedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
        ["updatedAt"] = UpdatedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
    };

    public CategoryDto ToDto(int movementsCount = 0, long totalAmountCents = 0) =>
        new(Id, Name, Type, IsSystem, Active, movementsCount, totalAmountCents, "COP", CreatedAt, UpdatedAt);

    internal static string? Str(IDictionary<string, object?> d, string key) =>
        d.TryGetValue(key, out var v) && v is not null ? Convert.ToString(v, CultureInfo.InvariantCulture) : null;

    internal static DateTimeOffset? ParseDate(string? value) =>
        DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed)
            ? parsed
            : null;

    internal static bool Bool(IDictionary<string, object?> d, string key) =>
        d.TryGetValue(key, out var v) && v is not null && Convert.ToBoolean(v, CultureInfo.InvariantCulture);
}
