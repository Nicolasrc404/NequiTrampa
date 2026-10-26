using Microsoft.Extensions.DependencyInjection;
using Nequi.Shared.Security;

namespace Nequi.Tests;

/// <summary>
/// Verifica la resolución consistente auth_subject → client_id y que un identificador de
/// autenticación nunca se use como identificador financiero por convención.
/// </summary>
public class ClientIdentityTests
{
    private sealed class FakeDirectory(string? clientId) : IClientDirectory
    {
        public int Calls { get; private set; }

        public Task<string?> FindActiveClientIdAsync(string authSubject, CancellationToken ct)
        {
            Calls++;
            return Task.FromResult(clientId);
        }
    }

    private static ClientIdentityResolver Resolver(IClientDirectory? directory)
    {
        var services = new ServiceCollection();
        if (directory is not null) services.AddSingleton(directory);
        return new ClientIdentityResolver(services.BuildServiceProvider());
    }

    private static CurrentUser User(string uid, string role, string? clientId = null) =>
        new(uid, new HashSet<string> { role }, clientId);

    [Fact]
    public async Task Claim_client_id_tiene_prioridad_y_no_consulta_el_directorio()
    {
        var directory = new FakeDirectory("directorio");
        var resolver = Resolver(directory);

        var result = await resolver.ResolveAsync(User("uid-1", Roles.Cliente, "claim-id"), CancellationToken.None);

        Assert.Equal("claim-id", result);
        Assert.Equal(0, directory.Calls);
    }

    [Fact]
    public async Task Sin_claim_resuelve_el_client_id_desde_el_directorio()
    {
        var directory = new FakeDirectory("client-1");
        var resolver = Resolver(directory);

        var result = await resolver.ResolveAsync(User("uid-1", Roles.Cliente), CancellationToken.None);

        Assert.Equal("client-1", result);
        Assert.Equal(1, directory.Calls);
    }

    [Fact]
    public async Task Sin_claim_y_sin_directorio_devuelve_null_y_no_usa_el_uid()
    {
        var resolver = Resolver(directory: null);

        var result = await resolver.ResolveAsync(User("uid-1", Roles.Cliente), CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task Un_cliente_sin_registro_activo_no_obtiene_contexto_financiero()
    {
        var resolver = Resolver(new FakeDirectory(clientId: null));

        var result = await resolver.ResolveAsync(User("uid-1", Roles.Cliente), CancellationToken.None);

        Assert.Null(result);
    }

    [Theory]
    [InlineData(Roles.Soporte)]
    [InlineData(Roles.OperadorFinanciero)]
    [InlineData(Roles.Admin)]
    public async Task El_staff_no_se_resuelve_por_auth_subject(string role)
    {
        var directory = new FakeDirectory("client-1");
        var resolver = Resolver(directory);

        var result = await resolver.ResolveAsync(User("staff-1", role), CancellationToken.None);

        Assert.Null(result);
        Assert.Equal(0, directory.Calls);
    }

    [Fact]
    public async Task El_claim_de_staff_se_respeta_si_existe()
    {
        var resolver = Resolver(new FakeDirectory("client-1"));

        var result = await resolver.ResolveAsync(User("staff-1", Roles.Soporte, "client-9"), CancellationToken.None);

        Assert.Equal("client-9", result);
    }
}
