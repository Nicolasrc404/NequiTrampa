using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Shared.Http;
using Nequi.Shared.Security;

namespace Nequi.Profile.Controllers;

public sealed record ProfileDto(string ClientId, string AuthSubject, string Email, string Username, string FirstName, string LastName, string? Alias,
    string TransferCode, string Status, string Timezone, string? WalletId, string? WalletStatus, string? Currency, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

/// <param name="Timezone">Id IANA (America/Bogota).</param>
/// <param name="Alias">Nombre corto visible para otros clientes (2-50 caracteres).</param>
public sealed record UpdateProfileRequest(string? Timezone, [StringLength(50, MinimumLength = 2)] string? Alias);

/// <summary>Perfil del cliente autenticado (Spanner: clients + wallet_accounts). Solo el propio cliente puede leerlo/editarlo.</summary>
[ApiController]
[Route("v1/profile")]
[Authorize(Policy = Policies.Client)]
[Produces("application/json")]
public sealed class ProfileController(IProfileDataStore profiles) : ControllerBase
{
    /// <summary>Obtiene el perfil del cliente autenticado.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var profile = await profiles.GetAsync(CurrentUser.From(User)!.Uid, ct);
        return profile is null
            ? this.ProblemJson(404, "Profile not found", "No client is linked to this identity.", "not_found")
            : Ok(profile);
    }

    /// <summary>Actualiza datos editables del perfil: zona horaria IANA y/o alias.</summary>
    [HttpPatch]
    [ProducesResponseType(typeof(ProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Update([FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        if (request.Timezone is null && request.Alias is null)
            return this.ProblemJson(422, "Nothing to update", "Send 'timezone' and/or 'alias'.", "VALIDATION_ERROR");
        if (request.Timezone is not null && !IsValidTimezone(request.Timezone))
            return this.ProblemJson(422, "Invalid timezone", "'timezone' must be a valid IANA timezone id, e.g. America/Bogota.", "VALIDATION_ERROR");

        var uid = CurrentUser.From(User)!.Uid;
        var profile = await profiles.UpdateAsync(uid, request.Timezone, request.Alias?.Trim(), ct);
        return profile is null
            ? this.ProblemJson(404, "Profile not found", code: "not_found")
            : Ok(profile);
    }

    private static bool IsValidTimezone(string id)
    {
        try { TimeZoneInfo.FindSystemTimeZoneById(id); return true; } catch { return false; }
    }

}
