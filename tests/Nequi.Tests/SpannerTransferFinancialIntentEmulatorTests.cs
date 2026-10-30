using Google.Api.Gax;
using Google.Api.Gax.Grpc;
using Google.Cloud.Spanner.Admin.Database.V1;
using Google.Cloud.Spanner.Admin.Instance.V1;
using Google.Cloud.Spanner.Data;
using Microsoft.Extensions.Logging.Abstractions;
using Nequi.Shared.Data;
using Nequi.Shared.Financial;
using Nequi.Wallet.DTOs;
using Nequi.Wallet.Services;

namespace Nequi.Tests;

public sealed class SpannerTransferFinancialIntentEmulatorTests
{
    private const string CreateClients = """
        CREATE TABLE clients (
          client_id STRING(36) NOT NULL,
          auth_subject STRING(128) NOT NULL,
          public_transfer_code STRING(20) NOT NULL,
          status STRING(16) NOT NULL,
          timezone STRING(64),
        ) PRIMARY KEY(client_id)
        """;

    private const string CreateWallets = """
        CREATE TABLE wallet_accounts (
          account_id STRING(36) NOT NULL,
          client_id STRING(36) NOT NULL,
          account_type STRING(32) NOT NULL,
          currency STRING(3) NOT NULL,
          current_balance_minor NUMERIC NOT NULL,
          status STRING(16) NOT NULL,
          version INT64 NOT NULL,
          updated_at TIMESTAMP NOT NULL,
        ) PRIMARY KEY(account_id)
        """;

    private const string CreateDailyUsage = """
        CREATE TABLE daily_transfer_usage (
          client_id STRING(36) NOT NULL,
          local_day DATE NOT NULL,
          outgoing_total_minor NUMERIC NOT NULL,
          operations_count INT64 NOT NULL,
          version INT64 NOT NULL,
          updated_at TIMESTAMP NOT NULL,
        ) PRIMARY KEY(client_id, local_day)
        """;

    private const string CreateOperations = """
        CREATE TABLE ledger_operations (
          operation_id STRING(36) NOT NULL,
          public_reference STRING(32) NOT NULL,
          type STRING(24) NOT NULL,
          status STRING(16) NOT NULL,
          actor_id STRING(36) NOT NULL,
          actor_type STRING(16) NOT NULL,
          amount_minor NUMERIC NOT NULL,
          currency STRING(3) NOT NULL,
          idempotency_key STRING(64),
          original_operation_id STRING(36),
          reason STRING(500),
          created_at TIMESTAMP NOT NULL,
          confirmed_at TIMESTAMP,
          updated_at TIMESTAMP NOT NULL,
        ) PRIMARY KEY(operation_id)
        """;

    private const string CreateEntries = """
        CREATE TABLE ledger_entries (
          operation_id STRING(36) NOT NULL,
          entry_no INT64 NOT NULL,
          account_id STRING(36) NOT NULL,
          delta_minor NUMERIC NOT NULL,
          balance_before_minor NUMERIC NOT NULL,
          balance_after_minor NUMERIC NOT NULL,
          created_at TIMESTAMP NOT NULL,
        ) PRIMARY KEY(operation_id, entry_no)
        """;

    private const string CreateOutbox = """
        CREATE TABLE outbox_events (
          event_id STRING(36) NOT NULL,
          aggregate_id STRING(36) NOT NULL,
          aggregate_type STRING(32) NOT NULL,
          event_type STRING(64) NOT NULL,
          payload JSON NOT NULL,
          created_at TIMESTAMP NOT NULL,
          pending_since TIMESTAMP,
          published_at TIMESTAMP,
          attempts INT64 NOT NULL,
          last_error STRING(1000),
        ) PRIMARY KEY(event_id)
        """;

