using System.ComponentModel.DataAnnotations;
using System.Globalization;
using Nequi.Finance.Common;

namespace Nequi.Finance.Cash;

public static class CashCollections
{
    /// <summary>Per-client authoritative summary of the personal cash register.</summary>
    public const string Accounts = "cash_accounts";

    /// <summary>Declared cash entries. Personal record only: never a bank/ledger movement.</summary>
    public const string Movements = "cash_movements";

    /// <summary>Idempotency guard documents (owner + Idempotency-Key).</summary>
    public const string Dedupe = "cash_dedupe";

    public const string Income = "income";
    public const string Expense = "expense";
}

public sealed record CreateCashMovementRequest(
    [Required(ErrorMessage = "La dirección es obligatoria.")]
    [RegularExpression("^(income|expense)$", ErrorMessage = "La dirección debe ser 'income' o 'expense'.")]
    string Direction,
    [Range(1, 1_000_000_000_000, ErrorMessage = "El monto debe ser un valor positivo en centavos de COP.")]
    long AmountCents,
    [StringLength(64, MinimumLength = 1)] string? CategoryId = null,
    [StringLength(140, ErrorMessage = "La nota no puede exceder 140 caracteres.")] string? Note = null,
    [RegularExpression(@"^\d{4}-\d{2}-\d{2}$", ErrorMessage = "La fecha debe usar el formato YYYY-MM-DD.")]
    string? OccurredOn = null);

public sealed record CashBalanceDto(
    long AvailableCents,
    long IncomeCents,
    long ExpenseCents,
    int MovementCount,
    string Currency,
    DateTimeOffset UpdatedAt);

public sealed record CashMovementDto(
    string Id,
    string Direction,
    long AmountCents,
    string? CategoryId,
    string? CategoryName,
    string? Note,
    string OccurredOn,
    long BalanceAfterCents,
    DateTimeOffset CreatedAt);

/// <summary>201 response: the stored entry plus the updated available cash.</summary>
public sealed record CashMovementCreatedDto(CashMovementDto Movement, CashBalanceDto Balance);

/// <summary>Summary document of the personal cash register. Never the wallet balance.</summary>
public sealed record CashAccountSnapshot(
    long AvailableCents,
    long IncomeCents,
    long ExpenseCents,
    int MovementCount,
    DateTimeOffset UpdatedAt)
{
    public static readonly CashAccountSnapshot Empty =
        new(0, 0, 0, 0, DateTimeOffset.UnixEpoch);
}

/// <summary>Entry prepared by the service; the store owns the atomic balance update.</summary>
public sealed record CashMovementDraft(
    string Id,
    string Direction,
    long AmountCents,
    string? CategoryId,
    string? CategoryName,
    string? Note,
    string OccurredOn,
    string DedupeKey,
    DateTimeOffset CreatedAt)
{
    public long SignedCents => Direction == CashCollections.Income ? AmountCents : -AmountCents;
}

public enum CashAppendOutcome { Created, Duplicate, InsufficientCash }

public sealed record CashAppendResult(
    CashAppendOutcome Outcome, CashMovementDto? Movement, CashAccountSnapshot Account);

internal static class CashDocuments
{
    public static CashMovementDto ToDto(string id, IDictionary<string, object?> d) => new(
        id,
        Str(d, "direction") ?? CashCollections.Income,
        ToLong(d, "amountCents"),
        Str(d, "categoryId"),
        Str(d, "categoryName"),
        Str(d, "note"),
        Str(d, "occurredOn") ?? "",
        ToLong(d, "balanceAfterCents"),
        ParseDate(Str(d, "createdAt")) ?? DateTimeOffset.UnixEpoch);

    public static Dictionary<string, object?> ToDocument(CashMovementDraft draft, long balanceAfterCents) => new()
    {
        ["id"] = draft.Id,
        ["direction"] = draft.Direction,
        ["amountCents"] = draft.AmountCents,
        ["signedCents"] = draft.SignedCents,
        ["categoryId"] = draft.CategoryId,
        ["categoryName"] = draft.CategoryName,
        ["note"] = draft.Note,
        ["occurredOn"] = draft.OccurredOn,
        ["balanceAfterCents"] = balanceAfterCents,
        ["dedupeKey"] = draft.DedupeKey,
        ["currency"] = "COP",
        ["createdAt"] = draft.CreatedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
    };

    public static Dictionary<string, object?> ToDocument(CashAccountSnapshot account, string owner) => new()
    {
        ["clientId"] = owner,
        ["availableCents"] = account.AvailableCents,
        ["incomeCents"] = account.IncomeCents,
        ["expenseCents"] = account.ExpenseCents,
        ["movementCount"] = account.MovementCount,
        ["currency"] = "COP",
        ["updatedAt"] = account.UpdatedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
    };

    public static CashAccountSnapshot ToSnapshot(IDictionary<string, object?> d) => new(
        ToLong(d, "availableCents"),
        ToLong(d, "incomeCents"),
        ToLong(d, "expenseCents"),
        (int)ToLong(d, "movementCount"),
        ParseDate(Str(d, "updatedAt")) ?? DateTimeOffset.UnixEpoch);

    public static long ToLong(IDictionary<string, object?> d, string key)
    {
        if (!d.TryGetValue(key, out var raw) || raw is null) return 0;
        try { return Convert.ToInt64(raw, CultureInfo.InvariantCulture); }
        catch (Exception e) when (e is FormatException or InvalidCastException or OverflowException) { return 0; }
    }

    public static string? Str(IDictionary<string, object?> d, string key) =>
        d.TryGetValue(key, out var v) && v is not null ? Convert.ToString(v, CultureInfo.InvariantCulture) : null;

    public static DateTimeOffset? ParseDate(string? value) =>
        DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed)
            ? parsed
            : null;
}

internal static class CashTime
{
    public static string TodayKey() =>
        FinanceTime.ToBusinessTime(DateTimeOffset.UtcNow).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    public static bool TryParseDate(string value, out DateOnly date) =>
        DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date);
}
