using System.ComponentModel.DataAnnotations;

namespace Nequi.Wallet.DTOs;

/// <summary>
/// Rechaza importes con más decimales de los permitidos. El dinero se maneja en centavos enteros;
/// aceptar fracciones de centavo haría que lo mostrado y lo debitado difirieran.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class MaxDecimalPlacesAttribute(int maxPlaces) : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value is not decimal amount) return true; // [Required]/[Range] cubren los demás casos
        return decimal.Round(amount, maxPlaces) == amount;
    }

    public override string FormatErrorMessage(string name) =>
        $"El monto no puede tener más de {maxPlaces} decimales.";
}
