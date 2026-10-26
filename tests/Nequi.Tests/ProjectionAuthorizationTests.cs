using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Nequi.Tests;

/// <summary>
/// Aislamiento por cliente en las proyecciones: un CLIENTE solo puede leer su propio
/// client_id de dominio; el staff debe ser explícito y un token sin contexto financiero
/// no accede a datos de otro cliente.
/// </summary>
public class ProjectionAuthorizationTests
{
    private static HttpClient Client(string uid, string? clientId = null, string role = "CLIENTE")
    {
        var client = Env.Workers().CreateClient();
        client.As(uid, role);
        if (clientId is not null) client.DefaultRequestHeaders.Add("X-Demo-Client-Id", clientId);
        return client;
    }

    [Fact]
    public async Task Cliente_lee_sus_propias_proyecciones()
    {
        using var http = Client("uid-a", "client-a");

        var response = await http.GetAsync("/v1/projections/movements");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("client-a", body.GetProperty("clientId").GetString());
    }

    [Fact]
    public async Task Cliente_no_puede_leer_proyecciones_de_otro_cliente()
    {
        using var http = Client("uid-a", "client-a");

        var response = await http.GetAsync("/v1/projections/movements?clientId=client-b");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Cliente_puede_repetir_su_propio_client_id_en_la_consulta()
    {
        using var http = Client("uid-a", "client-a");

        var response = await http.GetAsync("/v1/projections/movements?clientId=client-a");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Host_local_de_memoria_usa_el_uid_solo_por_el_fallback_explicito()
    {
        // En Data:Backend=memory + Auth:DemoHeaders=true no hay Spanner ni datos reales.
        // El fallback a uid es explícito y está cubierto por ClientIdentityTests para el
        // camino de producción (sin configuración → null).
        using var http = Client("uid-a");

        var response = await http.GetAsync("/v1/projections/movements");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("uid-a", body.GetProperty("clientId").GetString());
    }

    [Fact]
    public async Task Staff_debe_indicar_client_id_y_no_escanea_todo()
    {
        using var http = Client("staff-1", role: "SOPORTE");

        var response = await http.GetAsync("/v1/projections/movements");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Staff_puede_consultar_un_cliente_explicito()
    {
        using var http = Client("staff-1", role: "SOPORTE");

        var response = await http.GetAsync("/v1/projections/movements?clientId=client-a");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Me_access_expone_el_client_id_resuelto()
    {
        using var conContexto = Client("uid-a", "client-a");
        var withContext = await conContexto.GetFromJsonAsync<JsonElement>("/v1/me/access");
        Assert.Equal("client-a", withContext.GetProperty("clientId").GetString());
        Assert.False(withContext.GetProperty("isStaff").GetBoolean());

        // Host local de memoria: fallback explícito y documentado a uid.
        using var sinContexto = Client("uid-a");
        var withoutContext = await sinContexto.GetFromJsonAsync<JsonElement>("/v1/me/access");
        Assert.Equal("uid-a", withoutContext.GetProperty("clientId").GetString());
    }
}
