using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Nequi.Shared.Http;
using Nequi.Shared.Security;

namespace Nequi.Shared.Idempotency;

/// <summary>Endpoint filter: requires an Idempotency-Key header and replays/rejects duplicates.</summary>
public sealed class IdempotencyFilter : IEndpointFilter
{
    public const string HeaderName = "Idempotency-Key";
    public const int MaxKeyLength = 64; // idempotency_records.idempotency_key is STRING(64);

    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var http = ctx.HttpContext;
        var key = http.Request.Headers[HeaderName].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(key) || key.Length > MaxKeyLength)
            return Problems.Problem(http, 400, "Idempotency-Key required",
                $"Send an {HeaderName} header (1-{MaxKeyLength} chars).", "idempotency_key_required");

        var store = http.RequestServices.GetRequiredService<IIdempotencyStore>();
        var uid = CurrentUser.From(http.User)?.Uid ?? "anonymous";
        var scope = $"{http.Request.Method}:{http.Request.Path}"; // fits idempotency_records.scope STRING(64)
        if (scope.Length > 64) scope = scope[..64];

        // Body buffering is enabled upstream (UseNequiCommon) so it can be re-read after model binding.
        http.Request.EnableBuffering();
        http.Request.Body.Position = 0;
        using var ms = new MemoryStream();
        await http.Request.Body.CopyToAsync(ms, http.RequestAborted);
        http.Request.Body.Position = 0;
        var hash = Convert.ToHexString(SHA256.HashData(ms.ToArray()));

        var (outcome, record) = await store.BeginAsync(uid, scope, key, hash, http.RequestAborted);
        switch (outcome)
        {
            case BeginOutcome.Conflict:
                return Problems.Problem(http, 409, "Idempotency key reused with a different body", code: "idempotency_key_conflict");
            case BeginOutcome.InProgress:
                return Problems.Problem(http, 409, "A request with this Idempotency-Key is still in progress", code: "idempotency_in_progress");
            case BeginOutcome.Stale:
                // Abandoned IN_PROGRESS record: it may have committed. Never replay automatically.
                return Problems.Problem(http, 409, "Idempotency key requires reconciliation",
                    "This Idempotency-Key was left in progress after a possible commit. " +
                    "Verify the operation against the ledger/movements before retrying with a new key.",
                    code: "idempotency_stale");
            case BeginOutcome.Replay:
                http.Response.Headers["Idempotent-Replayed"] = "true";
                return Results.Content(record!.ResponseBody ?? "", record.ContentType ?? "application/json", Encoding.UTF8, record.StatusCode);
        }

        try
        {
            var result = await next(ctx);
            var status = (result as IStatusCodeHttpResult)?.StatusCode ?? 200;
            string? body = null;
            if (result is IValueHttpResult { Value: not null } v)
                body = JsonSerializer.Serialize(v.Value, JsonSerializerOptions.Web);
            // Only cache definitive outcomes (< 500). Uncertain outcomes (>= 500) remain IN_PROGRESS
            // to require reconciliation and prevent dangerous duplicate commits.
            if (status < 500)
            {
                await store.CompleteAsync(uid, scope, key, status, body, "application/json", CancellationToken.None);
            }
            return result;
        }
        catch (BadHttpRequestException ex) when (ex.StatusCode < 500)
        {
            var problemBody = JsonSerializer.Serialize(new
            {
                status = ex.StatusCode,
                title = "Bad Request",
                detail = ex.Message,
                code = "bad_request"
            });
            await store.CompleteAsync(uid, scope, key, ex.StatusCode, problemBody, "application/problem+json", CancellationToken.None);
            throw;
        }
        catch
        {
            // Do NOT abandon on unhandled exception: preserve IN_PROGRESS record for financial consistency.
            throw;
        }
    }
}

public static class IdempotencyExtensions
{
    public static RouteHandlerBuilder RequireIdempotency(this RouteHandlerBuilder b) =>
        b.AddEndpointFilter<IdempotencyFilter>().WithMetadata(new RequiresIdempotencyMetadata());
}

/// <summary>Marks endpoints guarded by <see cref="IdempotencyFilter"/> so OpenAPI can document the header.</summary>
public sealed class RequiresIdempotencyMetadata;
