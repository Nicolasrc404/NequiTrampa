namespace Nequi.Wallet.Services;

public sealed record AcademicDemoAccount(string ClientId, string DisplayName, string TransferCode, bool IsActive);

/// <summary>Deterministic, local-only catalog of academic demo recipients.</summary>
public sealed class AcademicDemoAccountCatalog
{
    private readonly IReadOnlyDictionary<string, AcademicDemoAccount> _accounts =
        new Dictionary<string, AcademicDemoAccount>(StringComparer.OrdinalIgnoreCase)
        {
            ["LAUR-5120"] = new("academic-laura", "Laura Demo", "LAUR-5120", true),
            ["CARL-9941"] = new("academic-carlos", "Carlos Demo", "CARL-9941", true),
            ["SOFI-3307"] = new("academic-sofia", "Sofía Demo", "SOFI-3307", true),
            ["ANA-3092"] = new("academic-ana", "Ana Demo", "ANA-3092", false),
            // Explicit legacy aliases used by local contract tests; none are prefix-derived.
            ["TRF-LAU-0002"] = new("academic-laura", "Laura Demo", "LAUR-5120", true),
            ["TRF-DEST-0001"] = new("academic-carlos", "Carlos Demo", "CARL-9941", true),
            ["TRF-HTTP-0001"] = new("academic-carlos", "Carlos Demo", "CARL-9941", true),
            ["TRF-OTH-0003"] = new("academic-other", "Otro Demo", "TRF-OTH-0003", true),
            ["TRF-INACTIVE-0000"] = new("academic-ana", "Ana Demo", "ANA-3092", false),
        };

    public AcademicDemoAccount? Find(string transferCode) =>
        string.IsNullOrWhiteSpace(transferCode) ? null :
        _accounts.TryGetValue(transferCode.Trim(), out var account) ? account : null;
}
