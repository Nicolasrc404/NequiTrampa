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
        var hash = IdempotencyRequestHash.Compute(ms.ToArray());

        var (outcome, record) = await store.BeginAsync(uid, scope, key, hash, http.RequestAborted);
        switch (outcome)
        {
            case BeginOutcome.Conflict:
                return Problems.Problem(http, 409, "Idempotency key reused with a different body", code: "idempotency_key_conflict");
            case BeginOutcome.InProgress:
                var recovery = http.RequestServices.GetService<IIdempotencyRecoveryHandler>();
                if (recovery is not null)
                {
                    var recovered = await recovery.TryRecoverAsync(
                        http, uid, scope, key, hash, http.RequestAborted);
                    if (recovered is not null)
                    {
                        http.Response.Headers["Idempotent-Recovered"] = "true";
                        return Results.Content(
                            recovered.Body,
                            recovered.ContentType,
                            Encoding.UTF8,
                            recovered.StatusCode);
                    }
                }
                return Problems.Problem(http, 409,
                    "The operation is pending confirmation or reconciliation",
                    "Do not start an equivalent financial intention with a new Idempotency-Key until the original result is verified.",
                    "idempotency_in_progress");
            case BeginOutcome.Replay:
                http.Response.Headers["Idempotent-Replayed"] = "true";
                return Results.Content(record!.ResponseBody ?? "", record.ContentType ?? "application/json", Encoding.UTF8, record.StatusCode);
        }

        object? result;
        try
        {
            result = await next(ctx);
        }
        catch
        {
            // The handler may have committed a financial effect before the exception
            // escaped. Keep the reservation for reconciliation.
            throw;
        }

        var status = (result as IStatusCodeHttpResult)?.StatusCode ?? 200;
        if (status >= 500)
        {
            // The handler may have committed a financial effect before producing the
            // 5xx. Keep the reservation until the outcome is reconciled safely.
            return result;
        }

        // The endpoint already ran and succeeded (status < 500): any financial effect
        // is already committed. AbandonAsync must never run from here on — deleting the
        // IN_PROGRESS record now would let a retry with the same key re-execute an
        // already-applied movement. If CompleteAsync itself fails, the record stays
        // IN_PROGRESS so a retry is rejected with 409 instead of silently duplicating it.
        string? body = null;
        if (result is IValueHttpResult { Value: not null } v)
            body = JsonSerializer.Serialize(v.Value, JsonSerializerOptions.Web);
        await store.CompleteAsync(uid, scope, key, status, body, "application/json", CancellationToken.None);
        return result;
    }
}

public static class IdempotencyExtensions
{
    public static RouteHandlerBuilder RequireIdempotency(this RouteHandlerBuilder b) =>
        b.AddEndpointFilter<IdempotencyFilter>().WithMetadata(new RequiresIdempotencyMetadata());
}

/// <summary>Marks endpoints guarded by <see cref="IdempotencyFilter"/> so OpenAPI can document the header.</summary>
public sealed class RequiresIdempotencyMetadata;
