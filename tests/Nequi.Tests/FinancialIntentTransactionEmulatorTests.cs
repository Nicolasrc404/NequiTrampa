using Google.Api.Gax;
using Google.Api.Gax.Grpc;
using Google.Cloud.Spanner.Admin.Database.V1;
using Google.Cloud.Spanner.Admin.Instance.V1;
using Google.Cloud.Spanner.Data;
using Grpc.Core;

namespace Nequi.Tests;

/// <summary>
/// Opt-in transaction tests for the local financial-intent schema. These tests
/// validate Spanner transaction behavior only; they do not implement or fake
/// IFinancialIntentStore, a ledger, balances, or an outbox.
/// </summary>
public sealed class FinancialIntentTransactionEmulatorTests
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
    public async Task TransactionsPreserveAtomicityAndIdentityUniqueness()
    {
        var configuration = CreateValidatedConfiguration();
        var timeout = CallSettings.FromExpiration(Expiration.FromTimeout(TimeSpan.FromSeconds(30)));
        var resource = await CreateIsolatedDatabaseAsync(configuration, timeout);

        try
        {
            await using var connection = await OpenConnectionAsync(configuration);

            // A: two writes in one committed transaction become visible together.
            await connection.RunWithRetriableTransactionAsync(async transaction =>
            {
                await InsertAsync(connection, transaction, Intent("commit-1", "commit-key-1"));
                await InsertAsync(connection, transaction, Intent("commit-2", "commit-key-2"));
            });

            await using (var independentRead = await OpenConnectionAsync(configuration))
            {
                Assert.Equal(2, await CountAsync(independentRead));
            }

            // B: an explicit rollback leaves no row visible to an independent connection.
            await using (var rollbackConnection = await OpenConnectionAsync(configuration))
            {
                await using var transaction = await rollbackConnection.BeginTransactionAsync();
                var spannerTransaction = Assert.IsType<SpannerTransaction>(transaction);
                await InsertAsync(rollbackConnection, spannerTransaction, Intent("rollback-1", "rollback-key"));
                await transaction.RollbackAsync();
            }

            await using (var independentRead = await OpenConnectionAsync(configuration))
            {
                Assert.Equal(2, await CountAsync(independentRead));
            }

            // C/D: a uniqueness error after a successful first statement rolls
            // back the whole transaction; no partial row survives.
            await using (var failedConnection = await OpenConnectionAsync(configuration))
            {
                var duplicateIdentityException = await Record.ExceptionAsync(() =>
                    failedConnection.RunWithRetriableTransactionAsync(async transaction =>
                    {
                        await InsertAsync(failedConnection, transaction, Intent("failed-1", "duplicate-key"));
                        await InsertAsync(failedConnection, transaction, Intent("failed-2", "duplicate-key"));
                    }));

                Assert.NotNull(duplicateIdentityException);
            }

            await using (var independentRead = await OpenConnectionAsync(configuration))
            {
                Assert.Equal(2, await CountAsync(independentRead));
            }

            // F: two independent transactions race for one business identity.
            // The unique index permits one committed row only. The emulator may
            // report either a uniqueness violation or an aborted transaction for
            // the losing attempt; neither result is treated as a second intent.
            var concurrentResults = await Task.WhenAll(
                TryInsertConcurrentIntentAsync(configuration, "concurrent-1"),
                TryInsertConcurrentIntentAsync(configuration, "concurrent-2"));

            Assert.Equal(1, concurrentResults.Count(result => result));
            await using (var independentRead = await OpenConnectionAsync(configuration))
            {
                Assert.Equal(3, await CountAsync(independentRead));
            }

            // E: this test intentionally does not fabricate ABORTED. The real
            // retry contract is exercised by RunWithRetriableTransactionAsync,
            // but deterministic abort injection requires a dedicated emulator
            // fault/concurrency harness and is pending for FinancialIntentStore.
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException(
                $"Financial-intent transaction test failed. No cleanup was attempted. " +
                $"Instance: {resource.InstanceName}; database: {resource.DatabaseName}.",
                exception);
        }
    }

    private static async Task<bool> TryInsertConcurrentIntentAsync(
        SpannerEmulatorTestConfiguration configuration,
        string intentId)
    {
        await using var connection = await OpenConnectionAsync(configuration);
        try
        {
            await connection.RunWithRetriableTransactionAsync(async transaction =>
            {
                await InsertAsync(connection, transaction, Intent(intentId, "concurrent-key"));
            });
            return true;
        }
        catch (SpannerException exception) when (
            exception.ErrorCode is ErrorCode.Aborted or ErrorCode.AlreadyExists or ErrorCode.InvalidArgument)
        {
            return false;
        }
        catch (RpcException exception) when (
            exception.StatusCode is StatusCode.Aborted or StatusCode.AlreadyExists or StatusCode.InvalidArgument)
        {
            return false;
        }
    }

    private static async Task<LocalResource> CreateIsolatedDatabaseAsync(
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
            },
            timeout).PollUntilCompleted();

        Assert.True(instanceOperation.IsCompleted);
        Assert.False(instanceOperation.IsFaulted);
        Assert.Equal(instanceName, instanceOperation.Result.Name);

        EnsureDatabaseDoesNotExist(databaseAdmin, databaseName, timeout);
        var databaseOperation = databaseAdmin.CreateDatabase(
            new CreateDatabaseRequest
            {
                Parent = instanceName,
                CreateStatement = $"CREATE DATABASE `{configuration.DatabaseId}`",
            },
            timeout).PollUntilCompleted();

        Assert.True(databaseOperation.IsCompleted);
        Assert.False(databaseOperation.IsFaulted);
        Assert.Equal(databaseName, databaseOperation.Result.Name);

        var ddlOperation = databaseAdmin.UpdateDatabaseDdl(
            new UpdateDatabaseDdlRequest
            {
                Database = databaseName,
                Statements = { CreateTable, CreateBusinessIdentityIndex, CreateOperationIndex },
            },
            timeout).PollUntilCompleted();

        Assert.True(ddlOperation.IsCompleted);
        Assert.False(ddlOperation.IsFaulted);
        _ = ddlOperation.Result;

        return new LocalResource(instanceName, databaseName);
    }

    private static async Task<SpannerConnection> OpenConnectionAsync(
        SpannerEmulatorTestConfiguration configuration)
    {
        var connection = new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(configuration));
        await connection.OpenAsync();
        return connection;
    }

    private static async Task InsertAsync(
        SpannerConnection connection,
        SpannerTransaction transaction,
        IntentRow intent)
    {
        await using var command = connection.CreateDmlCommand("""
            INSERT INTO financial_intents
            (financial_intent_id, authenticated_actor_id, domain_actor_id,
             operation_type, scope, idempotency_key, request_hash, operation_id,
             financial_status, created_at, confirmed_at)
            VALUES
            (@intent, @auth, @actor, @type, @scope, @key, @hash, @operation,
             @status, CURRENT_TIMESTAMP(), @confirmed)
            """);
        command.Transaction = transaction;
        command.Parameters.Add("intent", SpannerDbType.String, intent.FinancialIntentId);
        command.Parameters.Add("auth", SpannerDbType.String, intent.AuthenticatedActorId);
        command.Parameters.Add("actor", SpannerDbType.String, intent.DomainActorId);
        command.Parameters.Add("type", SpannerDbType.String, intent.OperationType);
        command.Parameters.Add("scope", SpannerDbType.String, intent.Scope);
        command.Parameters.Add("key", SpannerDbType.String, intent.IdempotencyKey);
        command.Parameters.Add("hash", SpannerDbType.String, intent.RequestHash);
        command.Parameters.Add("operation", SpannerDbType.String, intent.OperationId ?? (object)DBNull.Value);
        command.Parameters.Add("status", SpannerDbType.String, intent.FinancialStatus);
        command.Parameters.Add("confirmed", SpannerDbType.Timestamp,
            intent.FinancialStatus == "CONFIRMED" ? DateTime.UtcNow : DBNull.Value);
        await command.ExecuteNonQueryAsync();
    }

    private static async Task<long> CountAsync(SpannerConnection connection)
    {
        await using var command = connection.CreateSelectCommand("SELECT COUNT(*) FROM financial_intents");
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return reader.GetInt64(0);
    }

    private static IntentRow Intent(string intentId, string key) => new(
        intentId,
        "subject-test",
        "client-test",
        "TRANSFER",
        "transfer-scope",
        key,
        $"hash-{intentId}",
        $"operation-{intentId}",
        "CONFIRMED");

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
            throw new InvalidOperationException("Transaction tests require exactly 127.0.0.1:9010.");
        return configuration;
    }

    private sealed record LocalResource(string InstanceName, string DatabaseName);

    private sealed record IntentRow(
        string FinancialIntentId,
        string AuthenticatedActorId,
        string DomainActorId,
        string OperationType,
        string Scope,
        string IdempotencyKey,
        string RequestHash,
        string? OperationId,
        string FinancialStatus);
}
