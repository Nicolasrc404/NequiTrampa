using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Nequi.Tests;

/// <summary>
/// RBAC del Backoffice: deny-by-default, separación de funciones y rechazo de CLIENTE
/// en rutas administrativas/financieras. Solo se invocan rutas que no tocan Spanner
/// (las permitidas usan datos estáticos) para no depender de GCP.
/// </summary>
public class BackofficeAuthorizationTests
{
    private readonly WebApplicationFactory<Nequi.Backoffice.BackofficeMarker> _factory = Env.Backoffice();

    private HttpClient As(string uid, string role)
    {
        var client = _factory.CreateClient();
        client.As(uid, role);
        client.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        return client;
    }

    [Fact]
    public async Task Sin_token_devuelve_401()
    {
        using var http = _factory.CreateClient();

        var response = await http.GetAsync("/v1/admin/users");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Cliente_no_accede_a_admin_finanzas_ni_soporte()
    {
        using var http = As("uid-cliente", "CLIENTE");

        Assert.Equal(HttpStatusCode.Forbidden, (await http.GetAsync("/v1/admin/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await http.GetAsync("/v1/financial-operations/op-1")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await http.GetAsync("/v1/support/cases")).StatusCode);
    }

    [Fact]
    public async Task Soporte_no_gestiona_roles_ni_ejecuta_reversos()
    {
        using var http = As("uid-soporte", "SOPORTE");

        Assert.Equal(HttpStatusCode.Forbidden, (await http.GetAsync("/v1/admin/roles")).StatusCode);
        var reverse = await http.PostAsJsonAsync(
            "/v1/financial-operations/op-1/reversals",
            new { reason = "motivo de prueba" });
        Assert.Equal(HttpStatusCode.Forbidden, reverse.StatusCode);
    }

    [Fact]
    public async Task Operador_no_gestiona_usuarios_ni_roles()
    {
        using var http = As("uid-operador", "OPERADOR_FINANCIERO");

        Assert.Equal(HttpStatusCode.Forbidden, (await http.GetAsync("/v1/admin/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await http.GetAsync("/v1/admin/roles")).StatusCode);
    }

    [Fact]
    public async Task Admin_no_mueve_dinero()
    {
        using var http = As("uid-admin", "ADMIN");

        var adjustment = await http.PostAsJsonAsync("/v1/financial-adjustments", new
        {
            clientId = "client-a",
            direction = "CREDIT",
            amount = 1000,
            reason = "ajuste de prueba",
        });

        Assert.Equal(HttpStatusCode.Forbidden, adjustment.StatusCode);
    }

    [Fact]
    public async Task Admin_si_accede_a_rutas_de_administracion()
    {
        using var http = As("uid-admin", "ADMIN");

        var response = await http.GetAsync("/v1/admin/roles");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
