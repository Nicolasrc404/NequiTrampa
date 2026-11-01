using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Nequi.Shared.Idempotency;
using Nequi.Wallet.DTOs;

namespace Nequi.Wallet.Services;

/// <summary>
/// Adapts the read-only confirmed-transfer recovery service to the shared
/// idempotency filters. It is registered only for the explicitly enabled,
/// non-production recovery configuration.
/// </summary>
public sealed class ConfirmedTransferIdempotencyRecoveryHandler(
    IConfirmedTransferRecoveryService recovery) : IIdempotencyRecoveryHandler
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<IdempotencyRecoveryResponse?> TryRecoverAsync(
        HttpContext http,
        string actorId,
        string scope,
        string idempotencyKey,
        string requestHash,
        CancellationToken ct)
    {
        if (!string.Equals(scope, "POST:/v1/transfers", StringComparison.Ordinal))
            return null;

        http.Request.EnableBuffering();
        http.Request.Body.Position = 0;
        CreateTransferRequestDto? request;
        try
        {
            request = await JsonSerializer.DeserializeAsync<CreateTransferRequestDto>(
                http.Request.Body, JsonOptions, ct);
        }
        catch (JsonException)
        {
            request = null;
        }
        finally
        {
            http.Request.Body.Position = 0;
        }

        if (request is null)
            return Problem(409, "transfer_recovery_invalid_request",
                "No se pudo reconstruir de forma segura la solicitud original.");

        var result = await recovery.RecoverAsync(
            actorId, idempotencyKey, requestHash, request, ct);

        return result.Kind switch
        {
            TransferRecoveryKind.Recovered => new IdempotencyRecoveryResponse(
                StatusCodes.Status200OK,
                JsonSerializer.Serialize(result.Response, JsonOptions)),
            TransferRecoveryKind.Conflict => Problem(
                StatusCodes.Status409Conflict,
                result.Code ?? "idempotency_key_conflict",
                "La solicitud no coincide con la intención financiera original."),
            _ => Problem(
                StatusCodes.Status409Conflict,
                result.Code ?? "transfer_recovery_blocked",
                "No existe evidencia durable suficiente para repetir o recuperar la operación."),
        };
    }

    private static IdempotencyRecoveryResponse Problem(int status, string code, string detail) =>
        new(
            status,
            JsonSerializer.Serialize(new
            {
                type = $"https://errors.nequitrampa.internal/{code}",
                title = "Recuperación financiera bloqueada",
                status,
                detail,
                code,
            }, JsonOptions),
            "application/problem+json");
}
