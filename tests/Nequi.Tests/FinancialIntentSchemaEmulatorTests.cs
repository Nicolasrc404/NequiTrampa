using Google.Api.Gax;
using Google.Api.Gax.Grpc;
using Google.Cloud.Spanner.Admin.Database.V1;
using Google.Cloud.Spanner.Admin.Instance.V1;
using Google.Cloud.Spanner.Data;
using Grpc.Core;

namespace Nequi.Tests;

/// <summary>
/// Opt-in integration test for the durable financial-intent schema only.
/// It creates uniquely named local-emulator resources and never cleans them up.
/// </summary>
public sealed class FinancialIntentSchemaEmulatorTests
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
    public async Task CreatesAndValidatesFinancialIntentSchemaLocally()
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

            var ddl = databaseAdmin.GetDatabaseDdl(
                new GetDatabaseDdlRequest { Database = databaseName }, timeout);
            Assert.Contains("financial_intents", string.Join("\n", ddl.Statements), StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("ROW DELETION POLICY", string.Join("\n", ddl.Statements), StringComparison.OrdinalIgnoreCase);

            await using var connection = new SpannerConnection(
                SpannerEmulatorConnectionFactory.CreateBuilder(configuration));
            await connection.OpenAsync();

            var firstIntent = new IntentRow(
                "intent-1", "subject-1", "client-1", "TRANSFER", "transfer-scope", "key-1", "hash-1", "operation-1", "CONFIRMED");
            await InsertIntentInCommittedTransactionAsync(connection, firstIntent);

            var stored = await ReadIntentAsync(connection, firstIntent.FinancialIntentId);
            Assert.Equal(firstIntent.DomainActorId, stored.DomainActorId);
            Assert.Equal(firstIntent.RequestHash, stored.RequestHash);
            Assert.Equal(firstIntent.OperationId, stored.OperationId);
            Assert.Equal(firstIntent.FinancialStatus, stored.FinancialStatus);

            var sameIdentityDifferentHash = firstIntent with { FinancialIntentId = "intent-2", RequestHash = "hash-2" };
            var duplicateIdentityError = await Record.ExceptionAsync(() => InsertIntentAsync(connection, sameIdentityDifferentHash));
            Assert.NotNull(duplicateIdentityError);

            await InsertIntentAsync(connection, firstIntent with
            {
                FinancialIntentId = "intent-3",
                DomainActorId = "client-2",
                OperationId = null,
                FinancialStatus = "IN_PROGRESS",
            });
            await InsertIntentAsync(connection, firstIntent with
            {
                FinancialIntentId = "intent-4",
                Scope = "recharge-scope",
                OperationId = null,
                FinancialStatus = "IN_PROGRESS",
            });
            await InsertIntentAsync(connection, firstIntent with
            {
                FinancialIntentId = "intent-5",
                OperationType = "RECHARGE",
                OperationId = null,
                FinancialStatus = "IN_PROGRESS",
            });

            var duplicateOperationError = await Record.ExceptionAsync(() => InsertIntentAsync(connection, firstIntent with
            {
                FinancialIntentId = "intent-6",
                DomainActorId = "client-3",
                OperationId = firstIntent.OperationId,
            }));
            Assert.NotNull(duplicateOperationError);

            var count = await CountIntentsAsync(connection);
            Assert.Equal(4, count);
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException(
                $"Financial-intent schema test failed. No cleanup was attempted. " +
                $"Instance: {instanceName}; database: {databaseName}.",
                exception);
        }
    }

    private static async Task InsertIntentInCommittedTransactionAsync(SpannerConnection connection, IntentRow intent)
    {
        await connection.RunWithRetriableTransactionAsync(async transaction =>
        {
            var command = CreateInsertCommand(connection, intent);
            command.Transaction = transaction;
            await command.ExecuteNonQueryAsync();
        });
    }

    private static async Task InsertIntentAsync(SpannerConnection connection, IntentRow intent)
    {
        var command = CreateInsertCommand(connection, intent);
        await command.ExecuteNonQueryAsync();
    }

    private static SpannerCommand CreateInsertCommand(SpannerConnection connection, IntentRow intent)
    {
        var command = connection.CreateDmlCommand("""
            INSERT INTO financial_intents
            (financial_intent_id, authenticated_actor_id, domain_actor_id,
             operation_type, scope, idempotency_key, request_hash, operation_id,
             financial_status, created_at, confirmed_at)
            VALUES
            (@intent, @auth, @actor, @type, @scope, @key, @hash, @operation,
             @status, CURRENT_TIMESTAMP(), @confirmed)
            """);
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
        return command;
    }

    private static async Task<IntentRow> ReadIntentAsync(SpannerConnection connection, string intentId)
    {
        var command = connection.CreateSelectCommand("""
            SELECT financial_intent_id, authenticated_actor_id, domain_actor_id,
                   operation_type, scope, idempotency_key, request_hash,
                   operation_id, financial_status
            FROM financial_intents
            WHERE financial_intent_id = @intent
            """);
        command.Parameters.Add("intent", SpannerDbType.String, intentId);
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return new IntentRow(
            reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3),
            reader.GetString(4), reader.GetString(5), reader.GetString(6),
            reader.IsDBNull(7) ? null : reader.GetString(7), reader.GetString(8));
    }

    private static async Task<long> CountIntentsAsync(SpannerConnection connection)
    {
        var command = connection.CreateSelectCommand("SELECT COUNT(*) FROM financial_intents");
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return reader.GetInt64(0);
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
        if (configuration.EmulatorHost != "127.0.0.1:9010")
            throw new InvalidOperationException("Financial-intent schema tests require 127.0.0.1:9010.");
        return configuration;
    }

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

public sealed class SpannerEmulatorPersistenceFactAttribute : FactAttribute
{
    public SpannerEmulatorPersistenceFactAttribute()
    {
        if (!string.Equals(
                Environment.GetEnvironmentVariable("NEQUITRAMPA_RUN_SPANNER_EMULATOR_TESTS"),
                "1",
                StringComparison.Ordinal) ||
            !string.Equals(
                Environment.GetEnvironmentVariable("NEQUITRAMPA_RUN_SPANNER_PERSISTENCE_TESTS"),
                "1",
                StringComparison.Ordinal))
        {
            Skip = "Opt-in: set both emulator and persistence test flags to create local test resources.";
        }
    }
}
