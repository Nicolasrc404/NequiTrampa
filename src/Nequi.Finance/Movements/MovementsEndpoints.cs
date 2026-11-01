using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Nequi.Finance.Common;
using Nequi.Shared.Data;
using Nequi.Shared.Http;
using Nequi.Shared.Security;

namespace Nequi.Finance.Movements;

// ---------------------------------------------------------------------------
// DTO
// ---------------------------------------------------------------------------

/// <summary>
/// Controlled read model for a single financial movement.
/// Amounts are integer cents (COP). No float/double.
/// Source: financial_movements Firestore collection (projection of Spanner events).
/// Firestore is NOT the financial authority - Cloud Spanner is.
/// </summary>
public sealed record MovementDto(
    string? EventId,
    string? OperationId,
    string? Type,
    long AmountCents,
    string? Currency,
    string? CounterpartyClientId,
    string? Description,
    long? BalanceAfterCents,
    string? OccurredAt,
    string? SyncStatus,
    string? Status,
    string? CategoryId = null)
{
    /// <summary>Maps a Firestore document dictionary to the DTO. Unknown fields are ignored.</summary>
    public static MovementDto From(IDictionary<string, object?> d)
    {
        static string? Str(IDictionary<string, object?> d, string k) =>
            d.TryGetValue(k, out var v) ? v?.ToString() : null;

        static long Long(IDictionary<string, object?> d, string k) =>
            d.TryGetValue(k, out var v) && v is not null
                ? Convert.ToInt64(v)
                : 0L;

        static long? NullableLong(IDictionary<string, object?> d, string k) =>
            d.TryGetValue(k, out var v) && v is not null
                ? Convert.ToInt64(v)
                : null;

        return new MovementDto(
            EventId: Str(d, "eventId"),
            OperationId: Str(d, "operationId"),
            Type: Str(d, "type"),
            AmountCents: Long(d, "amountCents"),
            Currency: Str(d, "currency"),
            CounterpartyClientId: Str(d, "counterpartyClientId"),
            Description: Str(d, "description"),
            BalanceAfterCents: NullableLong(d, "balanceAfterCents"),
            OccurredAt: Str(d, "occurredAt"),
            SyncStatus: Str(d, "syncStatus"),
            Status: Str(d, "status"),
            CategoryId: Str(d, "categoryId"));
    }
}

// ---------------------------------------------------------------------------
// Cursor
// ---------------------------------------------------------------------------

/// <summary>
/// Opaque pagination cursor: base64url(JSON{occurredAt, eventId}) of the last item of a page.
/// eventId is the Firestore document id, used as deterministic tie-break for equal occurredAt.
/// </summary>
public static class MovementsCursor
{
    private sealed record Payload(string O, string I);

    public static string Encode(string occurredAt, string eventId) =>
        WebEncoders.Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(new Payload(occurredAt, eventId)));

    public static bool TryDecode(string? cursor, out string occurredAt, out string eventId)
    {
        occurredAt = "";
        eventId = "";
        if (string.IsNullOrWhiteSpace(cursor)) return false;
        try
        {
            var payload = JsonSerializer.Deserialize<Payload>(WebEncoders.Base64UrlDecode(cursor));
            if (payload is null || string.IsNullOrWhiteSpace(payload.O) || string.IsNullOrWhiteSpace(payload.I))
                return false;
            occurredAt = payload.O;
            eventId = payload.I;
            return true;
        }
        catch (Exception e) when (e is FormatException or JsonException or ArgumentException)
        {
            return false;
        }
    }
}

// ---------------------------------------------------------------------------
// Endpoint
// ---------------------------------------------------------------------------

/// <summary>
/// Read-side: financial movements history from Firestore (projection / read model).
/// Firestore is NOT the financial authority - Cloud Spanner is.
///
/// Access policy:
///   CLIENTE          - reads only their own movements; cannot specify a different clientId.
///   SOPORTE          - may specify an explicit clientId to investigate a case.
///   OPERADOR_FINANCIERO - may specify an explicit clientId to investigate operations.
///   ADMIN            - this endpoint is client-oriented; ADMIN does not get financial
///                      read access here (use backoffice endpoints for that).
/// </summary>
public static class MovementsEndpoints
{
    private const string FinancialMovements = "financial_movements";
    private const string OccurredAtField = "occurredAt";
    private const string EventIdField = "eventId";
    private const int DefaultLimit = 50;
    private const int MaxLimit = 200;
    // Cursor wire format: KeysetCursor, shared with the other Finance list endpoints.
    // Cursors issued before this merge (MovementsCursor JSON payload) are still accepted.
    private static string EncodeCursor(string occurredAt, string eventId) =>
        KeysetCursor.Encode(occurredAt, eventId);

    private static bool TryDecodeCursor(string cursor, out string occurredAt, out string eventId)
    {
        occurredAt = ""; eventId = "";
        if (KeysetCursor.TryDecode(cursor, 2, out var parts))
        {
            occurredAt = parts[0]; eventId = parts[1];
            return true;
        }
        return MovementsCursor.TryDecode(cursor, out occurredAt, out eventId);
    }

