using System.Text.RegularExpressions;

namespace Nequi.Tests;

/// <summary>
/// Validated, local-only destination for future Spanner Emulator fixtures.
/// This type does not create a Spanner client or perform any network operation.
/// </summary>
public sealed record SpannerEmulatorTestConfiguration
{
    private static readonly Regex RunIdPattern = new("^[a-z0-9]{6,32}$", RegexOptions.CultureInvariant);
    private static readonly Regex EmulatorHostPattern = new(
        "^(localhost|127\\.0\\.0\\.1|\\[::1\\]):([0-9]{1,5})$",
        RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);

    private SpannerEmulatorTestConfiguration(
        string emulatorHost,
        string projectId,
        string instanceId,
        string databaseId,
        string runId)
    {
        EmulatorHost = emulatorHost;
        EmulatorEndpoint = $"http://{emulatorHost}";
        ProjectId = projectId;
        InstanceId = instanceId;
        DatabaseId = databaseId;
        RunId = runId;
    }

    public string EmulatorHost { get; }
    public string EmulatorEndpoint { get; }
    public string ProjectId { get; }
    public string InstanceId { get; }
    public string DatabaseId { get; }
    public string RunId { get; }

    /// <summary>
    /// Validates environment and test resource identifiers without changing
    /// process environment variables and without initializing a client.
    /// </summary>
    public static SpannerEmulatorTestConfiguration Create(
        IReadOnlyDictionary<string, string?> environment,
        string projectId,
        string instanceId,
        string databaseId,
        string runId)
    {
        ArgumentNullException.ThrowIfNull(environment);

        if (!environment.TryGetValue("SPANNER_EMULATOR_HOST", out var emulatorHost) ||
            string.IsNullOrWhiteSpace(emulatorHost))
            throw new InvalidOperationException("SPANNER_EMULATOR_HOST must be configured for local Spanner tests.");

        if (environment.ContainsKey("GOOGLE_APPLICATION_CREDENTIALS"))
            throw new InvalidOperationException("Cloud credentials are not allowed for Spanner Emulator tests.");

        var hostMatch = EmulatorHostPattern.Match(emulatorHost);
        if (!hostMatch.Success || !int.TryParse(hostMatch.Groups[2].Value, out var port) || port is < 1 or > 65535)
            throw new ArgumentException("SPANNER_EMULATOR_HOST must be localhost, 127.0.0.1 or [::1] with a valid port.", nameof(environment));

        RequireRunId(runId);
        RequireTestIdentifier(projectId, "projectId", runId);
        RequireTestIdentifier(instanceId, "instanceId", runId);
        RequireTestIdentifier(databaseId, "databaseId", runId);

        if (projectId == instanceId || projectId == databaseId || instanceId == databaseId)
            throw new ArgumentException("Test project, instance and database identifiers must be distinct.");

        return new SpannerEmulatorTestConfiguration(
            emulatorHost,
            projectId,
            instanceId,
            databaseId,
            runId);
    }

    private static void RequireRunId(string runId)
    {
        if (string.IsNullOrWhiteSpace(runId) || !RunIdPattern.IsMatch(runId))
            throw new ArgumentException("runId must contain only lowercase letters and digits and be 6-32 characters long.", nameof(runId));
    }

    private static void RequireTestIdentifier(string value, string name, string runId)
    {
        if (string.IsNullOrWhiteSpace(value) ||
            !value.StartsWith("test-", StringComparison.Ordinal) ||
            !value.Contains($"-{runId}-", StringComparison.Ordinal))
            throw new ArgumentException($"{name} must be a test-only identifier containing the execution runId.", name);
    }
}
