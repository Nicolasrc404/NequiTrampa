using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Google.Apis.Auth.OAuth2;

namespace Nequi.Profile.Services;

public interface IIdentityRegistrar
{
    Task<bool> ExistsByEmailAsync(string email, CancellationToken ct);
    Task CreateUserAsync(string uid, string email, string password, string clientId, CancellationToken ct);
    Task DeleteUserAsync(string uid, CancellationToken ct);
}

/// <summary>
/// Crea identidades de cliente en Identity Platform con la cuenta de servicio (Identity Toolkit Admin REST,
/// mismo mecanismo que <c>infra/seed-identity.sh</c> y el <c>IdentityAdmin</c> de Nequi.Backoffice).
/// El auto-registro público del proveedor permanece desactivado: el backend es el único que puede crear usuarios.
/// </summary>
public sealed class IdentityRegistrar(IHttpClientFactory http, IConfiguration config, ILogger<IdentityRegistrar> logger) : IIdentityRegistrar
{
    private readonly string _project = config["Gcp:ProjectId"] ?? throw new InvalidOperationException("Gcp:ProjectId is required");
    private GoogleCredential? _credential;

    private async Task<HttpClient> ClientAsync(CancellationToken ct)
    {
        _credential ??= (await GoogleCredential.GetApplicationDefaultAsync(ct)).CreateScoped("https://www.googleapis.com/auth/cloud-platform");
        var token = await ((ITokenAccess)_credential).GetAccessTokenForRequestAsync(cancellationToken: ct);
        var c = http.CreateClient("identity");
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        c.DefaultRequestHeaders.Remove("x-goog-user-project");
        c.DefaultRequestHeaders.Add("x-goog-user-project", _project);
        return c;
    }

    private string AccountsUrl => $"https://identitytoolkit.googleapis.com/v1/projects/{_project}/accounts";
    private string Url(string method) => $"{AccountsUrl}:{method}";

    public async Task<bool> ExistsByEmailAsync(string email, CancellationToken ct)
    {
        var c = await ClientAsync(ct);
        var res = await c.PostAsJsonAsync(Url("lookup"), new { email = new[] { email } }, ct);
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<JsonObject>(ct);
        return (body?["users"]?.AsArray().Count ?? 0) > 0;
    }

    public async Task CreateUserAsync(string uid, string email, string password, string clientId, CancellationToken ct)
    {
        var claims = new JsonObject { ["roles"] = new JsonArray("CLIENTE"), ["client_id"] = clientId };
        var c = await ClientAsync(ct);

        // Crear con uid explícito es un POST directo a /accounts (sin sufijo ":método"), igual que seed-identity.sh.
        var signUp = await c.PostAsJsonAsync(AccountsUrl, new
        {
            localId = uid,
            email,
            password,
            emailVerified = true,
        }, ct);
        if (!signUp.IsSuccessStatusCode)
        {
            logger.LogError("Identity signUp failed: {Status} {Body}", (int)signUp.StatusCode, await signUp.Content.ReadAsStringAsync(ct));
            throw new InvalidOperationException("No se pudo crear la identidad del cliente.");
        }

        // signUp ignora customAttributes al crear (igual que seed-identity.sh): se aplican con :update.
        var update = await c.PostAsJsonAsync(Url("update"), new { localId = uid, customAttributes = claims.ToJsonString() }, ct);
        if (!update.IsSuccessStatusCode)
        {
            logger.LogError("Identity claims update failed: {Status} {Body}", (int)update.StatusCode, await update.Content.ReadAsStringAsync(ct));
            await DeleteUserAsync(uid, CancellationToken.None);
            throw new InvalidOperationException("No se pudieron asignar los permisos del cliente.");
        }
    }

    public async Task DeleteUserAsync(string uid, CancellationToken ct)
    {
        try
        {
            var c = await ClientAsync(ct);
            var res = await c.PostAsJsonAsync(Url("delete"), new { localId = uid }, ct);
            if (!res.IsSuccessStatusCode)
                logger.LogError("Identity rollback delete failed for {Uid}: {Status} {Body}", uid, (int)res.StatusCode, await res.Content.ReadAsStringAsync(ct));
        }
        catch (Exception ex)
        {
            // El rollback nunca debe enmascarar el error original que lo disparó.
            logger.LogError(ex, "Identity rollback delete threw for {Uid}", uid);
        }
    }
}
