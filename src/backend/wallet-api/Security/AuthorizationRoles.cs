namespace NequiTrampa.WalletApi.Security;

/// <summary>
/// Roles oficiales del sistema NequiTrampa según las decisiones arquitectónicas congeladas.
/// </summary>
public static class AuthorizationRoles
{
    public const string Cliente = "CLIENTE";
    public const string Soporte = "SOPORTE";
    public const string OperadorFinanciero = "OPERADOR_FINANCIERO";
    public const string Admin = "ADMIN";
}
