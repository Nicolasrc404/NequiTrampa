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
/// Real concurrency and rollback checks for the durable intent store. All
/// resources are unique local-emulator resources and are intentionally kept.
/// </summary>
public sealed class FinancialIntentStoreConcurrencyEmulatorTests
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
    public async Task ConcurrentAndRecoveryGuaranteesHoldForTheIntentStore()
    {
        var configuration = CreateValidatedConfiguration();
        var timeout = CallSettings.FromExpiration(Expiration.FromTimeout(TimeSpan.FromSeconds(30)));
        var resources = await CreateIsolatedDatabaseAsync(configuration, timeout);
        var store = new SpannerFinancialIntentStore(
            () => new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(configuration)));

        try
        {
            // A: same identity and hash. Both callbacks may run, but the unique
            // business index permits only one durable intent and one operation ID.
            var sameIdentity = new FinancialIntentIdentity("client-concurrent", "TRANSFER", "transfer-v1", "same-key");
            using var gate = new Barrier(2);
            var sameHashResults = await Task.WhenAll(
                Task.Run(() => ExecuteAfterBarrierAsync(gate, configuration, store, sameIdentity, "same-hash")),
                Task.Run(() => ExecuteAfterBarrierAsync(gate, configuration, store, sameIdentity, "same-hash")));

            Assert.All(sameHashResults, result => Assert.Equal(FinancialIntentResultKind.Confirmed, result.Kind));
            var recovered = await store.GetAsync(sameIdentity, CancellationToken.None);
            Assert.Equal(FinancialIntentResultKind.Confirmed, recovered.Kind);
            Assert.NotNull(recovered.Intent?.FinancialIntentId);
            Assert.NotNull(recovered.Intent?.OperationId);
            Assert.Equal(1, await CountByIdentityAsync(configuration, sameIdentity));

            // B: once confirmed, a different hash is an identity conflict and
            // cannot overwrite the original request hash.
            var incompatible = await ResolveInTransactionAsync(
                configuration, store, sameIdentity, "different-hash", "candidate-conflict");
            Assert.Equal(FinancialIntentResultKind.IdentityConflict, incompatible.Kind);
            Assert.Equal("same-hash", incompatible.Intent!.RequestHash);

            // C: changing actor, scope, or operation type creates a distinct
            // identity even when the idempotency key is reused.
            var otherActor = new FinancialIntentIdentity("client-other", "TRANSFER", "transfer-v1", "same-key");
            var otherScope = new FinancialIntentIdentity("client-concurrent", "TRANSFER", "other-scope", "same-key");
            var otherType = new FinancialIntentIdentity("client-concurrent", "RECHARGE", "transfer-v1", "same-key");
            var distinctResults = await Task.WhenAll(
                ExecuteAsync(configuration, store, otherActor, "hash-actor", NewId()),
                ExecuteAsync(configuration, store, otherScope, "hash-scope", NewId()),
                ExecuteAsync(configuration, store, otherType, "hash-type", NewId()));
            Assert.All(distinctResults, result => Assert.Equal(FinancialIntentResultKind.Confirmed, result.Kind));
            Assert.Equal(1, await CountByIdentityAsync(configuration, otherActor));
            Assert.Equal(1, await CountByIdentityAsync(configuration, otherScope));
            Assert.Equal(1, await CountByIdentityAsync(configuration, otherType));

            // D: operation_id is independently unique. The second transaction
            // fails and must not leave its newly inserted intent behind.
            var operationIdentity = new FinancialIntentIdentity("client-operation", "TRANSFER", "transfer-v1", "operation-key");
            var collidingOperationId = NewId();
            await ExecuteAsync(configuration, store, operationIdentity, "operation-hash", collidingOperationId);
            var duplicateOperationIdentity = new FinancialIntentIdentity("client-operation-2", "TRANSFER", "transfer-v1", "operation-key-2");
            var duplicateOperation = await Record.ExceptionAsync(() =>
                ExecuteAsync(configuration, store, duplicateOperationIdentity, "operation-hash-2", collidingOperationId));
            Assert.IsType<SpannerException>(duplicateOperation);
            Assert.Equal(FinancialIntentResultKind.NotFound,
                (await store.GetAsync(duplicateOperationIdentity, CancellationToken.None)).Kind);

            // Rollback: an application failure before commit leaves no intent.
            var rollbackIdentity = new FinancialIntentIdentity("client-rollback", "TRANSFER", "transfer-v1", "rollback-key");
            var rollbackFailure = await Record.ExceptionAsync(() =>
                ExecuteAndFailBeforeCommitAsync(configuration, store, rollbackIdentity));
            Assert.IsType<InvalidOperationException>(rollbackFailure);
            Assert.Equal(FinancialIntentResultKind.NotFound,
                (await store.GetAsync(rollbackIdentity, CancellationToken.None)).Kind);

            // The API requires a valid shared transaction context; null cannot
            // be interpreted as permission to confirm independently.
            await Assert.ThrowsAsync<ArgumentNullException>(() =>
                store.ConfirmInTransactionAsync(null!, "intent", "operation", CancellationToken.None));
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException(
                $"Financial-intent concurrency test failed. No cleanup was attempted. " +
                $"Instance: {resources.InstanceName}; database: {resources.DatabaseName}.",
                exception);
        }
    }

    private static async Task<FinancialIntentResult> ExecuteAfterBarrierAsync(
        Barrier gate,
        SpannerEmulatorTestConfiguration configuration,
        SpannerFinancialIntentStore store,
        FinancialIntentIdentity identity,
        string requestHash)
    {
        gate.SignalAndWait();
        return await ExecuteAsync(
            configuration,
            store,
            identity,
            requestHash,
            NewId());
    }

    private static async Task<FinancialIntentResult> ExecuteAsync(
        SpannerEmulatorTestConfiguration configuration,
        SpannerFinancialIntentStore store,
        FinancialIntentIdentity identity,
        string requestHash,
        string operationId)
    {
        await using var connection = await OpenConnectionAsync(configuration);
        var financialIntentId = NewId();
        ValidateLengths(financialIntentId, operationId, identity, $"subject-{identity.DomainActorId}", requestHash);
        return await connection.RunWithRetriableTransactionAsync(async transaction =>
        {
            var candidate = new FinancialIntent(
                financialIntentId,
                $"subject-{identity.DomainActorId}",
                identity,
                requestHash,
                FinancialIntentStatus.InProgress,
                DateTimeOffset.UtcNow,
                operationId);
            var context = new FinancialIntentTransactionContext(connection, transaction, candidate);
            var result = await store.GetOrCreateInTransactionAsync(
                context,
                identity,
                candidate.AuthenticatedActorId,
                requestHash,
                candidate.FinancialIntentId,
                operationId,
                CancellationToken.None);

            if (result.Kind != FinancialIntentResultKind.NewIntent)
                return result;

            return await store.ConfirmInTransactionAsync(
                context,
                candidate.FinancialIntentId,
                operationId,
                CancellationToken.None);
        });
    }

    private static async Task<FinancialIntentResult> ResolveInTransactionAsync(
        SpannerEmulatorTestConfiguration configuration,
        SpannerFinancialIntentStore store,
        FinancialIntentIdentity identity,
        string requestHash,
        string candidateSuffix)
    {
        await using var connection = await OpenConnectionAsync(configuration);
        await using var transaction = await connection.BeginTransactionAsync();
        var spannerTransaction = Assert.IsType<SpannerTransaction>(transaction);
        var financialIntentId = NewId();
        var operationId = NewId();
        ValidateLengths(financialIntentId, operationId, identity, "subject-resolution", requestHash);
        var candidate = new FinancialIntent(
            financialIntentId,
            "subject-resolution",
            identity,
            requestHash,
            FinancialIntentStatus.InProgress,
            DateTimeOffset.UtcNow,
            operationId);
        var context = new FinancialIntentTransactionContext(connection, spannerTransaction, candidate);
        var result = await store.GetOrCreateInTransactionAsync(
            context,
            identity,
            candidate.AuthenticatedActorId,
            requestHash,
            candidate.FinancialIntentId,
            candidate.OperationId!,
            CancellationToken.None);
        await transaction.RollbackAsync();
        return result;
    }

    private static async Task ExecuteAndFailBeforeCommitAsync(
        SpannerEmulatorTestConfiguration configuration,
        SpannerFinancialIntentStore store,
        FinancialIntentIdentity identity)
    {
        await using var connection = await OpenConnectionAsync(configuration);
        var financialIntentId = NewId();
        var operationId = NewId();
        ValidateLengths(financialIntentId, operationId, identity, "subject-rollback", "rollback-hash");
        await connection.RunWithRetriableTransactionAsync(async transaction =>
        {
            var candidate = new FinancialIntent(
                financialIntentId,
                "subject-rollback",
                identity,
                "rollback-hash",
                FinancialIntentStatus.InProgress,
                DateTimeOffset.UtcNow,
                operationId);
            var context = new FinancialIntentTransactionContext(connection, transaction, candidate);
            var result = await store.GetOrCreateInTransactionAsync(
                context,
                identity,
                candidate.AuthenticatedActorId,
                candidate.RequestHash,
                candidate.FinancialIntentId,
                candidate.OperationId!,
                CancellationToken.None);
            Assert.Equal(FinancialIntentResultKind.NewIntent, result.Kind);
            throw new InvalidOperationException("Controlled pre-commit failure.");
        });
    }

    private static string NewId()
    {
        var value = Guid.NewGuid().ToString("N");
        Assert.InRange(value.Length, 1, 36);
        return value;
    }

    private static void ValidateLengths(
        string financialIntentId,
        string operationId,
        FinancialIntentIdentity identity,
        string authenticatedActorId,
        string requestHash)
    {
        Assert.InRange(financialIntentId.Length, 1, 36);
        Assert.InRange(operationId.Length, 1, 36);
        Assert.InRange(authenticatedActorId.Length, 1, 128);
        Assert.InRange(identity.DomainActorId.Length, 1, 36);
        Assert.InRange(identity.OperationType.Length, 1, 32);
        Assert.InRange(identity.Scope.Length, 1, 128);
        Assert.InRange(identity.IdempotencyKey.Length, 1, 64);
        Assert.InRange(requestHash.Length, 1, 64);
    }

    private static async Task<long> CountByIdentityAsync(
        SpannerEmulatorTestConfiguration configuration,
        FinancialIntentIdentity identity)
    {
        await using var connection = await OpenConnectionAsync(configuration);
        await using var command = connection.CreateSelectCommand(
            "SELECT COUNT(*) FROM financial_intents WHERE domain_actor_id=@actor " +
            "AND operation_type=@type AND scope=@scope AND idempotency_key=@key");
        command.Parameters.Add("actor", SpannerDbType.String, identity.DomainActorId);
        command.Parameters.Add("type", SpannerDbType.String, identity.OperationType);
        command.Parameters.Add("scope", SpannerDbType.String, identity.Scope);
        command.Parameters.Add("key", SpannerDbType.String, identity.IdempotencyKey);
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return reader.GetInt64(0);
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
            throw new InvalidOperationException("Concurrency tests require exactly 127.0.0.1:9010.");
        return configuration;
    }

    private sealed record LocalResources(string InstanceName, string DatabaseName);
}
