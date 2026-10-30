using Google.Api.Gax;
using Google.Api.Gax.Grpc;
using Google.Cloud.Spanner.Admin.Database.V1;
using Google.Cloud.Spanner.Admin.Instance.V1;
using Google.Cloud.Spanner.Data;
using Grpc.Core;
using Nequi.Shared.Data;
using Nequi.Shared.Financial;
using Nequi.Wallet.DTOs;
using Nequi.Wallet.Services;

namespace Nequi.Tests;

public sealed class ConfirmedTransferRecoveryEmulatorTests
{
    private const string CreateClients = """
        CREATE TABLE clients (
          client_id STRING(36) NOT NULL,
          auth_subject STRING(128) NOT NULL,
          public_transfer_code STRING(20) NOT NULL,
          status STRING(16) NOT NULL,
        ) PRIMARY KEY(client_id)
        """;

    private const string CreateClientIndex =
        "CREATE UNIQUE INDEX ux_recovery_client_subject ON clients(auth_subject)";

    private const string CreateWallets = """
        CREATE TABLE wallet_accounts (
          account_id STRING(36) NOT NULL,
          client_id STRING(36) NOT NULL,
          current_balance_minor NUMERIC NOT NULL,
        ) PRIMARY KEY(account_id)
        """;

    private const string CreateOperations = """
        CREATE TABLE ledger_operations (
          operation_id STRING(36) NOT NULL,
          public_reference STRING(32) NOT NULL,
          type STRING(24) NOT NULL,
          status STRING(16) NOT NULL,
          actor_id STRING(36) NOT NULL,
          amount_minor NUMERIC NOT NULL,
          currency STRING(3) NOT NULL,
          idempotency_key STRING(64),
          reason STRING(500),
          created_at TIMESTAMP NOT NULL,
          confirmed_at TIMESTAMP,
        ) PRIMARY KEY(operation_id)
        """;

