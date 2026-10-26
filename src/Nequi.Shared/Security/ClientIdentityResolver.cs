using Google.Cloud.Spanner.Data;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nequi.Shared.Data;

namespace Nequi.Shared.Security;

/// <summary>
/// Directorio de clientes del dominio, indexado por el auth subject de Identity Platform
/// (<c>clients.auth_subject</c>). Devuelve únicamente clientes ACTIVE: un cliente bloqueado
/// o suspendido no obtiene contexto financiero aunque su token siga vigente.
/// </summary>
public interface IClientDirectory
{
    Task<string?> FindActiveClientIdAsync(string authSubject, CancellationToken ct);
}

/// <summary>Implementación Spanner del directorio (autoridad de identidad de dominio).</summary>
public sealed class SpannerClientDirectory(SpannerDb db) : IClientDirectory
{
    public async Task<string?> FindActiveClientIdAsync(string authSubject, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(authSubject)) return null;

        await using var conn = db.Open();
        var cmd = conn.CreateSelectCommand(
            "SELECT client_id FROM clients WHERE auth_subject = @sub AND status = 'ACTIVE'");
        cmd.Parameters.Add("sub", SpannerDbType.String, authSubject);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? reader.GetString(0) : null;
    }
}

/// <summary>
/// Resuelve de forma consistente el <c>client_id</c> de dominio a partir del usuario autenticado.
///
/// Orden de resolución:
///   1. Claim <c>client_id</c> del token (camino normal; lo emite Identity Platform).
///   2. Directorio Spanner por <c>auth_subject</c> (tokens antiguos o sin custom claim).
///
/// Nunca deriva el client_id del auth subject por convención: si el directorio no está
/// disponible o no existe un cliente ACTIVE vinculado, devuelve <c>null</c> y el endpoint
/// debe denegar el acceso. La única excepción es un host local con
/// <c>Data:Backend=memory</c> y <c>Auth:DemoHeaders=true</c>, donde se conserva el
/// comportamiento histórico (uid como clave) porque no existe Spanner ni datos reales.
/// </summary>
public sealed class ClientIdentityResolver(IServiceProvider services)
{
    public async Task<string?> ResolveAsync(CurrentUser user, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(user.ClientId)) return user.ClientId;
        if (!user.Roles.Contains(Roles.Cliente)) return null;

        var directory = services.GetService<IClientDirectory>();
        if (directory is not null) return await directory.FindActiveClientIdAsync(user.Uid, ct);

        var config = services.GetService<IConfiguration>();
        var memoryBackend = string.Equals(config?["Data:Backend"], "memory", StringComparison.OrdinalIgnoreCase);
        var demoHeaders = config?.GetValue<bool>("Auth:DemoHeaders") == true;
        return memoryBackend && demoHeaders ? user.Uid : null;
    }
}
