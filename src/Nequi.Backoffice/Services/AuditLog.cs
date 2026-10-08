using Nequi.Shared.Data;
using Nequi.Shared.Security;

namespace Nequi.Backoffice.Services;

/// <summary>Append-only audit trail (Firestore <c>audit_events</c>). Every backoffice mutation writes one entry: actor, action, target, details.</summary>
public sealed class AuditLog(IDocumentStore docs)
{
    public const string Collection = "audit_events";

    public async Task<string> WriteAsync(CurrentUser actor, string action, string targetType, string targetId,
        object? details = null, string? operationId = null, CancellationToken ct = default)
    {
        var id = Guid.NewGuid().ToString("N");
        await docs.UpsertAsync(Collection, id, new Dictionary<string, object?>
        {
            ["id"] = id,
            ["occurredAt"] = DateTimeOffset.UtcNow.UtcDateTime.ToString("O"),
            ["actorId"] = actor.Uid,
            ["actorRoles"] = actor.Roles.OrderBy(r => r).Cast<object?>().ToList(),
            ["action"] = action,
            ["targetType"] = targetType,
            ["targetId"] = targetId,
            ["operationId"] = operationId,
            ["details"] = details is null ? null : System.Text.Json.JsonSerializer.Serialize(details),
        }, ct);
        return id;
    }

    public Task<IReadOnlyList<IDictionary<string, object?>>> ListAsync(int limit, CancellationToken ct) =>
        docs.ListAsync(Collection, "occurredAt", limit, ct);

    public Task<IDictionary<string, object?>?> GetAsync(string id, CancellationToken ct) => docs.GetAsync(Collection, id, ct);

    public Task<IReadOnlyList<IDictionary<string, object?>>> ForOperationAsync(string operationId, CancellationToken ct) =>
        docs.QueryEqualsAsync(Collection, "operationId", operationId, 100, ct);
}
