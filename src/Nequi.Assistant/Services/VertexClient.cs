using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Google.Apis.Auth.OAuth2;

namespace Nequi.Assistant.Services;

/// <summary>
/// Minimal Vertex AI (Gemini) <c>generateContent</c> client using Application Default Credentials (service account role aiplatform.user).
/// Config: Assistant:VertexLocation (default us-central1), Assistant:Model (default gemini-2.5-flash), Assistant:UseVertex (default true).
/// Any failure returns null so the caller falls back to deterministic answers.
/// </summary>
public sealed class VertexClient(IHttpClientFactory http, IConfiguration config, ILogger<VertexClient> logger)
{
    private GoogleCredential? _credential;

    public async Task<string?> TryAskAsync(string system, string context, string userMessage, CancellationToken ct)
    {
        if (config.GetValue("Assistant:UseVertex", true) is false) return null;
        try
        {
            var project = config["Gcp:ProjectId"]!;
            var location = config["Assistant:VertexLocation"] ?? "us-central1";
            var model = config["Assistant:Model"] ?? "gemini-2.5-flash";
            _credential ??= (await GoogleCredential.GetApplicationDefaultAsync(ct)).CreateScoped("https://www.googleapis.com/auth/cloud-platform");
            var token = await ((ITokenAccess)_credential).GetAccessTokenForRequestAsync(cancellationToken: ct);

            var client = http.CreateClient("vertex");
            client.Timeout = TimeSpan.FromSeconds(20);
            using var req = new HttpRequestMessage(HttpMethod.Post,
                $"https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent")
            {
                Content = JsonContent.Create(new
                {
                    systemInstruction = new { parts = new[] { new { text = system } } },
                    contents = new[] { new { role = "user", parts = new[] { new { text = context + "\n\nPREGUNTA DEL USUARIO:\n" + userMessage } } } },
                    generationConfig = new { temperature = 0.2, maxOutputTokens = 600, thinkingConfig = new { thinkingBudget = 0 } },
                }),
            };
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            using var res = await client.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode)
            {
                logger.LogWarning("Vertex AI returned {Status}; using fallback", (int)res.StatusCode);
                return null;
            }
            var body = await res.Content.ReadFromJsonAsync<JsonObject>(ct);
            var text = body?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.GetValue<string>();
            return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            logger.LogWarning(e, "Vertex AI call failed; using fallback");
            return null;
        }
    }
}
