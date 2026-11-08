using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Profile.Services;
using Nequi.Shared.Http;

namespace Nequi.Profile.Controllers;

public sealed record RegisterRequest(string? Email, string? Password, string? FirstName, string? LastName);

/// <summary>
/// Auto-registro público de clientes nuevos. El auto-registro público de Identity Platform permanece
/// desactivado: este endpoint crea la identidad con la cuenta de servicio del backend (nunca expone
/// Identity Platform directamente al cliente) y el cliente en Spanner (clients + wallet_accounts).
/// </summary>
[ApiController]
[Route("v1/auth")]
[AllowAnonymous]
[Produces("application/json")]
public sealed partial class RegisterController(IIdentityRegistrar identity, IProfileDataStore profiles, ILogger<RegisterController> logger) : ControllerBase
{
    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex EmailPattern();

    /// <summary>Crea una cuenta de cliente nueva y devuelve su perfil (201), listo para iniciar sesión.</summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ProfileDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        var password = request.Password ?? "";
        var firstName = request.FirstName?.Trim() ?? "";
        var lastName = request.LastName?.Trim() ?? "";

        if (!EmailPattern().IsMatch(email))
            return this.ProblemJson(422, "Correo inválido", "El correo no tiene un formato válido.", "VALIDATION_ERROR");
        if (password.Length < 8)
            return this.ProblemJson(422, "Contraseña inválida", "La contraseña debe tener al menos 8 caracteres.", "VALIDATION_ERROR");
        if (firstName.Length < 2 || lastName.Length < 2)
            return this.ProblemJson(422, "Nombre inválido", "Nombre y apellido deben tener al menos 2 caracteres.", "VALIDATION_ERROR");

        if (await identity.ExistsByEmailAsync(email, ct))
            return this.ProblemJson(409, "Correo ya registrado", "Ya existe una cuenta con ese correo.", "ALREADY_EXISTS");

        var uid = $"idp-sub-{Guid.NewGuid():N}";
        var clientId = Guid.NewGuid().ToString();
        await identity.CreateUserAsync(uid, email, password, clientId, ct);

        try
        {
            var profile = await profiles.CreateClientAsync(uid, clientId, email, firstName, lastName, ct);
            return Created("/v1/profile", profile);
        }
        catch (ClientAlreadyExistsException)
        {
            await identity.DeleteUserAsync(uid, CancellationToken.None);
            return this.ProblemJson(409, "Correo ya registrado", "Ya existe una cuenta con ese correo.", "ALREADY_EXISTS");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Client creation failed after identity signUp for {Uid}; rolling back", uid);
            await identity.DeleteUserAsync(uid, CancellationToken.None);
            throw;
        }
    }
}
