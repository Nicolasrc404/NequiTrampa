using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Shared.Security;
using Nequi.Wallet.DTOs;
using Nequi.Wallet.Services;

namespace Nequi.Wallet.Controllers;

[ApiController]
[Route("v1/transfers/recovery")]
[Authorize(Policy = Policies.Client)]
[Produces("application/json")]
public sealed class TransferRecoveryController(
    IConfirmedTransferRecoveryService recovery,
    IConfiguration configuration) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<TransferResponseDto>> Recover(
        [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
        [FromHeader(Name = "X-Request-Hash")] string? requestHash,
        [FromBody] CreateTransferRequestDto request,
        CancellationToken cancellationToken)
    {
        if (configuration.GetValue<bool>("FinancialRecovery:EnableConfirmedTransferRecovery") != true)
            return NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Recuperación deshabilitada",
                Detail = "La recuperación de transferencias confirmadas no está habilitada.",
                Extensions = { ["code"] = "transfer_recovery_disabled" }
            });

        var user = CurrentUser.From(User);
        if (user is null)
            return Unauthorized();

        var result = await recovery.RecoverAsync(
            user.Uid,
            idempotencyKey ?? string.Empty,
            requestHash ?? string.Empty,
            request,
            cancellationToken);

        return result.Kind switch
        {
            TransferRecoveryKind.Recovered => Ok(result.Response),
            TransferRecoveryKind.Conflict => Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Conflicto de idempotencia",
                Detail = "La clave fue utilizada con otra solicitud.",
                Extensions = { ["code"] = result.Code }
            }),
            _ => Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Recuperación bloqueada",
                Detail = "No existe evidencia durable suficiente para recuperar la transferencia.",
                Extensions = { ["code"] = result.Code }
            })
        };
    }
}
