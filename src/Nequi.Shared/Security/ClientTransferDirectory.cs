using System.Collections.Concurrent;
using Google.Cloud.Spanner.Data;
using Nequi.Shared.Data;

namespace Nequi.Shared.Security;

/// <summary>
/// Resolves a public transfer code (<c>clients.public_transfer_code</c>) to the domain client_id
/// without exposing any other client data. Used by Beneficiaries to validate that a destination
/// exists and is ACTIVE before it is saved as a frequent recipient.
/// </summary>
public interface IClientTransferDirectory
{
    Task<string?> FindActiveClientIdByCodeAsync(string transferCode, CancellationToken ct);
}

/// <summary>Spanner authority for public transfer codes (clients table).</summary>
public sealed class SpannerClientTransferDirectory(SpannerDb db) : IClientTransferDirectory
{
    public async Task<string?> FindActiveClientIdByCodeAsync(string transferCode, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(transferCode)) return null;

        await using var conn = db.Open();
        var cmd = conn.CreateSelectCommand(
            "SELECT client_id FROM clients WHERE public_transfer_code = @code AND status = 'ACTIVE'");
        cmd.Parameters.Add("code", SpannerDbType.String, transferCode.Trim().ToUpperInvariant());
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? reader.GetString(0) : null;
    }
}

/// <summary>
/// Development/test directory. Empty by default: tests must register the destination codes they
/// intend to use. Never used when a Spanner database is configured.
/// </summary>
public sealed class InMemoryClientTransferDirectory : IClientTransferDirectory
{
    private readonly ConcurrentDictionary<string, string> _byCode = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Registers or replaces an ACTIVE destination code.</summary>
    public void Register(string clientId, string transferCode) =>
        _byCode[transferCode.Trim().ToUpperInvariant()] = clientId;

    public void Remove(string transferCode) =>
        _byCode.TryRemove(transferCode.Trim().ToUpperInvariant(), out _);

    public Task<string?> FindActiveClientIdByCodeAsync(string transferCode, CancellationToken ct) =>
        Task.FromResult(_byCode.TryGetValue(transferCode.Trim(), out var clientId) ? clientId : null);
}
