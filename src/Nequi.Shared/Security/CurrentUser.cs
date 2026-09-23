using System.Security.Claims;

namespace Nequi.Shared.Security;

public sealed record CurrentUser(string Uid, IReadOnlySet<string> Roles, string? ClientId = null)
{
    public bool IsStaff => Roles.Overlaps([Security.Roles.Soporte, Security.Roles.OperadorFinanciero, Security.Roles.Admin]);

    public static CurrentUser? From(ClaimsPrincipal p)
    {
        var uid = p.FindFirstValue("user_id") ?? p.FindFirstValue(ClaimTypes.NameIdentifier) ?? p.FindFirstValue("sub");
        if (uid is null) return null;
        var roles = p.FindAll(ClaimTypes.Role).Select(c => c.Value).ToHashSet();
        // client_id is the domain-level client identifier (UUID from Spanner / financial domain).
        // Distinct from the auth subject (uid). Optional: absent in staff and internal tokens.
        var clientId = p.FindFirstValue("client_id");
        return new CurrentUser(uid, roles, clientId);
    }
}

/// <summary>Resource-based authorization: clients touch only their own resources; staff may read any.</summary>
public static class ResourceAccess
{
    public static bool CanRead(CurrentUser user, string ownerUid) => user.Uid == ownerUid || user.IsStaff;
    public static bool CanWrite(CurrentUser user, string ownerUid) => user.Uid == ownerUid;
}
