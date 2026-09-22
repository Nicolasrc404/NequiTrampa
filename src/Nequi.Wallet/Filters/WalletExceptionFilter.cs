using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using Nequi.Wallet.Exceptions;

namespace Nequi.Wallet.Filters;

/// <summary>
/// Maps <see cref="WalletDomainException"/> subclasses to their declared HTTP status code
/// (RFC 9457 Problem Details) and <see cref="UnauthorizedAccessException"/> to 403,
/// so that the global <c>UseNequiExceptionHandler</c> is bypassed for controlled domain errors.
/// </summary>
/// <remarks>
/// Implementation current: MOCK. The mapping rules follow the <see cref="WalletDomainException"/> hierarchy,
/// which is shared by the future <c>SpannerWalletService</c> (TO-BE).
/// </remarks>
public sealed class WalletExceptionFilter(ILogger<WalletExceptionFilter> logger) : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        var ex = context.Exception;

        (int status, string title, string type, string code) = ex switch
        {
            WalletDomainException dex => (dex.StatusCode, GetTitle(dex.StatusCode), dex.ErrorType, dex.ErrorCode),
            UnauthorizedAccessException => (
                StatusCodes.Status403Forbidden,
                "Acceso denegado",
                "https://errors.nequitrampa.internal/forbidden",
                "FORBIDDEN"),
            _ => (0, string.Empty, string.Empty, string.Empty)
        };

        if (status == 0)
        {
            logger?.LogError(ex, "Unhandled exception in Wallet controller");
            return; // let UseNequiExceptionHandler (500) deal with truly unexpected errors
        }

        context.ExceptionHandled = true;
        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = ex.Message,
            Type = type,
        };
        problem.Extensions["code"] = code;

        context.Result = new ObjectResult(problem)
        {
            StatusCode = status,
            ContentTypes = { "application/problem+json" }
        };
    }

    private static string GetTitle(int status) => status switch
    {
        StatusCodes.Status404NotFound => "Recurso no encontrado",
        StatusCodes.Status422UnprocessableEntity => "Regla financiera no superada",
        StatusCodes.Status403Forbidden => "Acceso denegado",
        _ => "Error de dominio"
    };
}
