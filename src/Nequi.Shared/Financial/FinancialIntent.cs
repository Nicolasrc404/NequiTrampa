namespace Nequi.Shared.Financial;

/// <summary>
/// Durable business identity of a financial intention. The request hash is
/// deliberately not part of this identity; it validates that a retry carries
/// the same request as the original intention.
/// </summary>
public sealed record FinancialIntentIdentity
{
    public FinancialIntentIdentity(string domainActorId, string operationType, string scope, string idempotencyKey)
    {
        DomainActorId = Require(domainActorId, nameof(domainActorId));
        OperationType = Require(operationType, nameof(operationType));
        Scope = Require(scope, nameof(scope));
        IdempotencyKey = Require(idempotencyKey, nameof(idempotencyKey));
    }

    public string DomainActorId { get; }
    public string OperationType { get; }
    public string Scope { get; }
    public string IdempotencyKey { get; }

    private static string Require(string value, string name) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException("Value is required.", name)
            : value;
}

/// <summary>Financial state, independent from HTTP idempotency states.</summary>
public enum FinancialIntentStatus
{
    InProgress,
    Confirmed,
    FailedWithoutEffect,
    Uncertain,
    HistoricalUncorrelatable,
}

/// <summary>
/// Durable financial intention. Its identifier must remain stable when an
/// HTTP reservation expires or a request is retried.
/// </summary>
public sealed record FinancialIntent
{
    public FinancialIntent(
        string financialIntentId,
        string authenticatedActorId,
        FinancialIntentIdentity identity,
        string requestHash,
        FinancialIntentStatus financialStatus,
        DateTimeOffset createdAt,
        string? operationId = null,
        DateTimeOffset? confirmedAt = null)
    {
        FinancialIntentId = Require(financialIntentId, nameof(financialIntentId));
        AuthenticatedActorId = Require(authenticatedActorId, nameof(authenticatedActorId));
        Identity = identity ?? throw new ArgumentNullException(nameof(identity));
        RequestHash = Require(requestHash, nameof(requestHash));

        if (createdAt == default)
            throw new ArgumentException("Creation time is required.", nameof(createdAt));

        if (financialStatus == FinancialIntentStatus.Confirmed &&
            (string.IsNullOrWhiteSpace(operationId) || confirmedAt is null))
            throw new ArgumentException("A confirmed intent requires an operation and confirmation time.", nameof(financialStatus));

        if (financialStatus != FinancialIntentStatus.Confirmed && confirmedAt is not null)
            throw new ArgumentException("Only a confirmed intent can have a confirmation time.", nameof(confirmedAt));

        FinancialStatus = financialStatus;
        CreatedAt = createdAt;
        OperationId = operationId;
        ConfirmedAt = confirmedAt;
    }

    public string FinancialIntentId { get; }
    public string AuthenticatedActorId { get; }
    public FinancialIntentIdentity Identity { get; }
    public string RequestHash { get; }
    public string? OperationId { get; }
    public FinancialIntentStatus FinancialStatus { get; }
    public DateTimeOffset CreatedAt { get; }
    public DateTimeOffset? ConfirmedAt { get; }

    private static string Require(string value, string name) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException("Value is required.", name)
            : value;
}

/// <summary>
/// Resolution of a durable intention. These values are not HTTP responses;
/// HTTP filters may map them to their own existing protocol later.
/// </summary>
public enum FinancialIntentResultKind
{
    NewIntent,
    ExistingInProgress,
    Confirmed,
    IdentityConflict,
    FailedWithoutEffect,
    Uncertain,
    HistoricalUncorrelatable,
    StorageError,
}

public sealed record FinancialIntentResult(
    FinancialIntentResultKind Kind,
    FinancialIntent? Intent = null,
    string? ErrorCode = null)
{
    public static FinancialIntentResult New(FinancialIntent intent) =>
        new(FinancialIntentResultKind.NewIntent, RequireIntent(intent));

    public static FinancialIntentResult InProgress(FinancialIntent intent) =>
        new(FinancialIntentResultKind.ExistingInProgress, RequireIntent(intent));

    public static FinancialIntentResult Confirmed(FinancialIntent intent) =>
        new(FinancialIntentResultKind.Confirmed, RequireIntent(intent));

    public static FinancialIntentResult Conflict(FinancialIntent intent) =>
        new(FinancialIntentResultKind.IdentityConflict, RequireIntent(intent));

    public static FinancialIntentResult FailedWithoutEffect(FinancialIntent intent) =>
        new(FinancialIntentResultKind.FailedWithoutEffect, RequireIntent(intent));

    public static FinancialIntentResult Uncertain(FinancialIntent intent) =>
        new(FinancialIntentResultKind.Uncertain, RequireIntent(intent));

    public static FinancialIntentResult HistoricalUncorrelatable(FinancialIntent intent) =>
        new(FinancialIntentResultKind.HistoricalUncorrelatable, RequireIntent(intent));

    public static FinancialIntentResult StorageError(string errorCode) =>
        new(FinancialIntentResultKind.StorageError, null, RequireErrorCode(errorCode));

    private static FinancialIntent RequireIntent(FinancialIntent intent) =>
        intent ?? throw new ArgumentNullException(nameof(intent));

    private static string RequireErrorCode(string errorCode) =>
        string.IsNullOrWhiteSpace(errorCode)
            ? throw new ArgumentException("Error code is required.", nameof(errorCode))
            : errorCode;
}

/// <summary>
/// The data needed to confirm a financial intent with its ledger operation.
/// The implementation must persist both in one Spanner transaction.
/// </summary>
public sealed record FinancialIntentConfirmation
{
    public FinancialIntentConfirmation(string financialIntentId, string operationId)
    {
        FinancialIntentId = string.IsNullOrWhiteSpace(financialIntentId)
            ? throw new ArgumentException("Value is required.", nameof(financialIntentId))
            : financialIntentId;
        OperationId = string.IsNullOrWhiteSpace(operationId)
            ? throw new ArgumentException("Value is required.", nameof(operationId))
            : operationId;
    }

    public string FinancialIntentId { get; }
    public string OperationId { get; }
}

/// <summary>
/// Future transaction-aware boundary for durable intent correlation.
/// No implementation is introduced in this increment.
/// </summary>
public interface IFinancialIntentStore
{
    Task<FinancialIntentResult> GetAsync(FinancialIntentIdentity identity, CancellationToken ct);

    /// <summary>
    /// Atomically gets or creates the durable intention. A hash mismatch must
    /// be returned as <see cref="FinancialIntentResultKind.IdentityConflict"/>.
    /// </summary>
    Task<FinancialIntentResult> GetOrCreateAsync(
        FinancialIntentIdentity identity,
        string authenticatedActorId,
        string requestHash,
        CancellationToken ct);

    Task<FinancialIntentResult> GetOutcomeAsync(FinancialIntentIdentity identity, CancellationToken ct);

    /// <summary>
    /// Confirms the intent and writes the corresponding ledger operation,
    /// entries, balances and outbox event in the same Spanner transaction.
    /// There is intentionally no standalone AssociateOperationAsync method.
    /// </summary>
    Task<FinancialIntentResult> ConfirmWithLedgerAsync(
        FinancialIntentConfirmation confirmation,
        CancellationToken ct);
}
