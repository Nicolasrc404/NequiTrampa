using System.Buffers.Text;
using System.Text;

namespace Nequi.Finance.Common;

/// <summary>
/// Opaque keyset-pagination cursor shared by every Finance list endpoint that paginates an
/// unbounded, append-only history (financial movements, cash movements, ...). Encodes the
/// ordered field values of the last item of a page, joined with U+0001 (cannot appear in an
/// ISO-8601 timestamp, a GUID-shaped id or a YYYY-MM-DD date) and base64url'd (not standard
/// base64: a '+' surviving into a query string gets decoded as a space by anything following
/// application/x-www-form-urlencoded conventions unless the caller remembers to percent-encode
/// it, which silently corrupts the cursor) so it round-trips safely through a query string as-is.
/// </summary>
public static class KeysetCursor
{
    private const char Separator = '\u0001';

    public static string Encode(params string[] parts) =>
        Base64Url.EncodeToString(Encoding.UTF8.GetBytes(string.Join(Separator, parts)));

    /// <summary>Decodes a cursor expected to carry exactly <paramref name="partCount"/> non-empty parts.</summary>
    public static bool TryDecode(string cursor, int partCount, out string[] parts)
    {
        parts = [];
        if (!Base64Url.IsValid(cursor)) return false;
        try
        {
            var decoded = Encoding.UTF8.GetString(Base64Url.DecodeFromChars(cursor)).Split(Separator);
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
