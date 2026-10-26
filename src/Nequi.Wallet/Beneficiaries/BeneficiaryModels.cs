using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace Nequi.Wallet.Beneficiaries;

public static class BeneficiaryCollections
{
    public const string Beneficiaries = "beneficiaries";

    /// <summary>Uniqueness reservation: one row per (owner, public transfer code).</summary>
    public const string Keys = "beneficiary_keys";

    public const int MaxPerOwner = 200;
}

/// <summary>
/// Frequent recipient. The name is a label chosen by the owner; no third-party personal data is
/// read from the destination account. Only the existence of an ACTIVE public transfer code is
/// validated.
/// </summary>
public sealed record CreateBeneficiaryRequest(
    [Required(ErrorMessage = "El nombre del beneficiario es obligatorio.")]
    [StringLength(60, MinimumLength = 2, ErrorMessage = "El nombre debe tener entre 2 y 60 caracteres.")]
    string Name,
    [Required(ErrorMessage = "El código de transferencia es obligatorio.")]
    [StringLength(20, MinimumLength = 1, ErrorMessage = "El código no puede superar los 20 caracteres.")]
    [RegularExpression(@"^[A-Za-z0-9_-]+$", ErrorMessage = "El código solo admite caracteres alfanuméricos, guiones y guiones bajos.")]
    string TransferCode);

public sealed record BeneficiaryDto(
    string Id,
    string Name,
    string TransferCode,
    DateTimeOffset CreatedAt);

public sealed record BeneficiaryDeletedDto(string Id, bool Deleted);

internal sealed record BeneficiaryDocument(
    string Id,
    string ClientId,
    string Name,
    string TransferCode,
    string DestinationClientId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    public static BeneficiaryDocument? From(string id, IDictionary<string, object?> d)
    {
        var clientId = Str(d, "clientId");
        var name = Str(d, "name");
        var code = Str(d, "transferCode");
        var destination = Str(d, "destinationClientId");
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(name) ||
            string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(destination))
            return null;

        var created = ParseDate(Str(d, "createdAt")) ?? DateTimeOffset.UnixEpoch;
        return new BeneficiaryDocument(
            id, clientId, name, code, destination, created,
            ParseDate(Str(d, "updatedAt")) ?? created);
    }

    public Dictionary<string, object?> ToDocument() => new()
    {
        ["id"] = Id,
        ["clientId"] = ClientId,
        ["name"] = Name,
        ["transferCode"] = TransferCode,
        ["destinationClientId"] = DestinationClientId,
        ["createdAt"] = CreatedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
        ["updatedAt"] = UpdatedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
    };

    /// <summary>Destination client id is internal ownership data: never returned to the client.</summary>
    public BeneficiaryDto ToDto() => new(Id, Name, TransferCode, CreatedAt);

    internal static string? Str(IDictionary<string, object?> d, string key) =>
        d.TryGetValue(key, out var v) && v is not null ? Convert.ToString(v, CultureInfo.InvariantCulture) : null;

    internal static DateTimeOffset? ParseDate(string? value) =>
        DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed)
            ? parsed
            : null;

    public static bool TryNormalizeCode(string? value, out string code)
    {
        code = "";
        if (string.IsNullOrWhiteSpace(value)) return false;
        var trimmed = value.Trim().ToUpperInvariant();
        if (trimmed.Length is < 1 or > 20) return false;
        if (!trimmed.All(c => char.IsLetterOrDigit(c) || c is '-' or '_')) return false;
        code = trimmed;
        return true;
    }

    public static string? NormalizeName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var collapsed = string.Join(' ', value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        if (collapsed.Length is < 2 or > 60) return null;
        return collapsed.Any(char.IsControl) ? null : collapsed;
    }
}
