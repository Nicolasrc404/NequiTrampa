using System.Globalization;
using Nequi.Shared.Data;

namespace Nequi.Finance.Common;

/// <summary>
/// Confirmed financial movement as projected from the authoritative Spanner ledger.
/// AmountCents keeps the signed delta convention: positive = income, negative = expense.
/// </summary>
public sealed record ConfirmedMovement(
    string EventId,
    string? OperationId,
    string? CategoryId,
    string? Description,
    long AmountCents,
    DateTimeOffset OccurredAt)
{
    public long IncomeCents => AmountCents > 0 ? AmountCents : 0;
    public long ExpenseCents => AmountCents < 0 ? -AmountCents : 0;
}

/// <summary>
/// Reads only COMPLETED movements from the Firestore projection. Pending / failed / unknown
/// states are excluded so budgets and analytics never mix confirmed figures with projections.
/// Firestore is a read model; Spanner remains the financial authority.
/// </summary>
public sealed class MovementReader(IDocumentStore docs)
{
    public const string Collection = "financial_movements";

    /// <summary>Upper bound for a single personal query. Documented limit; avoids unbounded scans.</summary>
    public const int MaxScan = 5_000;

    public async Task<IReadOnlyList<ConfirmedMovement>> ReadConfirmedAsync(string clientId, CancellationToken ct)
    {
        var rows = await docs.QueryEqualsAsync(Collection, "clientId", clientId, MaxScan, ct);
        return Map(rows);
    }

    public static IReadOnlyList<ConfirmedMovement> Map(IReadOnlyList<IDictionary<string, object?>> rows)
    {
        var result = new List<ConfirmedMovement>(rows.Count);
        foreach (var row in rows)
        {
            var status = Str(row, "status");
            if (!string.Equals(status, "COMPLETED", StringComparison.OrdinalIgnoreCase)) continue;

            var sync = Str(row, "syncStatus");
            if (sync is not null &&
                (string.Equals(sync, "PENDING", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(sync, "FAILED", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(sync, "IN_PROGRESS", StringComparison.OrdinalIgnoreCase)))
                continue;

            if (!TryParseOccurredAt(Str(row, "occurredAt"), out var occurredAt)) continue;
            if (!TryAmount(row, out var amountCents)) continue;

            var eventId = Str(row, "eventId") ?? "";
            result.Add(new ConfirmedMovement(
                eventId,
                Str(row, "operationId"),
                Str(row, "categoryId"),
                Str(row, "description"),
                amountCents,
                occurredAt));
        }

        return result;
    }

    public static bool TryParseOccurredAt(string? value, out DateTimeOffset occurredAt)
    {
        occurredAt = default;
        if (string.IsNullOrWhiteSpace(value)) return false;
        return DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out occurredAt);
    }

    private static bool TryAmount(IDictionary<string, object?> row, out long amountCents)
    {
        amountCents = 0;
        if (!row.TryGetValue("amountCents", out var raw) || raw is null) return false;
        try
        {
            amountCents = Convert.ToInt64(raw, CultureInfo.InvariantCulture);
            return true;
        }
        catch (Exception e) when (e is FormatException or InvalidCastException or OverflowException)
        {
            return false;
        }
    }

    private static string? Str(IDictionary<string, object?> d, string key) =>
        d.TryGetValue(key, out var v) && v is not null ? Convert.ToString(v, CultureInfo.InvariantCulture) : null;
}
