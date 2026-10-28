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
    private static string EncodeCursor(string occurredAt, string eventId) =>
        KeysetCursor.Encode(occurredAt, eventId);

    private static bool TryDecodeCursor(string cursor, out string occurredAt, out string eventId)
    {
        occurredAt = ""; eventId = "";
        if (!KeysetCursor.TryDecode(cursor, 2, out var parts)) return false;
        occurredAt = parts[0]; eventId = parts[1];
        return true;
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
            // 3. Limit validation (explicit 400 for out-of-range values)
            // ---------------------------------------------------------------
            var pageSize = limit ?? DefaultLimit;
            if (pageSize < 1 || pageSize > MaxLimit)
                return Problems.Problem(ctx, 400, "Bad Request",
                    $"limit must be between 1 and {MaxLimit}.", "invalid_limit");

            string? afterOccurredAt = null, afterEventId = null;
            if (!string.IsNullOrEmpty(cursor) && !TryDecodeCursor(cursor, out afterOccurredAt, out afterEventId))
                return Problems.Problem(ctx, 400, "Bad Request", "Invalid cursor.", "invalid_cursor");

            // ---------------------------------------------------------------
            // 4. Query: WHERE clientId = owner ORDER BY occurredAt DESC, eventId DESC
            //    keyset-paginated after the previous page's last (occurredAt, eventId).
            //    Fetch one extra row to know whether another page follows.
            // ---------------------------------------------------------------
            var rows = await docs.QueryOrderedPageAsync(
                FinancialMovements, "clientId", owner,
                OccurredAtField, EventIdField, pageSize + 1,
                afterOccurredAt, afterEventId, ctx.RequestAborted);

            var hasMore = rows.Count > pageSize;
            var items = rows.Take(pageSize).Select(MovementDto.From).ToList();

            string? nextCursor = null;
            if (hasMore && items.Count > 0)
            {
                var last = items[^1];
                if (last.OccurredAt is { } occurredAt && last.EventId is { } eventId)
                    nextCursor = EncodeCursor(occurredAt, eventId);
            }

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
