using Google.Api.Gax;
using Google.Api.Gax.Grpc;
using Google.Cloud.Spanner.Admin.Database.V1;
using Google.Cloud.Spanner.Admin.Instance.V1;
using Grpc.Core;

namespace Nequi.Tests;

/// <summary>
/// Opt-in fixture for creating only uniquely named resources in the local
/// Spanner Emulator. It intentionally does not delete anything it creates.
/// </summary>
public sealed class SpannerEmulatorResourceFixtureTests
{
    [SpannerEmulatorFact]
    [Trait("Category", "SpannerEmulatorResources")]
    public void CreatesAndReadsOnlyUniqueLocalEmulatorResources()
    {
        var configuration = CreateValidatedConfiguration();
        var timeout = CallSettings.FromExpiration(Expiration.FromTimeout(TimeSpan.FromSeconds(30)));
        var instanceName = $"projects/{configuration.ProjectId}/instances/{configuration.InstanceId}";
        var databaseName = $"{instanceName}/databases/{configuration.DatabaseId}";

        var instanceAdmin = new InstanceAdminClientBuilder
        {
            EmulatorDetection = Google.Api.Gax.EmulatorDetection.EmulatorOnly,
        }.Build();
        var databaseAdmin = new DatabaseAdminClientBuilder
        {
            EmulatorDetection = Google.Api.Gax.EmulatorDetection.EmulatorOnly,
        }.Build();

        EnsureInstanceDoesNotExist(instanceAdmin, instanceName, timeout);

        try
        {
            var completedInstanceOperation = instanceAdmin.CreateInstance(
                new CreateInstanceRequest
                {
                    Parent = $"projects/{configuration.ProjectId}",
                    InstanceId = configuration.InstanceId,
                    Instance = new Instance
                    {
                        Name = instanceName,
                        Config = $"projects/{configuration.ProjectId}/instanceConfigs/emulator-config",
                        DisplayName = $"test {configuration.RunId}",
                        NodeCount = 1,
                    },
                },
                timeout).PollUntilCompleted();

            Assert.True(completedInstanceOperation.IsCompleted);
            Assert.False(completedInstanceOperation.IsFaulted);
            var createdInstance = completedInstanceOperation.Result;
            Assert.NotNull(createdInstance);
            Assert.Equal(instanceName, createdInstance.Name);

            EnsureDatabaseDoesNotExist(databaseAdmin, databaseName, timeout);

            var completedDatabaseOperation = databaseAdmin.CreateDatabase(
                new CreateDatabaseRequest
                {
                    Parent = instanceName,
                    CreateStatement = $"CREATE DATABASE `{configuration.DatabaseId}`",
                },
                timeout).PollUntilCompleted();

            Assert.True(completedDatabaseOperation.IsCompleted);
            Assert.False(completedDatabaseOperation.IsFaulted);
            var createdDatabase = completedDatabaseOperation.Result;
            Assert.NotNull(createdDatabase);
            Assert.Equal(databaseName, createdDatabase.Name);

            var readInstance = instanceAdmin.GetInstance(
                new GetInstanceRequest { Name = instanceName }, timeout);
            var readDatabase = databaseAdmin.GetDatabase(
                new GetDatabaseRequest { Name = databaseName }, timeout);

            Assert.Equal(instanceName, readInstance.Name);
            Assert.Equal(databaseName, readDatabase.Name);
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException(
                $"Local emulator resource setup failed. No cleanup was attempted. " +
                $"Instance candidate: {instanceName}; database candidate: {databaseName}.",
                exception);
        }
    }

    private static void EnsureInstanceDoesNotExist(
        InstanceAdminClient client,
        string instanceName,
        CallSettings callSettings)
    {
        try
        {
            _ = client.GetInstance(new GetInstanceRequest { Name = instanceName }, callSettings);
            throw new InvalidOperationException($"Refusing to reuse pre-existing emulator instance '{instanceName}'.");
        }
        catch (RpcException exception) when (exception.StatusCode == StatusCode.NotFound)
        {
            // Expected: the unique run-scoped resource does not exist yet.
        }
    }

    private static void EnsureDatabaseDoesNotExist(
        DatabaseAdminClient client,
        string databaseName,
        CallSettings callSettings)
    {
        try
        {
            _ = client.GetDatabase(new GetDatabaseRequest { Name = databaseName }, callSettings);
            throw new InvalidOperationException($"Refusing to reuse pre-existing emulator database '{databaseName}'.");
        }
        catch (RpcException exception) when (exception.StatusCode == StatusCode.NotFound)
        {
            // Expected: the unique run-scoped resource does not exist yet.
        }
    }

    private static SpannerEmulatorTestConfiguration CreateValidatedConfiguration()
    {
        var runId = Guid.NewGuid().ToString("N")[..12];
        var environment = new Dictionary<string, string?>
        {
            ["SPANNER_EMULATOR_HOST"] = Environment.GetEnvironmentVariable("SPANNER_EMULATOR_HOST"),
        };

        if (Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS") is not null)
            environment["GOOGLE_APPLICATION_CREDENTIALS"] = "present";

        var configuration = SpannerEmulatorTestConfiguration.Create(
            environment,
            projectId: $"test-{runId}-project",
            instanceId: $"test-{runId}-instance",
            databaseId: $"test-{runId}-database",
            runId);

        if (!string.Equals(configuration.EmulatorHost, "127.0.0.1:9010", StringComparison.Ordinal))
            throw new InvalidOperationException("Resource fixture requires exactly 127.0.0.1:9010.");

        return configuration;
    }
}
