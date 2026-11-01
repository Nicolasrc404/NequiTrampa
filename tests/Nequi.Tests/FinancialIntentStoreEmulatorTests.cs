using Google.Api.Gax;
using Google.Api.Gax.Grpc;
using Google.Cloud.Spanner.Admin.Database.V1;
using Google.Cloud.Spanner.Admin.Instance.V1;
using Google.Cloud.Spanner.Data;
using Grpc.Core;
using Nequi.Shared.Data;
using Nequi.Shared.Financial;

namespace Nequi.Tests;

/// <summary>
/// First real repository slice. It uses only a fresh local emulator database;
/// it does not create ledger, balance, or outbox records.
/// </summary>
public sealed class FinancialIntentStoreEmulatorTests
{
    private const string CreateTable = """
        CREATE TABLE financial_intents (
          financial_intent_id STRING(36) NOT NULL,
          authenticated_actor_id STRING(128) NOT NULL,
          domain_actor_id STRING(36) NOT NULL,
          operation_type STRING(32) NOT NULL,
          scope STRING(128) NOT NULL,
          idempotency_key STRING(64) NOT NULL,
          request_hash STRING(64) NOT NULL,
          operation_id STRING(36),
          financial_status STRING(32) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
          confirmed_at TIMESTAMP,
          CONSTRAINT ck_financial_intent_status CHECK(financial_status IN (
            'IN_PROGRESS', 'CONFIRMED', 'FAILED_WITHOUT_EFFECT',
            'UNCERTAIN', 'HISTORICAL_UNCORRELATABLE'))
        ) PRIMARY KEY(financial_intent_id)
        """;

    private const string CreateBusinessIdentityIndex = """
        CREATE UNIQUE INDEX ux_financial_intent_identity
        ON financial_intents(domain_actor_id, operation_type, scope, idempotency_key)
        """;

