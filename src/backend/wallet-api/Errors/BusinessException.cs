namespace NequiTrampa.WalletApi.Errors;

/// <summary>
/// Excepción base para errores de negocio controlados.
/// </summary>
public abstract class BusinessException : Exception
{
    public abstract int StatusCode { get; }
    public abstract string ErrorCode { get; }
    public abstract string ErrorType { get; }

    protected BusinessException(string message) : base(message) { }
}

public class InsufficientFundsException : BusinessException
{
    public override int StatusCode => StatusCodes.Status422UnprocessableEntity;
    public override string ErrorCode => "INSUFFICIENT_FUNDS";
    public override string ErrorType => "https://errors.nequitrampa.internal/insufficient-funds";

    public InsufficientFundsException(string message = "El saldo de la billetera es insuficiente para completar la operación.")
        : base(message) { }
}

public class LimitExceededException : BusinessException
{
    public override int StatusCode => StatusCodes.Status422UnprocessableEntity;
    public override string ErrorCode => "LIMIT_EXCEEDED";
    public override string ErrorType => "https://errors.nequitrampa.internal/limit-exceeded";

    public LimitExceededException(string message) : base(message) { }
}

public class IdempotencyConflictException : BusinessException
{
    public override int StatusCode => StatusCodes.Status409Conflict;
    public override string ErrorCode => "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH";
    public override string ErrorType => "https://errors.nequitrampa.internal/idempotency-conflict";

    public IdempotencyConflictException(string message = "La clave de idempotencia ya fue utilizada con una solicitud incompatible.")
        : base(message) { }
}

public class ResourceNotFoundException : BusinessException
{
    public override int StatusCode => StatusCodes.Status404NotFound;
    public override string ErrorCode => "RESOURCE_NOT_FOUND";
    public override string ErrorType => "https://errors.nequitrampa.internal/not-found";

    public ResourceNotFoundException(string message) : base(message) { }
}

public class InactiveDestinationException : BusinessException
{
    public override int StatusCode => StatusCodes.Status422UnprocessableEntity;
    public override string ErrorCode => "DESTINATION_ACCOUNT_INACTIVE";
    public override string ErrorType => "https://errors.nequitrampa.internal/inactive-destination";

    public InactiveDestinationException(string message = "La cuenta o cliente destino se encuentra inactiva o bloqueada.")
        : base(message) { }
}
