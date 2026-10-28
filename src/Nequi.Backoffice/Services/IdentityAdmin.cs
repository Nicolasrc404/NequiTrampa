using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Google.Apis.Auth.OAuth2;
using Nequi.Shared.Security;

namespace Nequi.Backoffice.Services;

/// <summary>
/// Role management over Identity Platform custom claims (Identity Toolkit Admin REST, ADC credentials).
/// Roles live in the <c>roles</c> claim; other claims (e.g. client_id) are preserved. Takes effect on the user's next token refresh.
/// </summary>
public sealed class IdentityAdmin(IHttpClientFactory http, IConfiguration config, ILogger<IdentityAdmin> logger)
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

    private string Url(string method) => $"https://identitytoolkit.googleapis.com/v1/projects/{_project}/accounts:{method}";

    /// <summary>Returns the stored custom claims of a user, or null if the identity does not exist.</summary>
    public async Task<JsonObject?> GetClaimsAsync(string uid, CancellationToken ct)
    {
        var c = await ClientAsync(ct);
        var res = await c.PostAsJsonAsync(Url("lookup"), new { localId = new[] { uid } }, ct);
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<JsonObject>(ct);
        var user = body?["users"]?.AsArray().FirstOrDefault();
        if (user is null) return null;
        var attrs = user["customAttributes"]?.GetValue<string>();
        return string.IsNullOrWhiteSpace(attrs) ? new JsonObject() : JsonNode.Parse(attrs)!.AsObject();
    }

    public static IReadOnlyList<string> RolesOf(JsonObject claims)
    {
        var roles = new List<string>();
        foreach (var key in new[] { "roles", "role" })
            switch (claims[key])
            {
                case JsonArray a: roles.AddRange(a.Select(x => x!.GetValue<string>())); break;
                case JsonValue v: roles.Add(v.GetValue<string>()); break;
            }
        return roles.Distinct().OrderBy(r => r).ToList();
    }

    public async Task<IReadOnlyList<string>?> SetRolesAsync(string uid, IReadOnlyList<string> roles, CancellationToken ct)
    {
        var claims = await GetClaimsAsync(uid, ct);
        if (claims is null) return null;
        claims.Remove("role");
        claims["roles"] = new JsonArray(roles.Select(r => (JsonNode?)JsonValue.Create(r)).ToArray());
        var c = await ClientAsync(ct);
        var res = await c.PostAsJsonAsync(Url("update"), new { localId = uid, customAttributes = claims.ToJsonString() }, ct);
        if (!res.IsSuccessStatusCode)
        {
            logger.LogError("Identity update failed: {Status} {Body}", (int)res.StatusCode, await res.Content.ReadAsStringAsync(ct));
            res.EnsureSuccessStatusCode();
        }
        return roles;
    }

    public static bool AreValid(IEnumerable<string> roles) => roles.All(r => Roles.All.Contains(r));
}
