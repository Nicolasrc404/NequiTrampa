using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Nequi.Shared.Observability;

namespace Nequi.Shared.Http;

/// <summary>RFC 9457 application/problem+json helpers.</summary>
public static class Problems
{
    public static IResult Problem(HttpContext ctx, int status, string title, string? detail = null, string? code = null)
    {
        var pd = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Type = $"https://httpstatuses.com/{status}",
            Instance = ctx.Request.Path,
        };
        if (code is not null) pd.Extensions["code"] = code;
        if (ctx.Items[CorrelationKeys.RequestId] is string rid) pd.Extensions["requestId"] = rid;
        return Results.Json(pd, statusCode: status, contentType: "application/problem+json");
    }

    public static IServiceCollection AddNequiProblemDetails(this IServiceCollection services)
    {
        services.AddProblemDetails(o => o.CustomizeProblemDetails = c =>
        {
            if (c.HttpContext.Items[CorrelationKeys.RequestId] is string rid)
                c.ProblemDetails.Extensions["requestId"] = rid;
        });
        return services;
    }

    /// <summary>Unhandled exceptions become 500 problem+json without leaking internals.</summary>
    public static IApplicationBuilder UseNequiExceptionHandler(this IApplicationBuilder app) =>
        app.UseExceptionHandler(b => b.Run(async ctx =>
        {
            var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
            ctx.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Unhandled").LogError(ex, "Unhandled exception");
            await Problem(ctx, 500, "Internal Server Error", code: "internal_error").ExecuteAsync(ctx);
        }));
}
