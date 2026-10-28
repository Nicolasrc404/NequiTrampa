using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Nequi.Shared.Observability;

public static class CorrelationKeys
{
    public const string RequestId = "requestId";
    public const string OperationId = "operationId";
    public const string Trace = "traceId";
    public const string RequestIdHeader = "X-Request-Id";
    public const string OperationIdHeader = "X-Operation-Id";
}

/// <summary>
/// Puts requestId / traceId / operationId on every log line and on the response.
/// Never logs headers, bodies or tokens.
/// </summary>
public sealed class CorrelationMiddleware(RequestDelegate next, ILogger<CorrelationMiddleware> logger, string? projectId)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        var requestId = ctx.Request.Headers[CorrelationKeys.RequestIdHeader].FirstOrDefault() is { Length: > 0 and <= 64 } h
            ? h : Guid.NewGuid().ToString("N");
        var operationId = ctx.Request.Headers[CorrelationKeys.OperationIdHeader].FirstOrDefault() is { Length: > 0 and <= 64 } o
            ? o : requestId;

        // X-Cloud-Trace-Context: TRACE_ID/SPAN_ID;o=1
        var traceId = ctx.Request.Headers["X-Cloud-Trace-Context"].FirstOrDefault()?.Split('/')[0];
        var trace = traceId is { Length: > 0 } && !string.IsNullOrEmpty(projectId)
            ? $"projects/{projectId}/traces/{traceId}" : traceId ?? requestId;

        ctx.Items[CorrelationKeys.RequestId] = requestId;
        ctx.Items[CorrelationKeys.OperationId] = operationId;
        ctx.Response.Headers[CorrelationKeys.RequestIdHeader] = requestId;

        using (logger.BeginScope(new Dictionary<string, object?>
        {
            [CorrelationKeys.RequestId] = requestId,
            [CorrelationKeys.OperationId] = operationId,
            [CorrelationKeys.Trace] = trace,
        }))
        {
            await next(ctx);
            if (ctx.Request.Path.StartsWithSegments("/health")) return; // probes are noise
            logger.LogInformation("{Method} {Path} -> {Status}", ctx.Request.Method, ctx.Request.Path.Value, ctx.Response.StatusCode);
        }
    }
}
