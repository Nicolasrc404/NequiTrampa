namespace Nequi.Wallet.Exceptions;

/// <summary>Excepción base para errores de dominio financiero controlados.
/// Implementación actual: MOCK. Mapeada a Problem Details RFC 9457 por WalletExceptionFilter.</summary>
public abstract class WalletDomainException : Exception
{
    public abstract int StatusCode { get; }
    public abstract string ErrorCode { get; }
    public abstract string ErrorType { get; }

    protected WalletDomainException(string message) : base(message) { }
}

/// <summary>Saldo insuficiente para completar la transferencia (422).</summary>
public sealed class InsufficientFundsException : WalletDomainException
{
    public override int StatusCode => 422;
    public override string ErrorCode => "INSUFFICIENT_FUNDS";
    public override string ErrorType => "https://errors.nequitrampa.internal/insufficient-funds";

    public InsufficientFundsException(string message = "El saldo de la billetera es insuficiente para completar la operación.")
        : base(message) { }
}

/// <summary>Límite individual ($2.000.000) o acumulado diario ($5.000.000) superado (422).</summary>
public sealed class TransferLimitExceededException : WalletDomainException
{
    public override int StatusCode => 422;
    public override string ErrorCode => "LIMIT_EXCEEDED";
    public override string ErrorType => "https://errors.nequitrampa.internal/limit-exceeded";

    public TransferLimitExceededException(string message) : base(message) { }
}

/// <summary>Cliente o cuenta de destino inactiva o bloqueada (422).</summary>
public sealed class InactiveDestinationException : WalletDomainException
{
    public override int StatusCode => 422;
    public override string ErrorCode => "DESTINATION_ACCOUNT_INACTIVE";
    public override string ErrorType => "https://errors.nequitrampa.internal/inactive-destination";

    public InactiveDestinationException(string message = "La cuenta o cliente destino se encuentra inactiva o bloqueada.")
        : base(message) { }
}

/// <summary>Recurso no encontrado (404). Implementación actual MOCK; autoridad financiera real será Spanner (TO-BE).</summary>
public sealed class WalletNotFoundException : WalletDomainException
{
    public override int StatusCode => 404;
    public override string ErrorCode => "RESOURCE_NOT_FOUND";
    public override string ErrorType => "https://errors.nequitrampa.internal/not-found";

    public WalletNotFoundException(string message) : base(message) { }
}