    // Roles that may query movements for any clientId (investigation / backoffice).
    private static readonly HashSet<string> FinancialStaff =
        [Roles.Soporte, Roles.OperadorFinanciero];

    public static void MapMovements(this IEndpointRouteBuilder app)
    {
        // GET /v1/movements
        // Deny-by-default: any authenticated user can reach this, but resource-level
        // enforcement below ensures clients only see their own data.
        app.MapGet("/v1/movements", async (
            HttpContext ctx,
            string? clientId,
            int? limit,
            string? cursor,
            IDocumentStore docs,
            ClientIdentityResolver identities) =>
        {
            // ---------------------------------------------------------------
            // 1. Identity
            // ---------------------------------------------------------------
            var user = CurrentUser.From(ctx.User);
            if (user is null)
                return Problems.Problem(ctx, 401, "Unauthorized",
                    "Valid authentication is required.", "unauthenticated");

            // ---------------------------------------------------------------
            // 2. clientId resolution and authorization
            //
            // Two identifiers exist in this system:
            //   - user.Uid   : Firebase UID / auth subject (from user_id / sub claim)
            //   - user.ClientId : domain clientId from financial context (from client_id claim)
            //
            // For CLIENTE: owner = user.ClientId (from claim 'client_id').
            //              Cannot override via ?clientId= query string.
            //              Missing claim -> HTTP 400 (no financial context in token).
            // For SOPORTE / OPERADOR_FINANCIERO: may pass ?clientId= to investigate.
            // For ADMIN: HTTP 403 (use backoffice endpoints).
            // ---------------------------------------------------------------
            bool isFinancialStaff = FinancialStaff.Overlaps(user.Roles);
            bool isClient = user.Roles.Contains(Roles.Cliente);

            if (!isClient && !isFinancialStaff)
                return Problems.Problem(ctx, 403, "Forbidden",
                    "This endpoint is not available for your role.", "forbidden");

            string owner;
            if (isClient)
            {
                // El claim 'client_id' es el camino normal. Si falta (token antiguo o sin
                // custom claim), se resuelve auth_subject → clients.client_id en Spanner.
                // Nunca se usa el auth subject como client_id: si no hay cliente ACTIVE
                // vinculado, la solicitud se rechaza en lugar de consultar datos ajenos.
                var resolved = await identities.ResolveAsync(user, ctx.RequestAborted);
                if (string.IsNullOrWhiteSpace(resolved))
                    return Problems.Problem(ctx, 400, "Bad Request",
                        "No client context found for this identity. Ensure an ACTIVE client is linked to the auth subject.",
                        "missing_client_id");
                owner = resolved;
            }
            else
            {
                // Staff: require explicit clientId to avoid accidental full-collection scans.
                if (string.IsNullOrWhiteSpace(clientId))
                    return Problems.Problem(ctx, 400, "Bad Request",
                        "Staff must provide ?clientId= to query movements.", "clientid_required");
                owner = clientId;
            }

            // ---------------------------------------------------------------
            // 3. Limit + cursor validation (explicit 400 for out-of-range values)
            // ---------------------------------------------------------------
            var pageSize = limit ?? DefaultLimit;
            if (pageSize < 1 || pageSize > MaxLimit)
                return Problems.Problem(ctx, 400, "Bad Request",
                    $"limit must be between 1 and {MaxLimit}.", "invalid_limit");

            string? afterOccurredAt = null, afterEventId = null;
            if (!string.IsNullOrWhiteSpace(cursor) &&
                !TryDecodeCursor(cursor, out afterOccurredAt, out afterEventId))
                return Problems.Problem(ctx, 400, "Bad Request",
                    "cursor is not a valid pagination cursor returned by this endpoint.", "invalid_cursor");

            // ---------------------------------------------------------------
            // 4. Query: WHERE clientId = owner ORDER BY occurredAt DESC, eventId ASC LIMIT n+1
            //    (one extra row only to decide whether nextCursor exists)
            // ---------------------------------------------------------------
            var rows = await docs.QueryOrderedAfterAsync(
                FinancialMovements, "clientId", owner,
                OccurredAtField, afterOccurredAt, afterEventId, pageSize + 1, ctx.RequestAborted);

            var page = rows.Take(pageSize).ToList();
            string? nextCursor = null;
            if (rows.Count > pageSize && page.Count > 0)
            {
                var last = page[^1];
                var occurredAt = last.TryGetValue(OccurredAtField, out var o) ? o?.ToString() : null;
                var eventId = last.TryGetValue(EventIdField, out var e) ? e?.ToString() : null;
                // Legacy projections without eventId cannot be paginated deterministically.
                if (!string.IsNullOrEmpty(occurredAt) && !string.IsNullOrEmpty(eventId))
                    nextCursor = EncodeCursor(occurredAt, eventId);
            }

            var items = page.Select(MovementDto.From).ToList();

            return Results.Ok(new
            {
                clientId = owner,
                count = items.Count,
                limit = pageSize,
                nextCursor,
                items,
            });
        }).RequireAuthorization();
    }
}
