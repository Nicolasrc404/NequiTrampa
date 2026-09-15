using ProfileService.Application.Interfaces;

namespace ProfileService.Api.Services;

// Lee la identidad del ClaimsPrincipal que ya validó el middleware JWT Bearer.
// Los custom claims (clientId, adminId, roles, status) los fija el backend vía
// Identity Platform (ver GoogleIdentityPlatformService) y llegan aplanados al
// token — igual que en Firebase Auth.
public class HttpCurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpCurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private System.Security.Claims.ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public string? AuthSubject => User?.FindFirst("sub")?.Value ?? User?.FindFirst("user_id")?.Value;

    public string? Email => User?.FindFirst("email")?.Value;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public Guid? ClientId
    {
        get
        {
            var raw = User?.FindFirst("clientId")?.Value;
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }

    public Guid? AdminId
    {
        get
        {
            var raw = User?.FindFirst("adminId")?.Value;
            return Guid.TryParse(raw, out var id) ? id : null;
        }
    }

    public IReadOnlyList<string> Roles =>
        User?.FindAll("roles").Select(c => c.Value).ToList() ?? new List<string>();

    public bool IsInRole(string role) => Roles.Contains(role, StringComparer.OrdinalIgnoreCase);

    public Guid GetRequiredClientId() =>
        ClientId ?? throw new UnauthorizedAccessException("El token no contiene un clientId válido.");
}
