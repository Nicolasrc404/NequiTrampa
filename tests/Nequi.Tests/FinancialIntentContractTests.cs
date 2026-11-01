using Nequi.Shared.Financial;
using Nequi.Shared.Idempotency;

namespace Nequi.Tests;

public sealed class FinancialIntentContractTests
{
    private static readonly DateTimeOffset CreatedAt = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    [Fact]
    public void DurableIdentity_IsEqualOnlyForTheSameActorOperationScopeAndKey()
    {
        var first = new FinancialIntentIdentity("client-1", "TRANSFER", "POST:/v1/transfers", "key-1");
        var retry = new FinancialIntentIdentity("client-1", "TRANSFER", "POST:/v1/transfers", "key-1");
        var differentScope = new FinancialIntentIdentity("client-1", "TRANSFER", "POST:/v1/recharges", "key-1");

        Assert.Equal(first, retry);
        Assert.NotEqual(first, differentScope);
    }

    [Fact]
    public void RequestHash_IsSeparateFromDurableIdentity()
    {
        var identity = new FinancialIntentIdentity("client-1", "TRANSFER", "POST:/v1/transfers", "key-1");
        var intent = CreateIntent(identity, "hash-a");
        var incompatibleRetry = CreateIntent(identity, "hash-b");

        Assert.Equal(intent.Identity, incompatibleRetry.Identity);
        Assert.NotEqual(intent.RequestHash, incompatibleRetry.RequestHash);
        Assert.Equal(FinancialIntentResultKind.IdentityConflict,
            FinancialIntentResult.Conflict(intent).Kind);
    }

    [Fact]
    public void AuthenticatedActor_IsRetainedSeparatelyFromDomainActor()
    {
        var identity = new FinancialIntentIdentity("client-1", "RECHARGE", "POST:/v1/recharges", "key-1");
        var intent = CreateIntent(identity, "hash", authenticatedActorId: "subject-1");

        Assert.Equal("subject-1", intent.AuthenticatedActorId);
        Assert.Equal("client-1", intent.Identity.DomainActorId);
        Assert.NotEqual(intent.AuthenticatedActorId, intent.Identity.DomainActorId);
    }

    [Fact]
    public void FinancialStatus_UsesFinancialContractInsteadOfHttpOutcome()
    {
        var intent = CreateIntent(
            new FinancialIntentIdentity("client-1", "TRANSFER", "scope", "key-1"),
            "hash");

        Assert.IsType<FinancialIntentStatus>(intent.FinancialStatus);
        Assert.Equal(FinancialIntentStatus.InProgress, intent.FinancialStatus);
        Assert.IsType<FinancialIntentResultKind>(FinancialIntentResult.InProgress(intent).Kind);
        Assert.Equal(FinancialIntentResultKind.ExistingInProgress, FinancialIntentResult.InProgress(intent).Kind);
        Assert.DoesNotContain("Replay", Enum.GetNames<FinancialIntentStatus>());
        Assert.DoesNotContain("Conflict", Enum.GetNames<FinancialIntentStatus>());
    }

    [Fact]
    public void ConfirmedIntent_RequiresOperationAndConfirmationTime()
    {
        var identity = new FinancialIntentIdentity("client-1", "TRANSFER", "scope", "key-1");

        Assert.Throws<ArgumentException>(() => new FinancialIntent(
            "intent-1", "subject-1", identity, "hash", FinancialIntentStatus.Confirmed, CreatedAt));

        var confirmed = new FinancialIntent(
            "intent-1", "subject-1", identity, "hash", FinancialIntentStatus.Confirmed, CreatedAt,
            operationId: "operation-1", confirmedAt: CreatedAt.AddMinutes(1));

        Assert.Equal("intent-1", confirmed.FinancialIntentId);
        Assert.Equal("operation-1", confirmed.OperationId);
    }

    [Fact]
    public void ResultKinds_DistinguishUncertainFromStorageFailure()
    {
        var intent = CreateIntent(new FinancialIntentIdentity("client-1", "TRANSFER", "scope", "key-1"), "hash");

        Assert.Equal(FinancialIntentResultKind.Uncertain, FinancialIntentResult.Uncertain(intent).Kind);
        Assert.Equal(FinancialIntentResultKind.StorageError, FinancialIntentResult.StorageError("spanner_unavailable").Kind);
        Assert.Null(FinancialIntentResult.StorageError("spanner_unavailable").Intent);
    }

    [Fact]
    public void Identity_RejectsMissingRequiredValues()
    {
        Assert.Throws<ArgumentException>(() => new FinancialIntentIdentity("", "TRANSFER", "scope", "key"));
        Assert.Throws<ArgumentException>(() => new FinancialIntentIdentity("client", "", "scope", "key"));
        Assert.Throws<ArgumentException>(() => new FinancialIntentIdentity("client", "TRANSFER", "", "key"));
        Assert.Throws<ArgumentException>(() => new FinancialIntentIdentity("client", "TRANSFER", "scope", ""));
    }

    [Fact]
    public void ConfirmWithLedgerContract_RequiresBothIntentAndOperationIds()
    {
        var confirmation = new FinancialIntentConfirmation("intent-1", "operation-1");

        Assert.Equal("intent-1", confirmation.FinancialIntentId);
        Assert.Equal("operation-1", confirmation.OperationId);
        Assert.Throws<ArgumentException>(() => new FinancialIntentConfirmation("", "operation-1"));
        Assert.Throws<ArgumentException>(() => new FinancialIntentConfirmation("intent-1", ""));
    }

    private static FinancialIntent CreateIntent(
        FinancialIntentIdentity identity,
        string requestHash,
        string authenticatedActorId = "subject-1") =>
        new("intent-1", authenticatedActorId, identity, requestHash,
            FinancialIntentStatus.InProgress, CreatedAt);
}
