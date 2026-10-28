namespace Nequi.Shared.Security;

public static class Roles
{
    public const string Cliente = "CLIENTE";
    public const string Soporte = "SOPORTE";
    public const string OperadorFinanciero = "OPERADOR_FINANCIERO";
    public const string Admin = "ADMIN";
    public static readonly string[] All = [Cliente, Soporte, OperadorFinanciero, Admin];
}

public static class Policies
{
    public const string Client = "IsClient";
    public const string CanViewSupport = "CanViewSupport";
    public const string CanReverseOperation = "CanReverseOperation";
    public const string CanManageRoles = "CanManageRoles";
    public const string CanGenerateReports = "CanGenerateReports";
    public const string InternalStaff = "InternalStaff";
}
