using Google.Api.Gax;
using Google.Api.Gax.Grpc;
using Google.Cloud.Spanner.Admin.Database.V1;
using Google.Cloud.Spanner.Admin.Instance.V1;
using Google.Cloud.Spanner.Data;
using Grpc.Core;
using Nequi.Shared.Data;
using Nequi.Shared.Idempotency;

namespace Nequi.Tests;

public sealed class SpannerIdempotencyFinancialPolicyTests
{
    [Fact]
    public void FinancialScopesAreClassifiedCentrally()
    {
        Assert.Equal(IdempotencyOperationKind.Financial,
            IdempotencyOperationClassification.Classify(IdempotencyOperationClassification.TransferScope));
        Assert.Equal(IdempotencyOperationKind.Financial,
            IdempotencyOperationClassification.Classify(IdempotencyOperationClassification.RechargeScope));
        Assert.Equal(IdempotencyOperationKind.NonFinancial,
            IdempotencyOperationClassification.Classify("POST:/v1/reports"));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task FailedFinancialReservationRemainsBlockedAndIsNotRestarted()
    {
        var configuration = await CreateDatabaseAsync();
        var store = CreateStore(configuration);
        await SeedAsync(configuration, "actor-financial", "POST:/v1/transfers", "FAILED");

        var (outcome, _) = await store.BeginAsync(
            "actor-financial", "POST:/v1/transfers", "key", "hash", CancellationToken.None);

        Assert.Equal(BeginOutcome.InProgress, outcome);
        Assert.Equal("FAILED", await ReadStatusAsync(configuration, "actor-financial", "POST:/v1/transfers"));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task FailedNonFinancialReservationRetainsLegacyRestartPolicy()
    {
        var configuration = await CreateDatabaseAsync();
        var store = CreateStore(configuration);
        await SeedAsync(configuration, "actor-nonfinancial", "POST:/v1/reports", "FAILED");

        var (outcome, _) = await store.BeginAsync(
            "actor-nonfinancial", "POST:/v1/reports", "key", "hash", CancellationToken.None);

        Assert.Equal(BeginOutcome.Started, outcome);
        Assert.Equal("IN_PROGRESS", await ReadStatusAsync(configuration, "actor-nonfinancial", "POST:/v1/reports"));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task CreatedAtIsPersistedAndRemainsStableAcrossReplayAndCompletion()
    {
        var configuration = await CreateDatabaseAsync();
        var store = CreateStore(configuration);

        var (started, _) = await store.BeginAsync(
            "actor-created-at", "POST:/v1/transfers", "created-at-key", "hash", CancellationToken.None);
        Assert.Equal(BeginOutcome.Started, started);

        var createdAt = await ReadCreatedAtAsync(configuration, "actor-created-at", "POST:/v1/transfers", "created-at-key");
        Assert.NotEqual(default, createdAt);

        await store.CompleteAsync(
            "actor-created-at", "POST:/v1/transfers", "created-at-key", 201, "{}", "application/json", CancellationToken.None);
        Assert.Equal(createdAt, await ReadCreatedAtAsync(
            configuration, "actor-created-at", "POST:/v1/transfers", "created-at-key"));

        var (replay, _) = await store.BeginAsync(
            "actor-created-at", "POST:/v1/transfers", "created-at-key", "hash", CancellationToken.None);
        Assert.Equal(BeginOutcome.Replay, replay);
        Assert.Equal(createdAt, await ReadCreatedAtAsync(
            configuration, "actor-created-at", "POST:/v1/transfers", "created-at-key"));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task FindStaleReturnsOldInProgressWithoutReleasingIt()
    {
        var configuration = await CreateDatabaseAsync();
        var store = CreateStore(configuration);
        var old = DateTime.UtcNow.AddHours(-2);
        await SeedAsync(configuration, "actor-stale", "POST:/v1/transfers", "IN_PROGRESS", old);

        var stale = await store.FindStaleInProgressAsync(TimeSpan.FromHours(1), 10, CancellationToken.None);

        var record = Assert.Single(stale);
        Assert.Equal("actor-stale", record.ActorId);
        Assert.Equal("POST:/v1/transfers", record.Scope);
        Assert.Equal("key", record.Key);
        Assert.Equal("IN_PROGRESS", await ReadStatusAsync(configuration, "actor-stale", "POST:/v1/transfers"));
    }

    private const string CreateTable = """
        CREATE TABLE idempotency_records (
          actor_id STRING(36) NOT NULL,
          scope STRING(64) NOT NULL,
          idempotency_key STRING(64) NOT NULL,
          request_hash STRING(64) NOT NULL,
          operation_id STRING(36),
          status STRING(16) NOT NULL,
          http_status INT64,
          response_body JSON,
          created_at TIMESTAMP NOT NULL,
          completed_at TIMESTAMP,
        ) PRIMARY KEY(actor_id, scope, idempotency_key)
        """;

    private static SpannerIdempotencyStore CreateStore(SpannerEmulatorTestConfiguration configuration)
    {
        var factory = () => new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(configuration));
        return new SpannerIdempotencyStore(factory);
    }

    private static async Task SeedAsync(
        SpannerEmulatorTestConfiguration configuration,
        string actor,
        string scope,
        string status,
        DateTime? createdAt = null)
    {
        await using var connection = await OpenAsync(configuration);
        await using var command = connection.CreateDmlCommand(
            "INSERT INTO idempotency_records " +
            "(actor_id, scope, idempotency_key, request_hash, status, created_at) " +
            "VALUES (@actor, @scope, 'key', 'hash', @status, @createdAt)");
        command.Parameters.Add("actor", SpannerDbType.String, actor);
        command.Parameters.Add("scope", SpannerDbType.String, scope);
        command.Parameters.Add("status", SpannerDbType.String, status);
        command.Parameters.Add("createdAt", SpannerDbType.Timestamp, createdAt ?? DateTime.UtcNow);
        await command.ExecuteNonQueryAsync();
    }

    private static async Task<DateTime> ReadCreatedAtAsync(
        SpannerEmulatorTestConfiguration configuration,
        string actor,
        string scope,
        string key)
    {
        await using var connection = await OpenAsync(configuration);
        await using var command = connection.CreateSelectCommand(
            "SELECT created_at FROM idempotency_records WHERE actor_id=@actor AND scope=@scope AND idempotency_key=@key");
        command.Parameters.Add("actor", SpannerDbType.String, actor);
        command.Parameters.Add("scope", SpannerDbType.String, scope);
        command.Parameters.Add("key", SpannerDbType.String, key);
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return reader.GetFieldValue<DateTime>(0);
    }

    private static async Task<string> ReadStatusAsync(
        SpannerEmulatorTestConfiguration configuration,
        string actor,
        string scope)
    {
        await using var connection = await OpenAsync(configuration);
        await using var command = connection.CreateSelectCommand(
            "SELECT status FROM idempotency_records " +
            "WHERE actor_id=@actor AND scope=@scope AND idempotency_key='key'");
        command.Parameters.Add("actor", SpannerDbType.String, actor);
        command.Parameters.Add("scope", SpannerDbType.String, scope);
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return reader.GetString(0);
    }

    private static async Task<SpannerConnection> OpenAsync(SpannerEmulatorTestConfiguration configuration)
    {
        var connection = new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(configuration));
        await connection.OpenAsync();
        return connection;
    }

    private static async Task<SpannerEmulatorTestConfiguration> CreateDatabaseAsync()
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
            $"test-{runId}-project",
            $"test-{runId}-instance",
            $"test-{runId}-database",
            runId);
        if (configuration.EmulatorHost != "127.0.0.1:9010")
            throw new InvalidOperationException("Idempotency policy tests require the local emulator.");

        var timeout = CallSettings.FromExpiration(Expiration.FromTimeout(TimeSpan.FromSeconds(30)));
        var instanceName = $"projects/{configuration.ProjectId}/instances/{configuration.InstanceId}";
        var databaseName = $"{instanceName}/databases/{configuration.DatabaseId}";
        var instanceAdmin = new InstanceAdminClientBuilder { EmulatorDetection = Google.Api.Gax.EmulatorDetection.EmulatorOnly }.Build();
        var databaseAdmin = new DatabaseAdminClientBuilder { EmulatorDetection = Google.Api.Gax.EmulatorDetection.EmulatorOnly }.Build();

        EnsureMissing(instanceAdmin, instanceName, timeout);
        var instance = instanceAdmin.CreateInstance(new CreateInstanceRequest
        {
            Parent = $"projects/{configuration.ProjectId}",
            InstanceId = configuration.InstanceId,
            Instance = new Instance { Name = instanceName, Config = $"projects/{configuration.ProjectId}/instanceConfigs/emulator-config", DisplayName = $"test {runId}", NodeCount = 1 },
        }, timeout).PollUntilCompleted();
        Assert.False(instance.IsFaulted);

        EnsureMissing(databaseAdmin, databaseName, timeout);
        var database = databaseAdmin.CreateDatabase(new CreateDatabaseRequest
        {
            Parent = instanceName,
            CreateStatement = $"CREATE DATABASE `{configuration.DatabaseId}`",
        }, timeout).PollUntilCompleted();
        Assert.False(database.IsFaulted);

        var ddl = databaseAdmin.UpdateDatabaseDdl(new UpdateDatabaseDdlRequest
        {
            Database = databaseName,
            Statements = { CreateTable },
        }, timeout).PollUntilCompleted();
        Assert.False(ddl.IsFaulted);
        return configuration;
    }

    private static void EnsureMissing(InstanceAdminClient client, string name, CallSettings settings)
    {
        try { _ = client.GetInstance(new GetInstanceRequest { Name = name }, settings); throw new InvalidOperationException("Resource already exists."); }
        catch (RpcException ex) when (ex.StatusCode == StatusCode.NotFound) { }
    }

    private static void EnsureMissing(DatabaseAdminClient client, string name, CallSettings settings)
    {
        try { _ = client.GetDatabase(new GetDatabaseRequest { Name = name }, settings); throw new InvalidOperationException("Resource already exists."); }
        catch (RpcException ex) when (ex.StatusCode == StatusCode.NotFound) { }
    }
}
