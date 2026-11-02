using Google.Cloud.Spanner.Data;
using Nequi.Shared.Data;

namespace Nequi.Profile.Controllers;

public interface IProfileDataStore
{
    Task<ProfileDto?> GetAsync(string authSubject, CancellationToken ct);
    Task<ProfileDto?> UpdateAsync(string authSubject, string? timezone, string? alias, CancellationToken ct);
}

/// <summary>Perfil local y determinista para la demostración académica en memoria.</summary>
public sealed class AcademicProfileDataStore : IProfileDataStore
{
    private readonly object gate = new();
    private readonly Dictionary<string, ProfileDto> profiles = new(StringComparer.Ordinal);

    public Task<ProfileDto?> GetAsync(string authSubject, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(authSubject)) return Task.FromResult<ProfileDto?>(null);
        lock (gate)
        {
            if (!profiles.TryGetValue(authSubject, out var profile))
            {
                profile = Create(authSubject);
                profiles[authSubject] = profile;
            }
            return Task.FromResult<ProfileDto?>(profile);
        }
    }

    public async Task<ProfileDto?> UpdateAsync(string authSubject, string? timezone, string? alias, CancellationToken ct)
    {
        var current = await GetAsync(authSubject, ct);
        if (current is null) return null;
        lock (gate)
        {
            var updated = current with
            {
                Timezone = timezone ?? current.Timezone,
                Alias = alias ?? current.Alias,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            profiles[authSubject] = updated;
            return updated;
        }
    }

    private static ProfileDto Create(string authSubject)
    {
        var safeSubject = new string(authSubject.Where(char.IsLetterOrDigit).ToArray());
        if (safeSubject.Length == 0) safeSubject = "USER";
        var codeSuffix = safeSubject[..Math.Min(16, safeSubject.Length)].ToUpperInvariant();
        var now = DateTimeOffset.UtcNow;
        return new ProfileDto(
            ClientId: $"academic-client-{safeSubject}",
            AuthSubject: authSubject,
            Email: $"{safeSubject.ToLowerInvariant()}@academic.local",
            Username: safeSubject,
            FirstName: "Usuario",
            LastName: "Academico",
            Alias: null,
            TransferCode: $"ACA-{codeSuffix}",
            Status: "ACTIVE",
            Timezone: "America/Bogota",
            WalletId: $"wallet-{safeSubject}",
            WalletStatus: "ACTIVE",
            Currency: "COP",
            CreatedAt: now,
            UpdatedAt: now);
    }
}

/// <summary>Persistencia del perfil para el backend GCP existente.</summary>
public sealed class SpannerProfileDataStore(SpannerDb db) : IProfileDataStore
{
    private const string Select =
        "SELECT c.client_id, c.auth_subject, c.email, c.username, c.first_name, c.last_name, c.alias, c.public_transfer_code, c.status, c.timezone, " +
        "c.created_at, c.updated_at, w.account_id, w.status, w.currency " +
        "FROM clients c LEFT JOIN wallet_accounts w ON w.client_id = c.client_id AND w.account_type = 'CLIENT_WALLET' " +
        "WHERE c.auth_subject = @sub";

    public async Task<ProfileDto?> GetAsync(string authSubject, CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateSelectCommand(Select);
        cmd.Parameters.Add("sub", SpannerDbType.String, authSubject);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        return await ReadAsync(reader, ct);
    }

    public async Task<ProfileDto?> UpdateAsync(string authSubject, string? timezone, string? alias, CancellationToken ct)
    {
        await using var conn = db.Open();
        var cmd = conn.CreateDmlCommand(
            "UPDATE clients SET timezone = COALESCE(@tz, timezone), alias = COALESCE(@alias, alias), updated_at = CURRENT_TIMESTAMP() WHERE auth_subject = @sub");
        cmd.Parameters.Add("tz", SpannerDbType.String, timezone is null ? DBNull.Value : timezone);
        cmd.Parameters.Add("alias", SpannerDbType.String, alias is null ? DBNull.Value : alias.Trim());
        cmd.Parameters.Add("sub", SpannerDbType.String, authSubject);
        if (await cmd.ExecuteNonQueryAsync(ct) == 0) return null;
        return await GetAsync(authSubject, ct);
    }

    private static async Task<ProfileDto?> ReadAsync(SpannerDataReader reader, CancellationToken ct)
    {
        if (!await reader.ReadAsync(ct)) return null;
        static DateTimeOffset Ts(DateTime value) => new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
        return new ProfileDto(reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3), reader.GetString(4), reader.GetString(5),
            reader.IsDBNull(6) ? null : reader.GetString(6), reader.GetString(7), reader.GetString(8), reader.GetString(9),
            reader.IsDBNull(12) ? null : reader.GetString(12), reader.IsDBNull(13) ? null : reader.GetString(13), reader.IsDBNull(14) ? null : reader.GetString(14),
            Ts(reader.GetFieldValue<DateTime>(10)), Ts(reader.GetFieldValue<DateTime>(11)));
    }
}
