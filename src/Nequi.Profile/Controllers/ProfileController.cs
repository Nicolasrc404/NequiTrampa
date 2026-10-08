using System.ComponentModel.DataAnnotations;
using Google.Cloud.Spanner.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Shared.Data;
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
public sealed class ProfileController(SpannerDb db) : ControllerBase
{
    private const string Select =
        "SELECT c.client_id, c.auth_subject, c.email, c.username, c.first_name, c.last_name, c.alias, c.public_transfer_code, c.status, c.timezone, " +
        "c.created_at, c.updated_at, w.account_id, w.status, w.currency " +
        "FROM clients c LEFT JOIN wallet_accounts w ON w.client_id = c.client_id AND w.account_type = 'CLIENT_WALLET' " +
        "WHERE c.auth_subject = @sub";

    /// <summary>Obtiene el perfil del cliente autenticado.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var profile = await ReadAsync(CurrentUser.From(User)!.Uid, ct);
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
        await using var conn = db.Open();
        var cmd = conn.CreateDmlCommand(
            "UPDATE clients SET timezone = COALESCE(@tz, timezone), alias = COALESCE(@alias, alias), updated_at = CURRENT_TIMESTAMP() WHERE auth_subject = @sub");
        cmd.Parameters.Add("tz", SpannerDbType.String, request.Timezone is null ? DBNull.Value : request.Timezone);
        cmd.Parameters.Add("alias", SpannerDbType.String, request.Alias is null ? DBNull.Value : request.Alias.Trim());
        cmd.Parameters.Add("sub", SpannerDbType.String, uid);
        if (await cmd.ExecuteNonQueryAsync(ct) == 0) return this.ProblemJson(404, "Profile not found", code: "not_found");
        return Ok(await ReadAsync(uid, ct));
    }

    private static bool IsValidTimezone(string id)
    {
        try { TimeZoneInfo.FindSystemTimeZoneById(id); return true; } catch { return false; }
    }

    private async Task<ProfileDto?> ReadAsync(string authSubject, CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateSelectCommand(Select);
        cmd.Parameters.Add("sub", SpannerDbType.String, authSubject);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct)) return null;
        static DateTimeOffset Ts(DateTime d) => new(DateTime.SpecifyKind(d, DateTimeKind.Utc));
        return new ProfileDto(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.GetString(4), r.GetString(5),
            r.IsDBNull(6) ? null : r.GetString(6), r.GetString(7), r.GetString(8), r.GetString(9),
            r.IsDBNull(12) ? null : r.GetString(12), r.IsDBNull(13) ? null : r.GetString(13), r.IsDBNull(14) ? null : r.GetString(14),
            Ts(r.GetFieldValue<DateTime>(10)), Ts(r.GetFieldValue<DateTime>(11)));
    }
}
