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
/// Transactional coordinator tests using only a fresh local emulator database.
/// The ledger and outbox tables are test-only tables; no production schema or
/// monetary service is involved.
/// </summary>
public sealed class FinancialIntentCoordinatorEmulatorTests
{
    private const string CreateClientTable = """
        CREATE TABLE clients (
          client_id STRING(36) NOT NULL,
          auth_subject STRING(128) NOT NULL,
          status STRING(16) NOT NULL,
        ) PRIMARY KEY(client_id)
        """;

    private const string CreateClientAuthIndex = """
        CREATE UNIQUE INDEX ux_test_client_auth_subject ON clients(auth_subject)
        """;

    private const string CreateIntentTable = """
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

    private const string CreateIdentityIndex = """
        CREATE UNIQUE INDEX ux_financial_intent_identity
        ON financial_intents(domain_actor_id, operation_type, scope, idempotency_key)
        """;

    private const string CreateOperationIndex = """
        CREATE UNIQUE NULL_FILTERED INDEX ux_financial_intent_operation
        ON financial_intents(operation_id)
        """;

    private const string CreateLedgerTable = """
        CREATE TABLE coordinator_test_ledger (
          operation_id STRING(36) NOT NULL,
          marker STRING(64) NOT NULL,
        ) PRIMARY KEY(operation_id)
        """;

    private const string CreateOutboxTable = """
        CREATE TABLE coordinator_test_outbox (
          event_id STRING(36) NOT NULL,
          operation_id STRING(36) NOT NULL,
          marker STRING(64) NOT NULL,
        ) PRIMARY KEY(event_id)
        """;

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task Coordinator_CommitsIntentAndLedgerTogether()
    {
        var scenario = await CreateScenarioAsync();
        var request = Request("commit-key", "commit-hash");

        var result = await scenario.Coordinator.ExecuteAsync(
            request,
            (context, ct) => InsertLedgerAsync(context, "commit" , ct),
            CancellationToken.None);

        Assert.Equal(FinancialIntentResultKind.Confirmed, result.Result.Kind);
        Assert.True(result.EffectExecuted);
        Assert.Equal(1, await CountAsync(scenario, "financial_intents"));
        Assert.Equal(1, await CountAsync(scenario, "coordinator_test_ledger"));
        Assert.Equal("CONFIRMED", await ReadIntentStatusAsync(scenario));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task Coordinator_ResolvesAuthenticatedSubjectInsideTheTransaction()
    {
        var scenario = await CreateScenarioAsync();
        var result = await scenario.Coordinator.ExecuteAsync(
            Request("identity-key", "identity-hash"),
            (context, ct) => InsertLedgerAsync(context, "identity", ct),
            CancellationToken.None);

        Assert.Equal(FinancialIntentResultKind.Confirmed, result.Result.Kind);
        Assert.Equal("client-coordinator", result.Result.Intent!.Identity.DomainActorId);
        Assert.Equal("subject-coordinator", result.Result.Intent.AuthenticatedActorId);
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task Coordinator_RejectsUnknownAuthenticatedSubjectWithoutCreatingIntent()
    {
        var scenario = await CreateScenarioAsync();
        var request = new FinancialIntentExecutionRequest(
            "subject-missing", "TEST", "coordinator-v1", "missing-identity-key", "missing-hash");
        var effectExecuted = false;

        var result = await scenario.Coordinator.ExecuteAsync(
            request,
            (context, ct) =>
            {
                effectExecuted = true;
                return InsertLedgerAsync(context, "must-not-write", ct);
            },
            CancellationToken.None);

        Assert.Equal(FinancialIntentResultKind.IdentityNotFound, result.Result.Kind);
        Assert.False(effectExecuted);
        Assert.Equal(0, await CountAsync(scenario, "financial_intents"));
        Assert.Equal(0, await CountAsync(scenario, "coordinator_test_ledger"));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task Coordinator_ConcurrentRequestsForResolvedActorConfirmOneIntent()
    {
        var scenario = await CreateScenarioAsync();
        var request = Request("concurrent-identity-key", "concurrent-identity-hash");
        var executions = 0;

        var results = await Task.WhenAll(
            ExecuteWithCounterAsync(scenario, request, () => Interlocked.Increment(ref executions)),
            ExecuteWithCounterAsync(scenario, request, () => Interlocked.Increment(ref executions)));

        Assert.All(results, result => Assert.Equal(FinancialIntentResultKind.Confirmed, result.Result.Kind));
        Assert.Equal(1, executions);
        Assert.Equal(1, await CountAsync(scenario, "financial_intents"));
        Assert.Equal(1, await CountAsync(scenario, "coordinator_test_ledger"));
        Assert.All(results, result => Assert.Equal(
            results[0].Result.Intent!.OperationId,
            result.Result.Intent!.OperationId));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task Coordinator_RollsBackIntentWhenLedgerFails()
    {
        var scenario = await CreateScenarioAsync();
        var request = Request("rollback-ledger-key", "rollback-ledger-hash");

        await Assert.ThrowsAsync<InvalidOperationException>(() => scenario.Coordinator.ExecuteAsync<string>(
            request,
            async (context, ct) =>
            {
                await InsertLedgerAsync(context, "before-failure", ct);
                throw new InvalidOperationException("Controlled ledger failure before commit.");
            },
            CancellationToken.None));

        Assert.Equal(0, await CountAsync(scenario, "financial_intents"));
        Assert.Equal(0, await CountAsync(scenario, "coordinator_test_ledger"));
        Assert.Equal(FinancialIntentResultKind.NotFound,
            (await scenario.Store.GetAsync(
                new FinancialIntentIdentity("client-coordinator", "TEST", "coordinator-v1", "rollback-ledger-key"),
                CancellationToken.None)).Kind);
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task Coordinator_RollsBackLedgerWhenIntentConfirmationFails()
    {
        var scenario = await CreateScenarioAsync();
        var request = Request("rollback-confirm-key", "rollback-confirm-hash");

        await Assert.ThrowsAsync<InvalidOperationException>(() => scenario.Coordinator.ExecuteAsync(
            request,
            async (context, ct) =>
            {
                await InsertLedgerAsync(context, "before-confirmation-failure", ct);
                await ChangeOperationIdAsync(context, NewId(), ct);
                return context.Intent.OperationId!;
            },
            CancellationToken.None));

        Assert.Equal(0, await CountAsync(scenario, "financial_intents"));
        Assert.Equal(0, await CountAsync(scenario, "coordinator_test_ledger"));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task Coordinator_WritesOutboxInSameTransaction()
    {
        var scenario = await CreateScenarioAsync();
        var request = Request("outbox-key", "outbox-hash");

        var result = await scenario.Coordinator.ExecuteAsync(
            request,
            async (context, ct) =>
            {
                await InsertLedgerAsync(context, "ledger-and-outbox", ct);
                await InsertOutboxAsync(context, "outbox", ct);
                return context.Intent.OperationId!;
            },
            CancellationToken.None);

        Assert.True(result.EffectExecuted);
        Assert.Equal(1, await CountAsync(scenario, "coordinator_test_ledger"));
        Assert.Equal(1, await CountAsync(scenario, "coordinator_test_outbox"));
        Assert.Equal(result.Value, await ReadOutboxOperationAsync(scenario));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task Coordinator_DoesNotExecuteEffectForConfirmedIntent()
    {
        var scenario = await CreateScenarioAsync();
        var request = Request("replay-key", "replay-hash");
        var executions = 0;

        var first = await ExecuteWithCounterAsync(scenario, request, () => Interlocked.Increment(ref executions));
        var second = await ExecuteWithCounterAsync(scenario, request, () => Interlocked.Increment(ref executions));

        Assert.Equal(FinancialIntentResultKind.Confirmed, first.Result.Kind);
        Assert.Equal(FinancialIntentResultKind.Confirmed, second.Result.Kind);
        Assert.True(first.EffectExecuted);
        Assert.False(second.EffectExecuted);
        Assert.Equal(1, executions);
        Assert.Equal(first.Result.Intent!.OperationId, second.Result.Intent!.OperationId);
        Assert.Equal(1, await CountAsync(scenario, "coordinator_test_ledger"));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task Coordinator_ReturnsIdentityConflictForDifferentHash()
    {
        var scenario = await CreateScenarioAsync();
        var firstRequest = Request("conflict-key", "original-hash");
        var secondRequest = Request("conflict-key", "different-hash");
        var executions = 0;

        await ExecuteWithCounterAsync(scenario, firstRequest, () => Interlocked.Increment(ref executions));
        var conflict = await ExecuteWithCounterAsync(scenario, secondRequest, () => Interlocked.Increment(ref executions));

        Assert.Equal(FinancialIntentResultKind.IdentityConflict, conflict.Result.Kind);
        Assert.False(conflict.EffectExecuted);
        Assert.Equal(1, executions);
        Assert.Equal(1, await CountAsync(scenario, "financial_intents"));
        Assert.Equal("original-hash", await ReadRequestHashAsync(scenario));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task Coordinator_UsesStableOperationIdForTheLogicalAttempt()
    {
        var scenario = await CreateScenarioAsync();
        var request = Request("stable-id-key", "stable-id-hash");
        var observedOperationIds = new List<string>();

        var result = await scenario.Coordinator.ExecuteAsync(
            request,
            (context, ct) =>
            {
                observedOperationIds.Add(context.Intent.OperationId!);
                return InsertLedgerAsync(context, "stable-operation", ct);
            },
            CancellationToken.None);

        Assert.True(result.EffectExecuted);
        Assert.NotEmpty(observedOperationIds);
        Assert.Single(observedOperationIds.Distinct());
        Assert.Equal(observedOperationIds[0], result.Result.Intent!.OperationId);

        // A deterministic ABORTED injection is deliberately not fabricated.
        // The SDK retry behavior still requires a dedicated emulator fault or
        // contention harness before it can be asserted as a repeated callback.
    }

    private static async Task<FinancialIntentExecutionResult<string>> ExecuteWithCounterAsync(
        Scenario scenario,
        FinancialIntentExecutionRequest request,
        Action count)
    {
        return await scenario.Coordinator.ExecuteAsync(
            request,
            async (context, ct) =>
            {
                count();
                return await InsertLedgerAsync(context, "counter", ct);
            },
            CancellationToken.None);
    }

    private static async Task<string> InsertLedgerAsync(
        FinancialIntentTransactionContext context,
        string marker,
        CancellationToken ct)
    {
        await using var command = context.Connection.CreateDmlCommand(
            "INSERT INTO coordinator_test_ledger (operation_id, marker) VALUES (@operation, @marker)");
        command.Transaction = context.Transaction;
        command.Parameters.Add("operation", SpannerDbType.String, context.Intent.OperationId!);
        command.Parameters.Add("marker", SpannerDbType.String, marker);
        await command.ExecuteNonQueryAsync(ct);
        return context.Intent.OperationId!;
    }

    private static async Task InsertOutboxAsync(
        FinancialIntentTransactionContext context,
        string marker,
        CancellationToken ct)
    {
        await using var command = context.Connection.CreateDmlCommand(
            "INSERT INTO coordinator_test_outbox (event_id, operation_id, marker) VALUES (@event, @operation, @marker)");
        command.Transaction = context.Transaction;
        command.Parameters.Add("event", SpannerDbType.String, NewId());
        command.Parameters.Add("operation", SpannerDbType.String, context.Intent.OperationId!);
        command.Parameters.Add("marker", SpannerDbType.String, marker);
        await command.ExecuteNonQueryAsync(ct);
    }

    private static async Task ChangeOperationIdAsync(
        FinancialIntentTransactionContext context,
        string operationId,
        CancellationToken ct)
    {
        await using var command = context.Connection.CreateDmlCommand(
            "UPDATE financial_intents SET operation_id=@replacement WHERE financial_intent_id=@intent");
        command.Transaction = context.Transaction;
        command.Parameters.Add("replacement", SpannerDbType.String, operationId);
        command.Parameters.Add("intent", SpannerDbType.String, context.Intent.FinancialIntentId);
        await command.ExecuteNonQueryAsync(ct);
    }

    private static async Task<long> CountAsync(Scenario scenario, string table)
    {
        await using var connection = await scenario.OpenConnectionAsync();
        await using var command = connection.CreateSelectCommand($"SELECT COUNT(*) FROM {table}");
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return reader.GetInt64(0);
    }

    private static async Task<string> ReadIntentStatusAsync(Scenario scenario)
    {
        await using var connection = await scenario.OpenConnectionAsync();
        await using var command = connection.CreateSelectCommand("SELECT financial_status FROM financial_intents");
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return reader.GetString(0);
    }

    private static async Task<string> ReadRequestHashAsync(Scenario scenario)
    {
        await using var connection = await scenario.OpenConnectionAsync();
        await using var command = connection.CreateSelectCommand("SELECT request_hash FROM financial_intents");
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return reader.GetString(0);
    }

    private static async Task<string> ReadOutboxOperationAsync(Scenario scenario)
    {
        await using var connection = await scenario.OpenConnectionAsync();
        await using var command = connection.CreateSelectCommand("SELECT operation_id FROM coordinator_test_outbox");
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return reader.GetString(0);
    }

    private static FinancialIntentExecutionRequest Request(string key, string hash) =>
        new(
            "subject-coordinator",
            "TEST",
            "coordinator-v1",
            key,
            hash);

    private static string NewId() => Guid.NewGuid().ToString("N");

    private static async Task<Scenario> CreateScenarioAsync()
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
            throw new InvalidOperationException("Coordinator tests require exactly 127.0.0.1:9010.");

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
        var instanceOperation = instanceAdmin.CreateInstance(new CreateInstanceRequest
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
        var databaseOperation = databaseAdmin.CreateDatabase(new CreateDatabaseRequest
        {
            Parent = instanceName,
            CreateStatement = $"CREATE DATABASE `{configuration.DatabaseId}`",
        }, timeout).PollUntilCompleted();
        Assert.True(databaseOperation.IsCompleted);
        Assert.False(databaseOperation.IsFaulted);
        Assert.Equal(databaseName, databaseOperation.Result.Name);

        var ddlOperation = databaseAdmin.UpdateDatabaseDdl(new UpdateDatabaseDdlRequest
        {
            Database = databaseName,
            Statements = { CreateClientTable, CreateClientAuthIndex, CreateIntentTable, CreateIdentityIndex, CreateOperationIndex, CreateLedgerTable, CreateOutboxTable },
        }, timeout).PollUntilCompleted();
        Assert.True(ddlOperation.IsCompleted);
        Assert.False(ddlOperation.IsFaulted);
        _ = ddlOperation.Result;

        await using (var seedConnection = new SpannerConnection(
            SpannerEmulatorConnectionFactory.CreateBuilder(configuration)))
        {
            await seedConnection.OpenAsync();
            await using var seed = seedConnection.CreateDmlCommand(
                "INSERT INTO clients (client_id, auth_subject, status) VALUES (@client, @subject, 'ACTIVE')");
            seed.Parameters.Add("client", SpannerDbType.String, "client-coordinator");
            seed.Parameters.Add("subject", SpannerDbType.String, "subject-coordinator");
            await seed.ExecuteNonQueryAsync();
        }

        var store = new SpannerFinancialIntentStore(
            () => new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(configuration)));
        var identityResolver = new SpannerFinancialIdentityResolver();
        var coordinator = new SpannerFinancialIntentCoordinator(
            () => new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(configuration)),
            store,
            identityResolver);
        return new Scenario(configuration, store, coordinator);
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

    private sealed record Scenario(
        SpannerEmulatorTestConfiguration Configuration,
        SpannerFinancialIntentStore Store,
        SpannerFinancialIntentCoordinator Coordinator)
    {
        public async Task<SpannerConnection> OpenConnectionAsync()
        {
            var connection = new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(Configuration));
            await connection.OpenAsync();
            return connection;
        }
    }
}
