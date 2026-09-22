using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Shared.Security;
using Nequi.Wallet.DTOs;
using Nequi.Wallet.Interfaces;

namespace Nequi.Wallet.Controllers;

/// <summary>
/// Controlador para consulta de billetera y saldo.
/// Acceso exclusivo: rol CLIENTE sobre sus propios recursos.
/// Implementación actual: MOCK (MockWalletService). La autoridad financiera real será Cloud Spanner (TO-BE).
/// </summary>
[ApiController]
[Route("v1/wallet")]
[Authorize(Policy = Policies.Client)]
[Produces("application/json")]
public sealed class WalletController(IWalletService walletService, ILogger<WalletController> logger) : ControllerBase
{
    /// <summary>
    /// Consulta la información general de la billetera del cliente autenticado (MOCK).
    /// </summary>
    /// <response code="200">Información de la billetera digital obtenida exitosamente.</response>
    /// <response code="401">No autenticado o token JWT inválido/expirado (RFC 8725 / RFC 9457).</response>
    /// <response code="404">La billetera digital solicitada no existe para el cliente.</response>
    [HttpGet]
    [ProducesResponseType(typeof(WalletResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WalletResponseDto>> GetWallet(CancellationToken cancellationToken)
    {
        var user = CurrentUser.From(User);
        if (user is null) return Unauthorized();

        logger.LogInformation("Consultando wallet para cliente {ClientId}", user.Uid);

        var wallet = await walletService.GetWalletByClientIdAsync(user.Uid, cancellationToken);
        return Ok(wallet);
    }

    /// <summary>
    /// Consulta el saldo digital simulado.
    /// NOTA: <c>CurrentUser.Uid</c> se usa como clave de cliente de forma temporal (MOCK);
    /// en producción se resolverá UID → clientId financiero desde Spanner (TO-BE).
    /// </summary>
    /// <response code="200">Saldo simulado obtenido. SourceAuthority = MOCK_IN_MEMORY.</response>
    /// <response code="401">No autenticado o token inválido.</response>
    /// <response code="404">Cuenta de billetera no encontrada.</response>
    [HttpGet("balance")]
    [ProducesResponseType(typeof(WalletBalanceResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WalletBalanceResponseDto>> GetBalance(CancellationToken cancellationToken)
    {
        var user = CurrentUser.From(User);
        if (user is null) return Unauthorized();

        logger.LogInformation("Consultando saldo (MOCK) para cliente {ClientId}", user.Uid);

        var balance = await walletService.GetOfficialBalanceAsync(user.Uid, cancellationToken);
        return Ok(balance);
    }
}