    private const string CreateIntents = """
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
          created_at TIMESTAMP NOT NULL,
          confirmed_at TIMESTAMP,
        ) PRIMARY KEY(financial_intent_id)
        """;

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task TransferSameIntentCreatesOneOperationAndReplayDoesNotChangeBalances()
    {
        var scenario = await CreateScenarioAsync();
        var request = new CreateTransferRequestDto("DEST-001", 10m, "test", "COP");

        var first = await scenario.Service.CreateTransferWithFinancialIntentAsync(
            scenario.Coordinator, "subject-origin", "transfer-key", "transfer-hash", request);
        var second = await scenario.Service.CreateTransferWithFinancialIntentAsync(
            scenario.Coordinator, "subject-origin", "transfer-key", "transfer-hash", request);

        Assert.Equal(FinancialIntentResultKind.Confirmed, first.Result.Kind);
        Assert.True(first.EffectExecuted);
        Assert.Equal(FinancialIntentResultKind.Confirmed, second.Result.Kind);
        Assert.False(second.EffectExecuted);
        Assert.NotNull(second.Value);
        Assert.Equal(first.Value!.LedgerOperationId, second.Value!.LedgerOperationId);
        Assert.Equal(1, await CountAsync(scenario, "ledger_operations"));
        Assert.Equal(2, await CountAsync(scenario, "ledger_entries"));
        Assert.Equal(2, await CountAsync(scenario, "outbox_events"));
        Assert.Equal(9000, await ReadBalanceAsync(scenario, "account-origin"));
        Assert.Equal(1000, await ReadBalanceAsync(scenario, "account-dest"));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task TransferDifferentHashReturnsConflictWithoutWritingAnotherOperation()
    {
        var scenario = await CreateScenarioAsync();
        var request = new CreateTransferRequestDto("DEST-001", 10m, "test", "COP");

        _ = await scenario.Service.CreateTransferWithFinancialIntentAsync(
            scenario.Coordinator, "subject-origin", "transfer-key", "transfer-hash", request);
        var conflict = await scenario.Service.CreateTransferWithFinancialIntentAsync(
            scenario.Coordinator, "subject-origin", "transfer-key", "different-hash", request);

        Assert.Equal(FinancialIntentResultKind.IdentityConflict, conflict.Result.Kind);
        Assert.False(conflict.EffectExecuted);
        Assert.Equal(1, await CountAsync(scenario, "ledger_operations"));
        Assert.Equal(9000, await ReadBalanceAsync(scenario, "account-origin"));
        Assert.Equal(1000, await ReadBalanceAsync(scenario, "account-dest"));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task TransferConcurrentSameIntentConfirmsAtMostOneOperation()
    {
        var scenario = await CreateScenarioAsync();
        var request = new CreateTransferRequestDto("DEST-001", 10m, "test", "COP");

        var results = await Task.WhenAll(
            scenario.Service.CreateTransferWithFinancialIntentAsync(
                scenario.Coordinator, "subject-origin", "transfer-key", "transfer-hash", request),
            scenario.Service.CreateTransferWithFinancialIntentAsync(
                scenario.Coordinator, "subject-origin", "transfer-key", "transfer-hash", request));

        Assert.All(results, result => Assert.Equal(FinancialIntentResultKind.Confirmed, result.Result.Kind));
        Assert.Single(results.Select(result => result.Result.Intent!.OperationId).Distinct());
        Assert.Equal(1, await CountAsync(scenario, "ledger_operations"));
        Assert.Equal(9000, await ReadBalanceAsync(scenario, "account-origin"));
        Assert.Equal(1000, await ReadBalanceAsync(scenario, "account-dest"));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task TransferUnknownActorCreatesNoIntentOrFinancialEffect()
    {
        var scenario = await CreateScenarioAsync();
        var request = new CreateTransferRequestDto("DEST-001", 10m, "test", "COP");

        var result = await scenario.Service.CreateTransferWithFinancialIntentAsync(
            scenario.Coordinator, "subject-missing", "transfer-key", "transfer-hash", request);

        Assert.Equal(FinancialIntentResultKind.IdentityNotFound, result.Result.Kind);
        Assert.False(result.EffectExecuted);
        Assert.Equal(0, await CountAsync(scenario, "financial_intents"));
        Assert.Equal(0, await CountAsync(scenario, "ledger_operations"));
        Assert.Equal(10000, await ReadBalanceAsync(scenario, "account-origin"));
        Assert.Equal(0, await ReadBalanceAsync(scenario, "account-dest"));
    }

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
        var timeout = CallSettings.FromExpiration(Expiration.FromTimeout(TimeSpan.FromSeconds(30)));
        var instanceName = $"projects/{configuration.ProjectId}/instances/{configuration.InstanceId}";
        var databaseName = $"{instanceName}/databases/{configuration.DatabaseId}";
        var instanceAdmin = new InstanceAdminClientBuilder { EmulatorDetection = EmulatorDetection.EmulatorOnly }.Build();
        var databaseAdmin = new DatabaseAdminClientBuilder { EmulatorDetection = EmulatorDetection.EmulatorOnly }.Build();

        EnsureMissing(instanceAdmin, instanceName, timeout);
        var instance = instanceAdmin.CreateInstance(new CreateInstanceRequest
        {
            Parent = $"projects/{configuration.ProjectId}",
            InstanceId = configuration.InstanceId,
            Instance = new Instance
            {
                Name = instanceName,
                Config = $"projects/{configuration.ProjectId}/instanceConfigs/emulator-config",
                DisplayName = $"test {runId}",
                NodeCount = 1,
            },
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
            Statements =
            {
                CreateClients,
                "CREATE UNIQUE INDEX ux_transfer_client_subject ON clients(auth_subject)",
                CreateWallets,
                CreateDailyUsage,
                CreateOperations,
                CreateEntries,
                CreateOutbox,
                CreateIntents,
                "CREATE UNIQUE INDEX ux_transfer_intent_identity ON financial_intents(domain_actor_id, operation_type, scope, idempotency_key)",
                "CREATE UNIQUE NULL_FILTERED INDEX ux_transfer_intent_operation ON financial_intents(operation_id)",
            },
        }, timeout).PollUntilCompleted();
        Assert.False(ddl.IsFaulted);

        var builder = SpannerEmulatorConnectionFactory.CreateBuilder(configuration);
        await using (var connection = new SpannerConnection(builder))
        {
            await connection.OpenAsync();
            await ExecuteAsync(connection, "INSERT INTO clients (client_id, auth_subject, public_transfer_code, status, timezone) VALUES ('client-origin', 'subject-origin', 'ORIGIN-001', 'ACTIVE', 'America/Bogota')");
            await ExecuteAsync(connection, "INSERT INTO clients (client_id, auth_subject, public_transfer_code, status, timezone) VALUES ('client-dest', 'subject-dest', 'DEST-001', 'ACTIVE', 'America/Bogota')");
            await ExecuteAsync(connection, "INSERT INTO wallet_accounts (account_id, client_id, account_type, currency, current_balance_minor, status, version, updated_at) VALUES ('account-origin', 'client-origin', 'CLIENT_WALLET', 'COP', 10000, 'ACTIVE', 1, CURRENT_TIMESTAMP())");
            await ExecuteAsync(connection, "INSERT INTO wallet_accounts (account_id, client_id, account_type, currency, current_balance_minor, status, version, updated_at) VALUES ('account-dest', 'client-dest', 'CLIENT_WALLET', 'COP', 0, 'ACTIVE', 1, CURRENT_TIMESTAMP())");
        }

        var databaseResource = databaseName;
        var store = new SpannerFinancialIntentStore(() => new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(configuration)));
        var coordinator = new SpannerFinancialIntentCoordinator(
            () => new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(configuration)),
            store,
            new SpannerFinancialIdentityResolver());
        var service = new SpannerTransferService(
            new SpannerDb(databaseResource),
            NullLogger<SpannerTransferService>.Instance,
            () => new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(configuration)));
        return new Scenario(configuration, service, coordinator);
    }

    private static void EnsureMissing(InstanceAdminClient client, string name, CallSettings settings)
    {
        try { _ = client.GetInstance(new GetInstanceRequest { Name = name }, settings); }
        catch (Grpc.Core.RpcException ex) when (ex.StatusCode == Grpc.Core.StatusCode.NotFound) { return; }
        throw new InvalidOperationException($"Refusing to reuse instance '{name}'.");
    }

    private static void EnsureMissing(DatabaseAdminClient client, string name, CallSettings settings)
    {
        try { _ = client.GetDatabase(new GetDatabaseRequest { Name = name }, settings); }
        catch (Grpc.Core.RpcException ex) when (ex.StatusCode == Grpc.Core.StatusCode.NotFound) { return; }
        throw new InvalidOperationException($"Refusing to reuse database '{name}'.");
    }

    private static async Task ExecuteAsync(SpannerConnection connection, string sql)
    {
        await using var command = connection.CreateDmlCommand(sql);
        await command.ExecuteNonQueryAsync();
    }

    private static async Task<long> CountAsync(Scenario scenario, string table)
    {
        await using var connection = new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(scenario.Configuration));
        await connection.OpenAsync();
        await using var command = connection.CreateSelectCommand($"SELECT COUNT(*) FROM {table}");
        await using var reader = await command.ExecuteReaderAsync();
        await reader.ReadAsync();
        return reader.GetInt64(0);
    }

    private static async Task<long> ReadBalanceAsync(Scenario scenario, string accountId)
    {
        await using var connection = new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(scenario.Configuration));
        await connection.OpenAsync();
        await using var command = connection.CreateSelectCommand("SELECT current_balance_minor FROM wallet_accounts WHERE account_id=@id");
        command.Parameters.Add("id", SpannerDbType.String, accountId);
        await using var reader = await command.ExecuteReaderAsync();
        await reader.ReadAsync();
        return (long)reader.GetNumeric(0);
    }

    private sealed record Scenario(
        SpannerEmulatorTestConfiguration Configuration,
        SpannerTransferService Service,
        SpannerFinancialIntentCoordinator Coordinator);
}