    private const string CreateOperationIndex = """
        CREATE UNIQUE NULL_FILTERED INDEX ux_financial_intent_operation
        ON financial_intents(operation_id)
        """;

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task QueriesAndResolvesDurableFinancialIntentIdentities()
    {
        var configuration = CreateValidatedConfiguration();
        var timeout = CallSettings.FromExpiration(Expiration.FromTimeout(TimeSpan.FromSeconds(30)));
        var resources = await CreateIsolatedDatabaseAsync(configuration, timeout);

        try
        {
            var confirmed = new FinancialIntent(
                "intent-confirmed",
                "subject-1",
                new FinancialIntentIdentity("client-1", "TRANSFER", "transfer-v1", "key-1"),
                "hash-1",
                FinancialIntentStatus.Confirmed,
                DateTimeOffset.UtcNow.AddMinutes(-1),
                "operation-1",
                DateTimeOffset.UtcNow.AddSeconds(-30));

            var otherActor = new FinancialIntent(
                "intent-other-actor",
                "subject-2",
                new FinancialIntentIdentity("client-2", "TRANSFER", "transfer-v1", "key-1"),
                "hash-2",
                FinancialIntentStatus.Confirmed,
                DateTimeOffset.UtcNow.AddMinutes(-1),
                "operation-2",
                DateTimeOffset.UtcNow.AddSeconds(-20));

            var otherScope = new FinancialIntent(
                "intent-other-scope",
                "subject-1",
                new FinancialIntentIdentity("client-1", "RECHARGE", "recharge-v1", "key-1"),
                "hash-3",
                FinancialIntentStatus.Confirmed,
                DateTimeOffset.UtcNow.AddMinutes(-1),
                "operation-3",
                DateTimeOffset.UtcNow.AddSeconds(-10));

            await using (var seedConnection = await OpenConnectionAsync(configuration))
            {
                await seedConnection.RunWithRetriableTransactionAsync(async transaction =>
                {
                    await InsertAsync(seedConnection, transaction, confirmed);
                    await InsertAsync(seedConnection, transaction, otherActor);
                    await InsertAsync(seedConnection, transaction, otherScope);
                });
            }

            var store = new SpannerFinancialIntentStore(
                () => new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(configuration)));

            var recovered = await store.GetAsync(confirmed.Identity, CancellationToken.None);
            Assert.Equal(FinancialIntentResultKind.Confirmed, recovered.Kind);
            Assert.Equal("intent-confirmed", recovered.Intent!.FinancialIntentId);
            Assert.Equal("operation-1", recovered.Intent.OperationId);

            var missing = await store.GetAsync(
                new FinancialIntentIdentity("client-1", "TRANSFER", "transfer-v1", "missing-key"),
                CancellationToken.None);
            Assert.Equal(FinancialIntentResultKind.NotFound, missing.Kind);
            Assert.Null(missing.Intent);

            var sameHash = await ResolveExistingInTransactionAsync(
                configuration,
                store,
                confirmed,
                confirmed.RequestHash);
            Assert.Equal(FinancialIntentResultKind.Confirmed, sameHash.Kind);
            Assert.Equal("operation-1", sameHash.Intent!.OperationId);

            var incompatibleHash = await ResolveExistingInTransactionAsync(
                configuration,
                store,
                confirmed,
                "different-request-hash");
            Assert.Equal(FinancialIntentResultKind.IdentityConflict, incompatibleHash.Kind);
            Assert.Equal("intent-confirmed", incompatibleHash.Intent!.FinancialIntentId);

            var actorIsolated = await store.GetAsync(otherActor.Identity, CancellationToken.None);
            Assert.Equal("client-2", actorIsolated.Intent!.Identity.DomainActorId);
            Assert.Equal("operation-2", actorIsolated.Intent.OperationId);

            var scopeIsolated = await store.GetAsync(otherScope.Identity, CancellationToken.None);
            Assert.Equal("RECHARGE", scopeIsolated.Intent!.Identity.OperationType);
            Assert.Equal("recharge-v1", scopeIsolated.Intent.Identity.Scope);
            Assert.Equal("operation-3", scopeIsolated.Intent.OperationId);
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException(
                $"Financial-intent store test failed. No cleanup was attempted. " +
                $"Instance: {resources.InstanceName}; database: {resources.DatabaseName}.",
                exception);
        }
    }

    private static async Task<FinancialIntentResult> ResolveExistingInTransactionAsync(
        SpannerEmulatorTestConfiguration configuration,
        SpannerFinancialIntentStore store,
        FinancialIntent existing,
        string requestHash)
    {
        await using var connection = await OpenConnectionAsync(configuration);
        await using var transaction = await connection.BeginTransactionAsync();
        var spannerTransaction = Assert.IsType<SpannerTransaction>(transaction);
        var candidate = new FinancialIntent(
            "candidate-intent",
            existing.AuthenticatedActorId,
            existing.Identity,
            requestHash,
            FinancialIntentStatus.InProgress,
            DateTimeOffset.UtcNow,
            "candidate-operation");
        var context = new FinancialIntentTransactionContext(connection, spannerTransaction, candidate);

        var result = await store.GetOrCreateInTransactionAsync(
            context,
            existing.Identity,
            existing.AuthenticatedActorId,
            requestHash,
            candidate.FinancialIntentId,
            candidate.OperationId!,
            CancellationToken.None);

        await transaction.RollbackAsync();
        return result;
    }

    private static async Task InsertAsync(
        SpannerConnection connection,
        SpannerTransaction transaction,
        FinancialIntent intent)
    {
        await using var command = connection.CreateDmlCommand("""
            INSERT INTO financial_intents
            (financial_intent_id, authenticated_actor_id, domain_actor_id,
             operation_type, scope, idempotency_key, request_hash, operation_id,
             financial_status, created_at, confirmed_at)
            VALUES
            (@intent, @auth, @actor, @type, @scope, @key, @hash, @operation,
             @status, @created, @confirmed)
            """);
        command.Transaction = transaction;
        command.Parameters.Add("intent", SpannerDbType.String, intent.FinancialIntentId);
        command.Parameters.Add("auth", SpannerDbType.String, intent.AuthenticatedActorId);
        command.Parameters.Add("actor", SpannerDbType.String, intent.Identity.DomainActorId);
        command.Parameters.Add("type", SpannerDbType.String, intent.Identity.OperationType);
        command.Parameters.Add("scope", SpannerDbType.String, intent.Identity.Scope);
        command.Parameters.Add("key", SpannerDbType.String, intent.Identity.IdempotencyKey);
        command.Parameters.Add("hash", SpannerDbType.String, intent.RequestHash);
        command.Parameters.Add("operation", SpannerDbType.String, intent.OperationId!);
        command.Parameters.Add("status", SpannerDbType.String, "CONFIRMED");
        command.Parameters.Add("created", SpannerDbType.Timestamp, intent.CreatedAt.UtcDateTime);
        command.Parameters.Add("confirmed", SpannerDbType.Timestamp, intent.ConfirmedAt!.Value.UtcDateTime);
        await command.ExecuteNonQueryAsync();
    }

    private static async Task<SpannerConnection> OpenConnectionAsync(
        SpannerEmulatorTestConfiguration configuration)
    {
        var connection = new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(configuration));
        await connection.OpenAsync();
        return connection;
    }

    private static async Task<LocalResources> CreateIsolatedDatabaseAsync(
        SpannerEmulatorTestConfiguration configuration,
        CallSettings timeout)
    {
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
        var instanceOperation = instanceAdmin.CreateInstance(
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
            }, timeout).PollUntilCompleted();
        Assert.True(instanceOperation.IsCompleted);
        Assert.False(instanceOperation.IsFaulted);
        Assert.Equal(instanceName, instanceOperation.Result.Name);

        EnsureDatabaseDoesNotExist(databaseAdmin, databaseName, timeout);
        var databaseOperation = databaseAdmin.CreateDatabase(
            new CreateDatabaseRequest
            {
                Parent = instanceName,
                CreateStatement = $"CREATE DATABASE `{configuration.DatabaseId}`",
            }, timeout).PollUntilCompleted();
        Assert.True(databaseOperation.IsCompleted);
        Assert.False(databaseOperation.IsFaulted);
        Assert.Equal(databaseName, databaseOperation.Result.Name);

        var ddlOperation = databaseAdmin.UpdateDatabaseDdl(
            new UpdateDatabaseDdlRequest
            {
                Database = databaseName,
                Statements = { CreateTable, CreateBusinessIdentityIndex, CreateOperationIndex },
            }, timeout).PollUntilCompleted();
        Assert.True(ddlOperation.IsCompleted);
        Assert.False(ddlOperation.IsFaulted);
        _ = ddlOperation.Result;
        return new LocalResources(instanceName, databaseName);
    }

    private static void EnsureInstanceDoesNotExist(InstanceAdminClient client, string name, CallSettings settings)
    {
        try
        {
            _ = client.GetInstance(new GetInstanceRequest { Name = name }, settings);
            throw new InvalidOperationException($"Refusing to reuse pre-existing instance '{name}'.");
        }
        catch (RpcException exception) when (exception.StatusCode == StatusCode.NotFound)
        {
        }
    }

    private static void EnsureDatabaseDoesNotExist(DatabaseAdminClient client, string name, CallSettings settings)
    {
        try
        {
            _ = client.GetDatabase(new GetDatabaseRequest { Name = name }, settings);
            throw new InvalidOperationException($"Refusing to reuse pre-existing database '{name}'.");
        }
        catch (RpcException exception) when (exception.StatusCode == StatusCode.NotFound)
        {
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
            $"test-{runId}-project",
            $"test-{runId}-instance",
            $"test-{runId}-database",
            runId);
        if (!string.Equals(configuration.EmulatorHost, "127.0.0.1:9010", StringComparison.Ordinal))
            throw new InvalidOperationException("Financial-intent store tests require exactly 127.0.0.1:9010.");
        return configuration;
    }

    private sealed record LocalResources(string InstanceName, string DatabaseName);
}
