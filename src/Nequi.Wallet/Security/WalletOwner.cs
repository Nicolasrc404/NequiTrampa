using System.Security.Claims;
using Nequi.Shared.Security;

namespace Nequi.Wallet.Security;

/// <summary>
/// Resolves the domain <c>client_id</c> (never the auth subject) for new Wallet domains.
/// Returns null when the identity has no linked, active client context: callers must deny.
/// The request body is never a source of identity.
/// </summary>
internal static class WalletOwner
{
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
