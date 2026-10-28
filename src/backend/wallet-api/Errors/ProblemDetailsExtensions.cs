using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace NequiTrampa.WalletApi.Errors;

/// <summary>
/// Configuración del manejo global de errores bajo el estándar RFC 9457 (Problem Details).
/// Garantiza que nunca se filtren detalles internos (stack traces, SQL, secretos) al cliente (OWASP API Security).
/// </summary>
public static class ProblemDetailsExtensions
{
    public static IServiceCollection AddAppProblemDetails(this IServiceCollection services)
    {
        services.AddProblemDetails(options =>
        {
            options.CustomizeProblemDetails = context =>
            {
                var httpContext = context.HttpContext;
                var activity = httpContext.Features.Get<IHttpActivityFeature>()?.Activity;
                
                // Asegurar traceId e instancia para correlación en observabilidad (Cloud Logging)
                context.ProblemDetails.Instance = httpContext.Request.Path;
                context.ProblemDetails.Extensions["traceId"] = activity?.Id ?? httpContext.TraceIdentifier;
                context.ProblemDetails.Extensions["timestamp"] = DateTimeOffset.UtcNow;

                // Si ocurrió una excepción controlada de negocio
                var exceptionFeature = httpContext.Features.Get<IExceptionHandlerPathFeature>();
                if (exceptionFeature?.Error is BusinessException businessEx)
                {
                    context.ProblemDetails.Status = businessEx.StatusCode;
                    context.ProblemDetails.Type = businessEx.ErrorType;
                    context.ProblemDetails.Title = GetTitleForStatusCode(businessEx.StatusCode);
                    context.ProblemDetails.Detail = businessEx.Message;
                    context.ProblemDetails.Extensions["errorCode"] = businessEx.ErrorCode;
                }
            };
        });

        return services;
    }

    public static WebApplication UseAppExceptionHandler(this WebApplication app)
    {
        app.UseExceptionHandler(exceptionHandlerApp =>
        {
            exceptionHandlerApp.Run(async context =>
            {
                var exceptionHandlerPathFeature = context.Features.Get<IExceptionHandlerPathFeature>();
                var exception = exceptionHandlerPathFeature?.Error;

                var statusCode = StatusCodes.Status500InternalServerError;
                var type = "https://errors.nequitrampa.internal/internal-server-error";
                var title = "Error interno del servidor";
                var detail = "Ocurrió un error inesperado al procesar la solicitud.";
                string? errorCode = "INTERNAL_SERVER_ERROR";

                if (exception is BusinessException bEx)
                {
                    statusCode = bEx.StatusCode;
                    type = bEx.ErrorType;
                    title = GetTitleForStatusCode(bEx.StatusCode);
                    detail = bEx.Message;
                    errorCode = bEx.ErrorCode;
                }
                else if (exception is BadHttpRequestException badHttpEx)
                {
                    statusCode = StatusCodes.Status400BadRequest;
                    type = "https://errors.nequitrampa.internal/bad-request";
                    title = "Solicitud mal formada";
                    detail = badHttpEx.Message;
                    errorCode = "BAD_REQUEST";
                }
                else if (exception is TimeoutException timeoutEx)
                {
                    statusCode = StatusCodes.Status503ServiceUnavailable;
                    type = "https://errors.nequitrampa.internal/service-unavailable";
                    title = "Servicio no disponible";
                    detail = "Una dependencia autoritativa no respondió dentro de la ventana de tiempo tolerada. Intente de nuevo más tarde.";
                    errorCode = "DEPENDENCY_TIMEOUT";
                }

                context.Response.StatusCode = statusCode;
                context.Response.ContentType = "application/problem+json";

                var problem = new ProblemDetails
                {
                    Type = type,
                    Title = title,
                    Status = statusCode,
                    Detail = detail,
                    Instance = context.Request.Path
                };

                problem.Extensions["traceId"] = context.TraceIdentifier;
                problem.Extensions["errorCode"] = errorCode;
                problem.Extensions["timestamp"] = DateTimeOffset.UtcNow;

                await context.Response.WriteAsJsonAsync(problem);
            });
        });

        return app;
    }

    public static ProblemDetails CreateProblemDetails(
        this HttpContext context,
        int statusCode,
        string type,
        string title,
        string detail,
        string errorCode)
    {
        var problem = new ProblemDetails
        {
            Type = type,
            Title = title,
            Status = statusCode,
            Detail = detail,
            Instance = context.Request.Path
        };

        problem.Extensions["traceId"] = context.TraceIdentifier;
        problem.Extensions["errorCode"] = errorCode;
        problem.Extensions["timestamp"] = DateTimeOffset.UtcNow;

        return problem;
    }

    private static string GetTitleForStatusCode(int statusCode) => statusCode switch
    {
        StatusCodes.Status400BadRequest => "Solicitud inválida",
        StatusCodes.Status401Unauthorized => "No autenticado",
        StatusCodes.Status403Forbidden => "Acceso no autorizado",
        StatusCodes.Status404NotFound => "Recurso no encontrado",
        StatusCodes.Status409Conflict => "Conflicto en la operación",
        StatusCodes.Status422UnprocessableEntity => "Regla de negocio incumplida",
        StatusCodes.Status429TooManyRequests => "Límite de peticiones excedido",
        StatusCodes.Status503ServiceUnavailable => "Servicio no disponible",
        _ => "Error en la solicitud"
    };
}
