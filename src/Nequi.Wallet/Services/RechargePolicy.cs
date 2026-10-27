namespace Nequi.Wallet.Services;

/// <summary>
/// Environment gate for simulated payment methods. The default is deny: a deployment must
/// explicitly set <c>Recharges:AllowSimulatedPaymentMethods=true</c> (development/test only)
/// before the API accepts <c>SIMULATED_PSE</c>, <c>SIMULATED_CARD</c> or
/// <c>SIMULATED_CORRESPONSAL</c>.
/// </summary>
public sealed class RechargePolicy
{
    public const string ConfigKey = "Recharges:AllowSimulatedPaymentMethods";
    public const string SimulatedPrefix = "SIMULATED_";

    public RechargePolicy(IConfiguration configuration)
    {
        AllowSimulatedPaymentMethods = configuration.GetValue<bool>(ConfigKey);
    }

    public bool AllowSimulatedPaymentMethods { get; }

    public bool IsPaymentMethodAllowed(string? paymentMethod)
    {
        if (string.IsNullOrWhiteSpace(paymentMethod)) return false;
        if (!paymentMethod.StartsWith(SimulatedPrefix, StringComparison.Ordinal)) return true;
        return AllowSimulatedPaymentMethods;
    }
}
