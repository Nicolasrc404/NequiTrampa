using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Nequi.Shared.Data;
using Nequi.Shared.Security;

namespace Nequi.Wallet.Beneficiaries;

public enum BeneficiaryCreateOutcome
{
    Created,
    Duplicate,
    InvalidName,
    InvalidCode,
    DestinationNotFound,
    CannotAddSelf,
}

public enum BeneficiaryDeleteOutcome { Deleted, NotFound }

/// <summary>
/// Beneficiaries of the authenticated client. The public transfer code is validated against the
/// platform directory (Spanner in production, explicit in-memory registry in dev/test); there is
/// no external bank-account verification provider. Deleting a beneficiary never deletes money or
/// financial history: only the frequent-recipient entry.
/// </summary>
public sealed class BeneficiaryService(IDocumentStore docs, IClientTransferDirectory directory)
{
    public async Task<IReadOnlyList<BeneficiaryDto>> ListAsync(string owner, CancellationToken ct)
    {
        var rows = await docs.QueryEqualsAsync(
            BeneficiaryCollections.Beneficiaries, "clientId", owner, BeneficiaryCollections.MaxPerOwner, ct);

        return rows
            .Select(row =>
            {
                var id = BeneficiaryDocument.Str(row, "id");
                return string.IsNullOrWhiteSpace(id) ? null : BeneficiaryDocument.From(id, row);
            })
            .Where(b => b is not null && string.Equals(b.ClientId, owner, StringComparison.Ordinal))
            .Select(b => b!.ToDto())
            .OrderBy(b => b.Name, StringComparer.CurrentCultureIgnoreCase)
            .ThenBy(b => b.TransferCode, StringComparer.Ordinal)
            .ToList();
    }

    public async Task<BeneficiaryDto?> GetAsync(string owner, string id, CancellationToken ct)
    {
        var document = await ReadOwnedAsync(owner, id, ct);
        return document?.ToDto();
    }

    public async Task<(BeneficiaryCreateOutcome Outcome, BeneficiaryDto? Beneficiary)> CreateAsync(
        string owner, CreateBeneficiaryRequest request, CancellationToken ct)
    {
        var name = BeneficiaryDocument.NormalizeName(request.Name);
        if (name is null) return (BeneficiaryCreateOutcome.InvalidName, null);

        if (!BeneficiaryDocument.TryNormalizeCode(request.TransferCode, out var code))
            return (BeneficiaryCreateOutcome.InvalidCode, null);

        var destination = await directory.FindActiveClientIdByCodeAsync(code, ct);
        if (string.IsNullOrWhiteSpace(destination))
            return (BeneficiaryCreateOutcome.DestinationNotFound, null);
        if (string.Equals(destination, owner, StringComparison.Ordinal))
            return (BeneficiaryCreateOutcome.CannotAddSelf, null);

        var keyId = KeyId(owner, code);
        var beneficiaryId = Guid.NewGuid().ToString();
        var now = DateTimeOffset.UtcNow;

        if (!await TryReserveKeyAsync(owner, code, keyId, beneficiaryId, ct))
            return (BeneficiaryCreateOutcome.Duplicate, null);

        var document = new BeneficiaryDocument(
            beneficiaryId, owner, name, code, destination, now, now);

        try
        {
            var created = await docs.CreateIfAbsentAsync(
                BeneficiaryCollections.Beneficiaries, beneficiaryId, document.ToDocument(), ct);
            if (!created)
            {
                await docs.DeleteAsync(BeneficiaryCollections.Keys, keyId, ct);
                return (BeneficiaryCreateOutcome.Duplicate, null);
            }
        }
        catch
        {
            await docs.DeleteAsync(BeneficiaryCollections.Keys, keyId, CancellationToken.None);
            throw;
        }

        return (BeneficiaryCreateOutcome.Created, document.ToDto());
    }

    public async Task<BeneficiaryDeleteOutcome> DeleteAsync(
        string owner, string id, CancellationToken ct)
    {
        var document = await ReadOwnedAsync(owner, id, ct);
        if (document is null) return BeneficiaryDeleteOutcome.NotFound;

        await docs.DeleteAsync(BeneficiaryCollections.Beneficiaries, id, ct);
        await docs.DeleteAsync(BeneficiaryCollections.Keys, KeyId(owner, document.TransferCode), ct);
        return BeneficiaryDeleteOutcome.Deleted;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private async Task<BeneficiaryDocument?> ReadOwnedAsync(string owner, string id, CancellationToken ct)
    {
        var row = await docs.GetAsync(BeneficiaryCollections.Beneficiaries, id, ct);
        if (row is null) return null;
        var document = BeneficiaryDocument.From(id, row);
        return document is not null && string.Equals(document.ClientId, owner, StringComparison.Ordinal)
            ? document
            : null;
    }

    private async Task<bool> TryReserveKeyAsync(
        string owner, string code, string keyId, string beneficiaryId, CancellationToken ct)
    {
        var payload = new Dictionary<string, object?>
        {
            ["beneficiaryId"] = beneficiaryId,
            ["clientId"] = owner,
            ["transferCode"] = code,
            ["createdAt"] = DateTimeOffset.UtcNow.ToString("O", CultureInfo.InvariantCulture),
        };

        if (await docs.CreateIfAbsentAsync(BeneficiaryCollections.Keys, keyId, payload, ct)) return true;

        var existing = await docs.GetAsync(BeneficiaryCollections.Keys, keyId, ct);
        var existingBeneficiaryId = existing is null ? null : BeneficiaryDocument.Str(existing, "beneficiaryId");
        if (existingBeneficiaryId is null) return false;

        var beneficiary = await docs.GetAsync(BeneficiaryCollections.Beneficiaries, existingBeneficiaryId, ct);
        if (beneficiary is not null) return false;

        await docs.DeleteAsync(BeneficiaryCollections.Keys, keyId, ct);
        return await docs.CreateIfAbsentAsync(BeneficiaryCollections.Keys, keyId, payload, ct);
    }

    private static string KeyId(string owner, string code)
    {
        var payload = $"beneficiary\n{owner}\n{code}";
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash)[..32].ToLowerInvariant();
    }
}
