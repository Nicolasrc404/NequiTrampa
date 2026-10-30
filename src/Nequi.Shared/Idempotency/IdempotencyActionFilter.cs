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
public sealed class IdempotencyActionFilter(
    IIdempotencyStore store,
    ILogger<IdempotencyActionFilter> logger,
    IIdempotencyRecoveryHandler? recovery = null) : IAsyncActionFilter
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
        var hash = IdempotencyRequestHash.Compute(ms.ToArray());

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
                if (recovery is not null)
                {
                    var recovered = await recovery.TryRecoverAsync(
                        http, uid, scope, key, hash, http.RequestAborted);
                    if (recovered is not null)
                    {
                        http.Response.Headers["Idempotent-Recovered"] = "true";
                        context.Result = new ContentResult
                        {
                            StatusCode = recovered.StatusCode,
                            Content = recovered.Body,
                            ContentType = recovered.ContentType,
                        };
                        return;
                    }
                }
                context.Result = BuildProblem(409, "The operation is pending confirmation or reconciliation",
                    "Do not start an equivalent financial intention with a new Idempotency-Key until the original result is verified.",
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
        ActionExecutedContext executed;
        try
        {
            executed = await next();
        }
        catch
        {
            // The action may have committed a financial effect before the exception escaped.
            // Keep the reservation for reconciliation.
            // Do not infer that the effect was absent from the exception or client disconnect.
            throw;
        }

        if (executed.Exception != null)
        {
            // An exception does not prove that the financial effect was absent.
            throw executed.Exception;
        }

        var (status, body) = ExtractResult(executed.Result);
        if (status >= 500)
        {
            // The action may have committed a financial effect before producing the 5xx.
            // Keep the reservation until the outcome is reconciled safely.
            return;
        }

        // The action already ran and succeeded (status < 500): any financial effect
        // is already committed. From here on AbandonAsync must never run — deleting the
        // IN_PROGRESS record now would let a retry with the same key re-execute an
        // already-applied movement. If CompleteAsync itself fails, the record stays
        // IN_PROGRESS so a retry is rejected with 409 instead of silently duplicating it.
        await store.CompleteAsync(uid, scope, key, status, body, "application/json", CancellationToken.None);
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
