using Google.Api.Gax;
using Google.Api.Gax.Grpc;
using Google.Cloud.Spanner.Admin.Instance.V1;

namespace Nequi.Tests;

/// <summary>
/// xUnit v2 opt-in gate. The normal suite skips emulator connectivity so it
/// never depends on Docker; setting the explicit flag runs the real test.
/// </summary>
public sealed class SpannerEmulatorFactAttribute : FactAttribute
{
    public SpannerEmulatorFactAttribute()
    {
        if (!string.Equals(
                Environment.GetEnvironmentVariable("NEQUITRAMPA_RUN_SPANNER_EMULATOR_TESTS"),
                "1",
                StringComparison.Ordinal))
        {
            Skip = "Opt-in: set NEQUITRAMPA_RUN_SPANNER_EMULATOR_TESTS=1 to contact the local Spanner Emulator.";
        }
    }
}

public sealed class SpannerEmulatorConnectivityTests
{
    [SpannerEmulatorFact]
    [Trait("Category", "SpannerEmulator")]
    public void ListInstances_UsesLocalEmulatorGrpcEndpoint()
    {
        var configuration = CreateValidatedConfiguration();

        if (!string.Equals(configuration.EmulatorHost, "127.0.0.1:9010", StringComparison.Ordinal))
            throw new InvalidOperationException("The connectivity test requires exactly 127.0.0.1:9010.");

        var builder = new InstanceAdminClientBuilder
        {
            EmulatorDetection = Google.Api.Gax.EmulatorDetection.EmulatorOnly,
        };

        Assert.Equal(Google.Api.Gax.EmulatorDetection.EmulatorOnly, builder.EmulatorDetection);

        var client = builder.Build();
        var request = new ListInstancesRequest
        {
            Parent = $"projects/{configuration.ProjectId}",
            PageSize = 1,
        };
        var instances = client.ListInstances(
            request,
            CallSettings.FromExpiration(Expiration.FromTimeout(TimeSpan.FromSeconds(5))));

        // Enumerating the response performs the real gRPC ListInstances call.
        // An empty page is valid; failure to communicate must propagate as a test failure.
        _ = instances.Take(1).ToList();
    }

    private static SpannerEmulatorTestConfiguration CreateValidatedConfiguration()
    {
        var environment = new Dictionary<string, string?>
        {
            ["SPANNER_EMULATOR_HOST"] = Environment.GetEnvironmentVariable("SPANNER_EMULATOR_HOST"),
        };

        if (Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS") is not null)
            environment["GOOGLE_APPLICATION_CREDENTIALS"] = "present";

        return SpannerEmulatorTestConfiguration.Create(
            environment,
            projectId: "test-run123456-project",
            instanceId: "test-run123456-instance",
            databaseId: "test-run123456-database",
            runId: "run123456");
    }
}
