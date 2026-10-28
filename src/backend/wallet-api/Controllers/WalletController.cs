using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NequiTrampa.WalletApi.DTOs;
using NequiTrampa.WalletApi.Interfaces;
using NequiTrampa.WalletApi.Security;

namespace NequiTrampa.WalletApi.Controllers;

/// <summary>
/// Controlador para consulta de billetera y saldo autoritativo en Cloud Spanner.
/// </summary>
[ApiController]
[Route("v1/wallet")]
[Authorize(Roles = AuthorizationRoles.Cliente)]
[Authorize(Policy = AuthorizationPolicies.RequireCliente)]
[Produces("application/json")]
public class WalletController : ControllerBase
{
    private readonly IWalletService _walletService;
    private readonly ILogger<WalletController> _logger;

    public WalletController(IWalletService _walletService, ILogger<WalletController> logger)
    {
        this._walletService = _walletService;
        _logger = logger;
    }

    /// <summary>
    /// Consulta la información general de la billetera del cliente autenticado.
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
        var clientId = GetCurrentClientId();
        _logger.LogInformation("Consultando información de wallet para cliente {ClientId}", clientId);

        var wallet = await _walletService.GetWalletByClientIdAsync(clientId, cancellationToken);
        return Ok(wallet);
    }

    /// <summary>
    /// Consulta el saldo digital oficial y vigente, resuelto directamente contra Cloud Spanner.
    /// </summary>
    /// <response code="200">Saldo oficial obtenido directamente de Cloud Spanner.</response>
    /// <response code="401">No autenticado o token inválido.</response>
    /// <response code="404">Cuenta de billetera no encontrada.</response>
    /// <response code="503">Dependencia autoritativa (Spanner) no disponible temporalmente.</response>
    [HttpGet("balance")]
    [ProducesResponseType(typeof(WalletBalanceResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<WalletBalanceResponseDto>> GetBalance(CancellationToken cancellationToken)
    {
        var clientId = GetCurrentClientId();
        _logger.LogInformation("Consultando saldo digital oficial en Spanner para cliente {ClientId}", clientId);

        var balance = await _walletService.GetOfficialBalanceAsync(clientId, cancellationToken);
        return Ok(balance);
    }

    private string GetCurrentClientId()
    {
        var clientId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? User.FindFirst("user_id")?.Value;

        if (string.IsNullOrWhiteSpace(clientId))
        {
            throw new UnauthorizedAccessException("El token JWT no contiene un identificador de usuario válido.");
        }

        return clientId;
    }
}
