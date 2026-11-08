using Google.Cloud.Spanner.Data;
using Google.Cloud.Spanner.V1;
using Nequi.Shared.Data;

namespace Nequi.Profile.Controllers;

/// <summary>El correo, el nombre de usuario o el código de transferencia generado ya existen.</summary>
public sealed class ClientAlreadyExistsException(string message) : Exception(message);

public interface IProfileDataStore
{
    Task<ProfileDto?> GetAsync(string authSubject, CancellationToken ct);
    Task<ProfileDto?> UpdateAsync(string authSubject, string? timezone, string? alias, CancellationToken ct);

    /// <summary>Crea el cliente (Spanner: clients + wallet_accounts) para una identidad recién registrada.
    /// Genera username y public_transfer_code únicos. Lanza <see cref="ClientAlreadyExistsException"/> si
    /// el correo ya existe (carrera con la verificación previa contra Identity Platform).</summary>
    Task<ProfileDto> CreateClientAsync(string authSubject, string clientId, string email, string firstName, string lastName, CancellationToken ct);
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

    public Task<ProfileDto> CreateClientAsync(string authSubject, string clientId, string email, string firstName, string lastName, CancellationToken ct)
    {
        lock (gate)
        {
            if (profiles.Values.Any(p => string.Equals(p.Email, email, StringComparison.OrdinalIgnoreCase)))
                throw new ClientAlreadyExistsException("El correo ya está registrado.");
            var now = DateTimeOffset.UtcNow;
            var profile = new ProfileDto(
                ClientId: clientId,
                AuthSubject: authSubject,
                Email: email,
                Username: email.Split('@')[0],
                FirstName: firstName,
                LastName: lastName,
                Alias: null,
                TransferCode: $"TRF-{lastName.ToUpperInvariant().PadRight(3, 'X')[..3]}-{Random.Shared.Next(0, 10000):D4}",
                Status: "ACTIVE",
                Timezone: "America/Bogota",
                WalletId: $"wallet-{clientId}",
                WalletStatus: "ACTIVE",
                Currency: "COP",
                CreatedAt: now,
                UpdatedAt: now);
            profiles[authSubject] = profile;
            return Task.FromResult(profile);
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

    private const int MaxCodeAttempts = 8;

    public async Task<ProfileDto> CreateClientAsync(string authSubject, string clientId, string email, string firstName, string lastName, CancellationToken ct)
    {
        for (var attempt = 1; ; attempt++)
        {
            var username = GenerateUsername(email, attempt);
            var transferCode = GenerateTransferCode(lastName);
            var accountId = Guid.NewGuid().ToString();

            try
            {
                await using var conn = db.Open();
                await conn.RunWithRetriableTransactionAsync(async tx =>
                {
                    var insertClient = conn.CreateDmlCommand(
                        "INSERT INTO clients (client_id, auth_subject, email, username, first_name, last_name, public_transfer_code, status, timezone, created_at, updated_at) " +
                        "VALUES (@clientId, @sub, @email, @username, @first, @last, @code, 'ACTIVE', 'America/Bogota', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())");
                    insertClient.Transaction = tx;
                    insertClient.Parameters.Add("clientId", SpannerDbType.String, clientId);
                    insertClient.Parameters.Add("sub", SpannerDbType.String, authSubject);
                    insertClient.Parameters.Add("email", SpannerDbType.String, email);
                    insertClient.Parameters.Add("username", SpannerDbType.String, username);
                    insertClient.Parameters.Add("first", SpannerDbType.String, firstName);
                    insertClient.Parameters.Add("last", SpannerDbType.String, lastName);
                    insertClient.Parameters.Add("code", SpannerDbType.String, transferCode);
                    await insertClient.ExecuteNonQueryAsync(ct);

                    var insertWallet = conn.CreateDmlCommand(
                        "INSERT INTO wallet_accounts (account_id, account_type, client_id, currency, current_balance_minor, status, version, created_at, updated_at) " +
                        "VALUES (@accountId, 'CLIENT_WALLET', @clientId, 'COP', 0, 'ACTIVE', 1, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())");
                    insertWallet.Transaction = tx;
                    insertWallet.Parameters.Add("accountId", SpannerDbType.String, accountId);
                    insertWallet.Parameters.Add("clientId", SpannerDbType.String, clientId);
                    await insertWallet.ExecuteNonQueryAsync(ct);
                    return 0;
                });

                return await GetAsync(authSubject, ct)
                    ?? throw new InvalidOperationException("El cliente se creó pero no se pudo leer de vuelta.");
            }
            catch (SpannerException ex) when (ex.ErrorCode == ErrorCode.AlreadyExists)
            {
                if (ex.Message.Contains("ux_clients_email", StringComparison.OrdinalIgnoreCase))
                    throw new ClientAlreadyExistsException("El correo ya está registrado.");
                var collidesOnGeneratedValue =
                    ex.Message.Contains("ux_clients_username", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("ux_clients_transfer_code", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("clients_pkey", StringComparison.OrdinalIgnoreCase);
                if (!collidesOnGeneratedValue || attempt >= MaxCodeAttempts) throw;
                // Username/código/client_id generados chocaron con un registro existente: reintenta con nuevos valores.
            }
        }
    }

    private static string GenerateUsername(string email, int attempt)
    {
        var local = new string((email.Split('@')[0] ?? "user").Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
        if (local.Length == 0) local = "user";
        var suffix = attempt == 1 ? "" : Random.Shared.Next(0, 10000).ToString("D4");
        var trimmed = local[..Math.Min(local.Length, 50 - suffix.Length)];
        return trimmed + suffix;
    }

    private static string GenerateTransferCode(string lastName)
    {
        var letters = new string(lastName.Where(char.IsLetter).ToArray()).ToUpperInvariant();
        var prefix = (letters.Length >= 3 ? letters[..3] : letters.PadRight(3, 'X'));
        return $"TRF-{prefix}-{Random.Shared.Next(0, 10000):D4}";
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