    private const string CreateEntries = """
        CREATE TABLE ledger_entries (
          operation_id STRING(36) NOT NULL,
          entry_no INT64 NOT NULL,
          account_id STRING(36) NOT NULL,
          delta_minor NUMERIC NOT NULL,
        ) PRIMARY KEY(operation_id, entry_no)
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

    private const string CreateHttpReservations = """
        CREATE TABLE idempotency_records (
          actor_id STRING(36) NOT NULL,
          scope STRING(64) NOT NULL,
          idempotency_key STRING(64) NOT NULL,
          request_hash STRING(64) NOT NULL,
          status STRING(16) NOT NULL,
          created_at TIMESTAMP NOT NULL,
        ) PRIMARY KEY(actor_id, scope, idempotency_key)
        """;

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task ConfirmedIntentAndValidLedgerAreRecoveredReadOnly()
    {
        var scenario = await CreateScenarioAsync("CONFIRMED", includeLedger: true);
        var before = await CountAsync(scenario, "ledger_operations");

        var result = await scenario.Service.RecoverAsync(
            "subject-origin", "transfer-key", "request-hash", Request(), CancellationToken.None);

        Assert.Equal(TransferRecoveryKind.Recovered, result.Kind);
        Assert.Equal("TRF-RECOVERY-001", result.Response!.TransferId);
        Assert.Equal("operation-recovery", result.Response.LedgerOperationId);
        Assert.Equal(before, await CountAsync(scenario, "ledger_operations"));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task HashMismatchReturnsConflictWithoutFinancialWrites()
    {
        var scenario = await CreateScenarioAsync("CONFIRMED", includeLedger: true);

        var result = await scenario.Service.RecoverAsync(
            "subject-origin", "transfer-key", "different-hash", Request(), CancellationToken.None);

        Assert.Equal(TransferRecoveryKind.Conflict, result.Kind);
        Assert.Equal(1, await CountAsync(scenario, "ledger_operations"));
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task InProgressIntentIsBlockedEvenWhenLedgerExists()
    {
        var scenario = await CreateScenarioAsync("IN_PROGRESS", includeLedger: true);

        var result = await scenario.Service.RecoverAsync(
            "subject-origin", "transfer-key", "request-hash", Request(), CancellationToken.None);

        Assert.Equal(TransferRecoveryKind.RecoveryBlocked, result.Kind);
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task ConfirmedIntentWithoutMatchingLedgerIsBlocked()
    {
        var scenario = await CreateScenarioAsync("CONFIRMED", includeLedger: false);

        var result = await scenario.Service.RecoverAsync(
            "subject-origin", "transfer-key", "request-hash", Request(), CancellationToken.None);

        Assert.Equal(TransferRecoveryKind.RecoveryBlocked, result.Kind);
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task DifferentAuthenticatedActorCannotRecoverTheIntent()
    {
        var scenario = await CreateScenarioAsync("CONFIRMED", includeLedger: true);

        var result = await scenario.Service.RecoverAsync(
            "subject-other", "transfer-key", "request-hash", Request(), CancellationToken.None);

        Assert.Equal(TransferRecoveryKind.RecoveryBlocked, result.Kind);
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task ExpiredHttpReservationDoesNotRemoveDurableProtection()
    {
        var scenario = await CreateScenarioAsync("CONFIRMED", includeLedger: true, includeHttpReservation: false);

        var result = await scenario.Service.RecoverAsync(
            "subject-origin", "transfer-key", "request-hash", Request(), CancellationToken.None);

        Assert.Equal(TransferRecoveryKind.Recovered, result.Kind);
        Assert.Equal("operation-recovery", result.Response!.LedgerOperationId);
    }

    private static CreateTransferRequestDto Request() =>
        new("DEST-001", 10m, "test", "COP");

    private static async Task<Scenario> CreateScenarioAsync(
        string status,
        bool includeLedger,
        bool includeHttpReservation = true)
    {
        var runId = Guid.NewGuid().ToString("N")[..12];
        var environment = new Dictionary<string, string?>
        {
            ["SPANNER_EMULATOR_HOST"] = Environment.GetEnvironmentVariable("SPANNER_EMULATOR_HOST"),
        };
        if (Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS") is not null)
            environment["GOOGLE_APPLICATION_CREDENTIALS"] = "present";

        var configuration = SpannerEmulatorTestConfiguration.Create(
            environment, $"test-{runId}-project", $"test-{runId}-instance", $"test-{runId}-database", runId);
        if (configuration.EmulatorHost != "127.0.0.1:9010")
            throw new InvalidOperationException("Recovery tests require the local emulator.");

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

        var statements = new List<string> { CreateClients, CreateClientIndex, CreateWallets, CreateOperations, CreateEntries, CreateIntents, CreateHttpReservations,
            "CREATE UNIQUE INDEX ux_recovery_intent_identity ON financial_intents(domain_actor_id, operation_type, scope, idempotency_key)",
            "CREATE UNIQUE NULL_FILTERED INDEX ux_recovery_intent_operation ON financial_intents(operation_id)" };
        var ddlRequest = new UpdateDatabaseDdlRequest { Database = databaseName };
        ddlRequest.Statements.AddRange(statements);
        var ddl = databaseAdmin.UpdateDatabaseDdl(ddlRequest, timeout).PollUntilCompleted();
        Assert.False(ddl.IsFaulted);

        await using var connection = await OpenAsync(configuration);
        await ExecuteAsync(connection, "INSERT INTO clients (client_id, auth_subject, public_transfer_code, status) VALUES ('client-origin', 'subject-origin', 'ORIGIN-001', 'ACTIVE')");
        await ExecuteAsync(connection, "INSERT INTO clients (client_id, auth_subject, public_transfer_code, status) VALUES ('client-dest', 'subject-other', 'DEST-001', 'ACTIVE')");
        await ExecuteAsync(connection, "INSERT INTO wallet_accounts (account_id, client_id, current_balance_minor) VALUES ('account-origin', 'client-origin', 100000)");
        await ExecuteAsync(connection, "INSERT INTO wallet_accounts (account_id, client_id, current_balance_minor) VALUES ('account-dest', 'client-dest', 0)");
        await ExecuteAsync(connection, $"INSERT INTO financial_intents (financial_intent_id, authenticated_actor_id, domain_actor_id, operation_type, scope, idempotency_key, request_hash, operation_id, financial_status, created_at, confirmed_at) VALUES ('intent-recovery', 'subject-origin', 'client-origin', 'TRANSFER', 'POST:/v1/transfers', 'transfer-key', 'request-hash', 'operation-recovery', '{status}', CURRENT_TIMESTAMP(), {(status == "CONFIRMED" ? "CURRENT_TIMESTAMP()" : "NULL")})");
        if (includeHttpReservation)
            await ExecuteAsync(connection, "INSERT INTO idempotency_records (actor_id, scope, idempotency_key, request_hash, status, created_at) VALUES ('subject-origin', 'POST:/v1/transfers', 'transfer-key', 'request-hash', 'IN_PROGRESS', CURRENT_TIMESTAMP())");
        if (includeLedger)
        {
            await ExecuteAsync(connection, "INSERT INTO ledger_operations (operation_id, public_reference, type, status, actor_id, amount_minor, currency, idempotency_key, reason, created_at, confirmed_at) VALUES ('operation-recovery', 'TRF-RECOVERY-001', 'INTERNAL_TRANSFER', 'COMPLETED', 'client-origin', 1000, 'COP', 'transfer-key', 'test', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())");
            await ExecuteAsync(connection, "INSERT INTO ledger_entries (operation_id, entry_no, account_id, delta_minor) VALUES ('operation-recovery', 1, 'account-origin', -1000)");
            await ExecuteAsync(connection, "INSERT INTO ledger_entries (operation_id, entry_no, account_id, delta_minor) VALUES ('operation-recovery', 2, 'account-dest', 1000)");
        }

        var factory = () => new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(configuration));
        var store = new SpannerFinancialIntentStore(factory);
        var resolver = new SpannerFinancialIdentityResolver();
        return new Scenario(new ConfirmedTransferRecoveryService(factory, store, resolver), factory);
    }

    private static async Task<SpannerConnection> OpenAsync(SpannerEmulatorTestConfiguration configuration)
    {
        var connection = new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(configuration));
        await connection.OpenAsync();
        return connection;
    }

    private static async Task ExecuteAsync(SpannerConnection connection, string sql)
    {
        await using var command = connection.CreateDmlCommand(sql);
        await command.ExecuteNonQueryAsync();
    }

    private static async Task<long> CountAsync(Scenario scenario, string table)
    {
        await using var connection = scenario.ConnectionFactory();
        await connection.OpenAsync();
        await using var command = connection.CreateSelectCommand($"SELECT COUNT(*) FROM {table}");
        await using var reader = await command.ExecuteReaderAsync();
        Assert.True(await reader.ReadAsync());
        return reader.GetInt64(0);
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

    private sealed record Scenario(
        ConfirmedTransferRecoveryService Service,
        Func<SpannerConnection> ConnectionFactory);
}
