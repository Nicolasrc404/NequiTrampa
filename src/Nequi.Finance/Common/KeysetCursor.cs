using System.Text;

namespace Nequi.Finance.Common;

/// <summary>
/// Opaque keyset-pagination cursor shared by every Finance list endpoint that paginates an
/// unbounded, append-only history (financial movements, cash movements, ...). Encodes the
/// ordered field values of the last item of a page, joined with U+0001 (cannot appear in an
/// ISO-8601 timestamp, a GUID-shaped id or a YYYY-MM-DD date) and base64'd so it round-trips
/// safely through a query string.
/// </summary>
public static class KeysetCursor
{
    private const char Separator = '';

    public static string Encode(params string[] parts) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(string.Join(Separator, parts)));

    /// <summary>Decodes a cursor expected to carry exactly <paramref name="partCount"/> non-empty parts.</summary>
    public static bool TryDecode(string cursor, int partCount, out string[] parts)
    {
        parts = [];
        try
        {
            var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(cursor)).Split(Separator);
            if (decoded.Length != partCount || decoded.Any(p => p.Length == 0)) return false;
            parts = decoded;
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
