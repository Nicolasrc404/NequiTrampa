using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Nequi.Shared.Security;

namespace Nequi.Finance.Common;

internal static class FinanceOwner
{
    /// <summary>
    /// Resolves the domain client_id from the authenticated principal. Never accepts a clientId
    /// from the request: the controller writes only to the owner returned here.
    /// </summary>
    public static async Task<string?> ResolveAsync(
        ClaimsPrincipal principal, ClientIdentityResolver identities, CancellationToken ct)
    {
        var user = CurrentUser.From(principal);
        if (user is null) return null;
        if (!user.Roles.Contains(Roles.Cliente)) return null;
        var owner = await identities.ResolveAsync(user, ct);
        return string.IsNullOrWhiteSpace(owner) ? null : owner;
    }
}

internal static class StableKeys
{
    /// <summary>Deterministic Firestore document id for uniqueness constraints (128-bit hex).</summary>
    public static string Of(params string[] parts)
    {
        var payload = string.Join('\n', parts);
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash)[..32].ToLowerInvariant();
    }

    /// <summary>Collapses whitespace, trims, and validates that the text is printable.</summary>
    public static string? NormalizeName(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var collapsed = string.Join(' ', value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        if (collapsed.Length is < 2 || collapsed.Length > maxLength) return null;
        if (collapsed.Any(char.IsControl)) return null;
        return collapsed;
    }

    public static string NameKey(string value) => value.Trim().ToLowerInvariant();
}
