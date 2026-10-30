using Google.Cloud.Spanner.Data;

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

/// <summary>Input for one durable financial-intent execution.</summary>
public sealed record FinancialIntentExecutionRequest
{
    public FinancialIntentExecutionRequest(
        FinancialIntentIdentity identity,
        string authenticatedActorId,
        string requestHash)
    {
        Identity = identity ?? throw new ArgumentNullException(nameof(identity));
        AuthenticatedActorId = Require(authenticatedActorId, nameof(authenticatedActorId));
        RequestHash = Require(requestHash, nameof(requestHash));
    }

    public FinancialIntentIdentity Identity { get; }
    public string AuthenticatedActorId { get; }
    public string RequestHash { get; }

    private static string Require(string value, string name) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException("Value is required.", name)
            : value;
}

/// <summary>
/// Shared Spanner transaction supplied by the financial coordinator.
/// The transaction must remain open until the financial effect and the intent
/// confirmation have both been written.
/// </summary>
public sealed class FinancialIntentTransactionContext
{
    public FinancialIntentTransactionContext(
        SpannerConnection connection,
        SpannerTransaction transaction,
        FinancialIntent intent)
    {
        Connection = connection ?? throw new ArgumentNullException(nameof(connection));
        Transaction = transaction ?? throw new ArgumentNullException(nameof(transaction));
        Intent = intent ?? throw new ArgumentNullException(nameof(intent));

        if (string.IsNullOrWhiteSpace(intent.OperationId))
            throw new ArgumentException("A transaction context requires a stable operation ID.", nameof(intent));
    }

    public SpannerConnection Connection { get; }
    public SpannerTransaction Transaction { get; }
    public FinancialIntent Intent { get; }
}

/// <summary>
/// Legacy value object retained for source compatibility. It is not a
/// confirmation API; confirmation must use ConfirmInTransactionAsync.
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
/// Transaction-aware persistence boundary for durable financial intentions.
/// It intentionally has no public create operation outside a shared financial
/// transaction.
/// </summary>
public interface IFinancialIntentStore
{
    Task<FinancialIntentResult> GetAsync(FinancialIntentIdentity identity, CancellationToken ct);

    Task<FinancialIntentResult> GetOutcomeAsync(FinancialIntentIdentity identity, CancellationToken ct);

    /// <summary>
    /// Gets or inserts the durable intention inside the supplied financial
    /// transaction. A hash mismatch must return <see
    /// cref="FinancialIntentResultKind.IdentityConflict"/>. The caller must
    /// execute the ledger effect and confirm the intent before committing this
    /// same transaction.
    /// </summary>
    Task<FinancialIntentResult> GetOrCreateInTransactionAsync(
        FinancialIntentTransactionContext transaction,
        FinancialIntentIdentity identity,
        string authenticatedActorId,
        string requestHash,
        string financialIntentId,
        string operationId,
        CancellationToken ct);

    /// <summary>
    /// Marks the newly created intent as confirmed inside the transaction that
    /// also contains the ledger operation, entries, balances and outbox event.
    /// This method must never be called as a second transaction after a ledger
    /// commit.
    /// </summary>
    Task<FinancialIntentResult> ConfirmInTransactionAsync(
        FinancialIntentTransactionContext transaction,
        string financialIntentId,
        string operationId,
        CancellationToken ct);
}

/// <summary>
/// Coordinates the durable intent and the complete financial effect in one
/// retryable Spanner transaction. Existing confirmed intents must be returned
/// without invoking <paramref name="effect"/>.
/// </summary>
public interface IFinancialIntentCoordinator
{
    Task<FinancialIntentExecutionResult<T>> ExecuteAsync<T>(
        FinancialIntentExecutionRequest request,
        Func<FinancialIntentTransactionContext, CancellationToken, Task<T>> effect,
        CancellationToken ct);
}

public sealed record FinancialIntentExecutionResult<T>(
    FinancialIntentResult Result,
    T? Value,
    bool EffectExecuted);
