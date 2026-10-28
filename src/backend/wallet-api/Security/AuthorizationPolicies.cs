namespace NequiTrampa.WalletApi.Security;

/// <summary>
/// Nombres de las políticas de autorización formalizadas del sistema bajo el principio de mínimo privilegio.
/// </summary>
public static class AuthorizationPolicies
{
    // Políticas base por rol
    public const string RequireCliente = "RequireCliente";
    public const string RequireSoporte = "RequireSoporte";
    public const string RequireOperadorFinanciero = "RequireOperadorFinanciero";
    public const string RequireAdmin = "RequireAdmin";

    // Políticas granulares de negocio (Mínimo Privilegio)
    public const string CanCreateTransfer = "CanCreateTransfer";
    public const string CanCreateRecharge = "CanCreateRecharge";
    public const string CanInvestigateFinancialOperations = "CanInvestigateFinancialOperations";
    public const string CanExecuteReversals = "CanExecuteReversals";
    public const string CanCreateFinancialAdjustment = "CanCreateFinancialAdjustment";
    public const string CanResolveReconciliationIssue = "CanResolveReconciliationIssue";
    public const string CanManageUsers = "CanManageUsers";
    public const string CanManageRoles = "CanManageRoles";
    public const string CanManageConfiguration = "CanManageConfiguration";
    public const string CanReadAudit = "CanReadAudit";
}
