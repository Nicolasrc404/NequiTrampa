using System.ComponentModel.DataAnnotations;

namespace Nequi.Wallet.DTOs;

/// <summary>Rechaza importes con fracciones de centavo.</summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class MaxDecimalPlacesAttribute(int maxPlaces) : ValidationAttribute
{
    public override bool IsValid(object? value) =>
        value is not decimal amount || decimal.Round(amount, maxPlaces) == amount;

    public override string FormatErrorMessage(string name) =>
        $"El monto no puede tener más de {maxPlaces} decimales.";
}
