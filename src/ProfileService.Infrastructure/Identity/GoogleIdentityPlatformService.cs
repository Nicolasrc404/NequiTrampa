using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ProfileService.Application.Interfaces;
using ProfileService.Infrastructure.Configuration;

namespace ProfileService.Infrastructure.Identity;

// Reglas de seguridad aplicadas aquí (ver notebook "FullStack" del proyecto):
//  - Las contraseñas NUNCA se registran en logs (solo se reenvían al endpoint de
//    Identity Platform dentro del cuerpo de la petición, nunca en la URL/query string).
//  - Los Custom Claims solo se fijan desde este servicio de backend (Admin-like),
//    jamás desde el cliente móvil.
//  - El UID (`localId`) que emite Identity Platform es el auth_subject que se
//    vincula 1:1 con el registro de negocio en Spanner.
public class GoogleIdentityPlatformService : IIdentityPlatformService
{
    private readonly HttpClient _httpClient;
    private readonly IdentityPlatformOptions _options;
    private readonly ILogger<GoogleIdentityPlatformService> _logger;
    private static readonly Dictionary<string, Dictionary<string, object>> _mockClaims = new();

    public GoogleIdentityPlatformService(
        HttpClient httpClient,
        IOptions<IdentityPlatformOptions> options,
        ILogger<GoogleIdentityPlatformService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<string> CreateUserAsync(string email, string password, string displayName, CancellationToken cancellationToken = default)
    {
        if (_options.UseMock || string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            var mockUid = $"mock_uid_{Guid.NewGuid():N}";
            _logger.LogInformation("[IdentityMock] Usuario creado en Identity Platform: {Email}, UID: {Uid}", email, mockUid);
            return mockUid;
        }

        var endpoint = $"https://identitytoolkit.googleapis.com/v1/projects/{_options.ProjectId}/accounts?key={_options.ApiKey}";
        var payload = new
        {
            email,
            password,
            displayName,
            returnSecureToken = true
        };

        var response = await _httpClient.PostAsJsonAsync(endpoint, payload, cancellationToken);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<IdentityUserResponse>(cancellationToken: cancellationToken);
        return result?.LocalId ?? throw new InvalidOperationException("No se pudo obtener el UID del usuario de Identity Platform.");
    }

    public async Task SetCustomUserClaimsAsync(string authSubject, Dictionary<string, object> claims, CancellationToken cancellationToken = default)
    {
        if (_options.UseMock || string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _mockClaims[authSubject] = claims;
            _logger.LogInformation("[IdentityMock] Custom Claims actualizados para UID {Uid}: {Claims}", authSubject, JsonSerializer.Serialize(claims));
            return;
        }

        var endpoint = $"https://identitytoolkit.googleapis.com/v1/projects/{_options.ProjectId}/accounts:update?key={_options.ApiKey}";
        var payload = new
        {
            localId = authSubject,
            customAttributes = JsonSerializer.Serialize(claims)
        };

        var response = await _httpClient.PostAsJsonAsync(endpoint, payload, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task DisableUserAsync(string authSubject, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Usuario deshabilitado en Identity Platform: {Uid}", authSubject);
        if (_options.UseMock) return;

        var endpoint = $"https://identitytoolkit.googleapis.com/v1/projects/{_options.ProjectId}/accounts:update?key={_options.ApiKey}";
        var payload = new { localId = authSubject, disableUser = true };
        var response = await _httpClient.PostAsJsonAsync(endpoint, payload, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task EnableUserAsync(string authSubject, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Usuario habilitado en Identity Platform: {Uid}", authSubject);
        if (_options.UseMock) return;

        var endpoint = $"https://identitytoolkit.googleapis.com/v1/projects/{_options.ProjectId}/accounts:update?key={_options.ApiKey}";
        var payload = new { localId = authSubject, disableUser = false };
        var response = await _httpClient.PostAsJsonAsync(endpoint, payload, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task DeleteUserAsync(string authSubject, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Usuario eliminado en Identity Platform: {Uid}", authSubject);
        if (_options.UseMock) return;

        var endpoint = $"https://identitytoolkit.googleapis.com/v1/projects/{_options.ProjectId}/accounts:delete?key={_options.ApiKey}";
        var payload = new { localId = authSubject };
        var response = await _httpClient.PostAsJsonAsync(endpoint, payload, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private class IdentityUserResponse
    {
        public string? LocalId { get; set; }
        public string? Email { get; set; }
    }
}
