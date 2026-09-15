namespace ProfileService.Infrastructure.Configuration;

public class SpannerOptions
{
    public const string SectionName = "Spanner";

    // Defaults = recursos reales ya desplegados en GCP (ver spanner/01_schema.sql
    // y `gcloud spanner instances list`). appsettings.*.json puede sobreescribirlos.
    public string ProjectId { get; set; } = "finanzas-mvp-2026";
    public string InstanceId { get; set; } = "finanzas-mvp";
    public string DatabaseId { get; set; } = "finanzas-core";
    public string? EmulatorHost { get; set; }

    public string ConnectionString
    {
        get
        {
            var hostAndPort = !string.IsNullOrWhiteSpace(EmulatorHost)
                ? EmulatorHost
                : Environment.GetEnvironmentVariable("SPANNER_EMULATOR_HOST");

            if (!string.IsNullOrWhiteSpace(hostAndPort))
            {
                // EmulatorDetection.EmulatorOnly exige que la variable de entorno del
                // PROCESO (no solo esta connection string) esté definida — la fijamos
                // aquí si vino de appsettings.EmulatorHost en vez del entorno real.
                if (Environment.GetEnvironmentVariable("SPANNER_EMULATOR_HOST") is null)
                {
                    Environment.SetEnvironmentVariable("SPANNER_EMULATOR_HOST", hostAndPort);
                }

                return $"Data Source=projects/{ProjectId}/instances/{InstanceId}/databases/{DatabaseId};EmulatorDetection=EmulatorOnly";
            }

            return $"Data Source=projects/{ProjectId}/instances/{InstanceId}/databases/{DatabaseId}";
        }
    }
}

public class IdentityPlatformOptions
{
    public const string SectionName = "IdentityPlatform";

    public string ProjectId { get; set; } = "finanzas-mvp-2026";
    // Nunca hardcodear la ApiKey real aquí: se inyecta por variable de entorno
    // IdentityPlatform__ApiKey o, en producción, Secret Manager (ver GEMINI.md).
    public string ApiKey { get; set; } = string.Empty;
    public bool UseMock { get; set; } = true; // True por defecto para desarrollo local sin costo
}
