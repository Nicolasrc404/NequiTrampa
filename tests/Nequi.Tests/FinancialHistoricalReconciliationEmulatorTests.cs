using Google.Cloud.Spanner.Data;
using Nequi.Backoffice.Services;
using Nequi.Shared.Data;
using Nequi.Shared.Financial;
using Nequi.Wallet.DTOs;
using Nequi.Wallet.Services;

namespace Nequi.Tests;

public sealed class FinancialHistoricalReconciliationEmulatorTests
{
    private const string TransferScope = "POST:/v1/transfers";

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task ConfirmedIntentAndLedgerAreClassifiedAsCorrelated()
    {
        var scenario = await SpannerTransferFinancialIntentEmulatorTests.CreateScenarioAsync();
        var request = new CreateTransferRequestDto("DEST-001", 10m, "test", "COP");
        var execution = await scenario.Service.CreateTransferWithFinancialIntentAsync(
            scenario.Coordinator, "subject-origin", "reconcile-key", "reconcile-hash", request);

        var result = await CreateClassifier(scenario).ClassifyAsync(
            new FinancialReconciliationQuery("subject-origin", TransferScope, "reconcile-key", "reconcile-hash"),
            CancellationToken.None);

        Assert.Equal(FinancialReconciliationClassification.ConfirmedCorrelated, result.Classification);
        Assert.True(result.CanReplay);
        Assert.False(result.RequiresManualReview);
        Assert.Contains(execution.Result.Intent!.FinancialIntentId, result.AvailableIdentifiers);
        Assert.Contains(execution.Result.Intent.OperationId!, result.AvailableIdentifiers);
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task CompletedHistoricalLedgerWithoutIntentRemainsBlocked()
    {
        var scenario = await SpannerTransferFinancialIntentEmulatorTests.CreateScenarioAsync();
        var operationId = Guid.NewGuid().ToString();
        await InsertOperationAsync(scenario, operationId, "historical-key");

        var result = await CreateClassifier(scenario).ClassifyAsync(
            new FinancialReconciliationQuery("subject-origin", TransferScope, "historical-key"),
            CancellationToken.None);

        Assert.Equal(FinancialReconciliationClassification.ConfirmedHistoricalUncorrelatable, result.Classification);
        Assert.False(result.CanReplay);
        Assert.True(result.RequiresManualReview);
        Assert.Contains(operationId, result.AvailableIdentifiers);
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task UncertainIntentRemainsBlocked()
    {
        var scenario = await SpannerTransferFinancialIntentEmulatorTests.CreateScenarioAsync();
        await ExecuteAsync(scenario, "INSERT INTO financial_intents " +
            "(financial_intent_id, authenticated_actor_id, domain_actor_id, operation_type, scope, idempotency_key, request_hash, financial_status, created_at) " +
            "VALUES (@id, 'subject-origin', 'client-origin', 'TRANSFER', @scope, 'uncertain-key', 'uncertain-hash', 'UNCERTAIN', CURRENT_TIMESTAMP())",
            ("id", Guid.NewGuid().ToString()), ("scope", TransferScope));

        var result = await CreateClassifier(scenario).ClassifyAsync(
            new FinancialReconciliationQuery("subject-origin", TransferScope, "uncertain-key", "uncertain-hash"),
            CancellationToken.None);

        Assert.Equal(FinancialReconciliationClassification.Uncertain, result.Classification);
        Assert.False(result.CanReplay);
        Assert.True(result.RequiresManualReview);
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task MissingFinancialEvidenceIsNotTreatedAsAFailedOperation()
    {
        var scenario = await SpannerTransferFinancialIntentEmulatorTests.CreateScenarioAsync();

        var result = await CreateClassifier(scenario).ClassifyAsync(
            new FinancialReconciliationQuery("subject-origin", TransferScope, "unknown-key"),
            CancellationToken.None);

        Assert.Equal(FinancialReconciliationClassification.ReservationMissingOrExpired, result.Classification);
        Assert.False(result.CanReplay);
        Assert.True(result.RequiresManualReview);
        Assert.Equal("reservation_missing_without_durable_confirmation", result.Reason);
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task RequestHashMismatchIsInconsistentAndCannotReplay()
    {
        var scenario = await SpannerTransferFinancialIntentEmulatorTests.CreateScenarioAsync();
        var request = new CreateTransferRequestDto("DEST-001", 10m, "test", "COP");
        _ = await scenario.Service.CreateTransferWithFinancialIntentAsync(
            scenario.Coordinator, "subject-origin", "hash-key", "stored-hash", request);

        var result = await CreateClassifier(scenario).ClassifyAsync(
            new FinancialReconciliationQuery("subject-origin", TransferScope, "hash-key", "different-hash"),
            CancellationToken.None);

        Assert.Equal(FinancialReconciliationClassification.Inconsistent, result.Classification);
        Assert.False(result.CanReplay);
        Assert.Equal("financial_intent_hash_mismatch", result.Reason);
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task DifferentAuthenticatedActorCannotReconcileAnotherActorsOperation()
    {
        var scenario = await SpannerTransferFinancialIntentEmulatorTests.CreateScenarioAsync();
        var request = new CreateTransferRequestDto("DEST-001", 10m, "test", "COP");
        _ = await scenario.Service.CreateTransferWithFinancialIntentAsync(
            scenario.Coordinator, "subject-origin", "actor-key", "actor-hash", request);

        var result = await CreateClassifier(scenario).ClassifyAsync(
            new FinancialReconciliationQuery("subject-dest", TransferScope, "actor-key", "actor-hash"),
            CancellationToken.None);

        Assert.Equal(FinancialReconciliationClassification.ReservationMissingOrExpired, result.Classification);
        Assert.False(result.CanReplay);
        Assert.Empty(result.AvailableIdentifiers);
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task MultipleCompletedLedgerRowsAreInconsistent()
    {
        var scenario = await SpannerTransferFinancialIntentEmulatorTests.CreateScenarioAsync();
        await InsertOperationAsync(scenario, Guid.NewGuid().ToString(), "duplicate-key");
        await InsertOperationAsync(scenario, Guid.NewGuid().ToString(), "duplicate-key");

        var result = await CreateClassifier(scenario).ClassifyAsync(
            new FinancialReconciliationQuery("subject-origin", TransferScope, "duplicate-key"),
            CancellationToken.None);

        Assert.Equal(FinancialReconciliationClassification.Inconsistent, result.Classification);
        Assert.False(result.CanReplay);
        Assert.True(result.RequiresManualReview);
    }

    private static FinancialReconciliationClassifier CreateClassifier(SpannerTransferFinancialIntentEmulatorTests.Scenario scenario) =>
        new(() => new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(scenario.Configuration)));

    private static async Task InsertOperationAsync(SpannerTransferFinancialIntentEmulatorTests.Scenario scenario, string operationId, string key) =>
        await ExecuteAsync(scenario,
            "INSERT INTO ledger_operations " +
            "(operation_id, public_reference, type, status, actor_id, actor_type, amount_minor, currency, idempotency_key, created_at, confirmed_at, updated_at) " +
            "VALUES (@id, @reference, 'INTERNAL_TRANSFER', 'COMPLETED', 'client-origin', 'CLIENT', 1000, 'COP', @key, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())",
            ("id", operationId), ("reference", $"TRF-{operationId[..8]}"), ("key", key));

    private static async Task ExecuteAsync(SpannerTransferFinancialIntentEmulatorTests.Scenario scenario, string sql, params (string Name, object Value)[] parameters)
    {
        await using var connection = new SpannerConnection(SpannerEmulatorConnectionFactory.CreateBuilder(scenario.Configuration));
        await connection.OpenAsync();
        await using var command = connection.CreateDmlCommand(sql);
        foreach (var (name, value) in parameters)
            command.Parameters.Add(name, SpannerDbType.String, value);
        await command.ExecuteNonQueryAsync();
    }
}
