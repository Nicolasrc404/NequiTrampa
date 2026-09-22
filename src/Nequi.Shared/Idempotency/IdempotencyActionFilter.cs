using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using Nequi.Shared.Observability;
using Nequi.Shared.Security;

namespace Nequi.Shared.Idempotency;

/// <summary>
/// ASP.NET Core MVC equivalent of <see cref="IdempotencyFilter"/>.
/// Reuses the same <see cref="IIdempotencyStore"/> so that idempotency is shared and consistent
/// across minimal-API and MVC endpoints. Apply via <c>[TypeFilter(typeof(IdempotencyActionFilter))]</c>
/// on POST actions that must be idempotent.
/// </summary>
public sealed class IdempotencyActionFilter(IIdempotencyStore store, ILogger<IdempotencyActionFilter> logger) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http = context.HttpContext;

        var key = http.Request.Headers[IdempotencyFilter.HeaderName].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(key) || key.Length > IdempotencyFilter.MaxKeyLength)
        {
            context.Result = BuildProblem(400, "Idempotency-Key required",
                $"Send an {IdempotencyFilter.HeaderName} header (1-{IdempotencyFilter.MaxKeyLength} chars).",
                "idempotency_key_required", http);
            return;
        }

        // Request body is already buffered upstream (UseNequiCommon enables buffering for POST).
        // Read + hash, then rewind so model binding can re-read it inside next().
        http.Request.EnableBuffering();
        http.Request.Body.Position = 0;
        using var ms = new MemoryStream();
        await http.Request.Body.CopyToAsync(ms, http.RequestAborted);
        http.Request.Body.Position = 0;
        var hash = Convert.ToHexString(SHA256.HashData(ms.ToArray()));

        var uid = CurrentUser.From(http.User)?.Uid ?? "anonymous";
        var scope = $"{http.Request.Method}:{http.Request.Path}";
        if (scope.Length > IdempotencyFilter.MaxKeyLength) scope = scope[..IdempotencyFilter.MaxKeyLength];

        var (outcome, record) = await store.BeginAsync(uid, scope, key, hash, http.RequestAborted);

        switch (outcome)
        {
            case BeginOutcome.Conflict:
                logger.LogWarning("Idempotency conflict key={Key} scope={Scope} actor={Actor}", key, scope, uid);
                context.Result = BuildProblem(409, "Idempotency key reused with a different body",
                    "A request with this Idempotency-Key was already processed for a different payload.",
                    "idempotency_key_conflict", http);
                return;

            case BeginOutcome.InProgress:
                logger.LogWarning("Idempotency in-progress key={Key} scope={Scope} actor={Actor}", key, scope, uid);
                context.Result = BuildProblem(409, "A request with this Idempotency-Key is still in progress",
                    "Resubmit with a distinct Idempotency-Key or retry after the in-flight request completes.",
                    "idempotency_in_progress", http);
                return;

            case BeginOutcome.Replay:
                http.Response.Headers["Idempotent-Replayed"] = "true";
                context.Result = new ContentResult
                {
                    StatusCode = record!.StatusCode ?? 200,
                    Content = record.ResponseBody ?? "",
                    ContentType = record.ContentType ?? "application/json"
                };
                return;
        }

        // BeginOutcome.Started — execute the action.
        // Use a flag to guarantee AbandonAsync runs at most once on failure paths.
        var abandoned = false;

        try
        {
            var executed = await next();

            // Case: next() returned with a captured exception (not rethrown).
            if (executed.Exception != null)
            {
                abandoned = true;
                // Cleanup must not depend on RequestAborted — the same key must stay retryable
                // even if the client disconnected (mirrors IdempotencyFilter minimal-API behavior).
                await store.AbandonAsync(uid, scope, key, CancellationToken.None);
                throw executed.Exception;
            }

            var (status, body) = ExtractResult(executed.Result);
            if (status >= 500)
            {
                abandoned = true;
                await store.AbandonAsync(uid, scope, key, CancellationToken.None);
            }
            else
            {
                await store.CompleteAsync(uid, scope, key, status, body, "application/json", CancellationToken.None);
            }

            return;
        }
        catch
        {
            if (!abandoned)
                await store.AbandonAsync(uid, scope, key, CancellationToken.None);
            throw;
        }
    }

    private static ObjectResult BuildProblem(int status, string title, string detail, string code, HttpContext http)
    {
        var pd = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Type = $"https://errors.nequitrampa.internal/{code}",
        };
        pd.Extensions["code"] = code;
        if (http.Items[CorrelationKeys.RequestId] is string rid)
            pd.Extensions["requestId"] = rid;

        return new ObjectResult(pd)
        {
            StatusCode = status,
            ContentTypes = { "application/problem+json" }
        };
    }

    private static (int status, string? body) ExtractResult(IActionResult? result)
    {
        if (result is null)
            return (200, null);

        if (result is ObjectResult or)
        {
            var status = or.StatusCode ?? 200;
            string? body = null;
            if (or.Value != null)
                body = JsonSerializer.Serialize(or.Value, JsonSerializerOptions.Web);
            return (status, body);
        }

        if (result is StatusCodeResult sr)
            return (sr.StatusCode, null);

        return (200, null);
    }
}
