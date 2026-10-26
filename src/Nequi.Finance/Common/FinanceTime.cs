using System.Globalization;

namespace Nequi.Finance.Common;

/// <summary>
/// Business timezone for personal finance periods. The platform stores UTC timestamps but
/// budgets, goals and analytics periods are resolved in the client's business timezone.
/// Configurable at deployment; defaults to America/Bogota (COP business calendar).
/// </summary>
public static class FinanceTime
{
    public const string DefaultTimeZoneId = "America/Bogota";

    private static readonly TimeZoneInfo DefaultZone = Resolve(DefaultTimeZoneId);

    public static TimeZoneInfo Resolve(string? iana)
    {
        var id = string.IsNullOrWhiteSpace(iana) ? DefaultTimeZoneId : iana;
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(id);
        }
        catch (TimeZoneNotFoundException)
        {
            // Windows does not expose IANA ids in all hosts; fall back to the SAPacific zone.
            if (id.Equals(DefaultTimeZoneId, StringComparison.OrdinalIgnoreCase))
            {
                try { return TimeZoneInfo.FindSystemTimeZoneById("SA Pacific Standard Time"); }
                catch { return TimeZoneInfo.Utc; }
            }
            return TimeZoneInfo.Utc;
        }
        catch (InvalidTimeZoneException)
        {
            return TimeZoneInfo.Utc;
        }
    }

    public static DateTimeOffset ToBusinessTime(DateTimeOffset value) =>
        TimeZoneInfo.ConvertTime(value, DefaultZone);
}

/// <summary>Half-open monthly period [start, end) in the business timezone.</summary>
public sealed record MonthPeriod(int Year, int Month, DateTimeOffset StartInclusive, DateTimeOffset EndExclusive)
{
    public string Key => $"{Year:D4}-{Month:D2}";
    public int DaysInMonth => DateTime.DaysInMonth(Year, Month);

    public static bool TryParse(string? value, out MonthPeriod period)
    {
        period = null!;
        if (string.IsNullOrWhiteSpace(value)) return false;
        var parts = value.Split('-');
        if (parts.Length != 2 || parts[0].Length != 4 || parts[1].Length != 2) return false;
        if (!int.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out var year)) return false;
        if (!int.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var month)) return false;
        if (year is < 2000 or > 2100 || month is < 1 or > 12) return false;

        var zone = FinanceTime.Resolve(FinanceTime.DefaultTimeZoneId);
        var startLocal = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Unspecified);
        var endLocal = startLocal.AddMonths(1);
        period = new MonthPeriod(
            year,
            month,
            new DateTimeOffset(startLocal, zone.GetUtcOffset(startLocal)).ToUniversalTime(),
            new DateTimeOffset(endLocal, zone.GetUtcOffset(endLocal)).ToUniversalTime());
        return true;
    }

    public MonthPeriod Previous => TryParse(new DateTime(Year, Month, 1).AddMonths(-1).ToString("yyyy-MM", CultureInfo.InvariantCulture), out var p)
        ? p
        : throw new InvalidOperationException("Invalid previous period.");

    public int WeekOfMonth(DateTimeOffset businessTime) => Math.Min(5, ((businessTime.Day - 1) / 7) + 1);

    public int WeekCount => Math.Min(5, ((DaysInMonth - 1) / 7) + 1);

    public int DaysRemaining(DateTimeOffset nowLocal)
    {
        if (nowLocal.Year != Year || nowLocal.Month != Month) return 0;
        return Math.Max(0, DaysInMonth - nowLocal.Day + 1);
    }
}
