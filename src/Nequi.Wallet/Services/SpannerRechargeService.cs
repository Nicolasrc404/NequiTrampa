using Google.Cloud.Spanner.Data;
using Google.Cloud.Spanner.V1;
using Microsoft.Extensions.Logging;
using Nequi.Shared.Data;
using Nequi.Shared.Events;
using Nequi.Wallet.DTOs;
using Nequi.Wallet.Exceptions;
using Nequi.Wallet.Interfaces;

namespace Nequi.Wallet.Services;

/// <summary>
/// Implementación autoritativa de <see cref="IRechargeService"/> respaldada por Google Cloud Spanner.
///
/// Flujo de una SIMULATED_RECHARGE (todo dentro de una única transacción read-write en Spanner):
///   1. Resolver identidades:
///      a. auth_subject → clients.client_id (estado ACTIVE).
///   2. Resolver cuenta CLIENT_WALLET del cliente (estado ACTIVE, currency = COP).
///   3. Resolver cuenta SYSTEM_FUNDING activa del sistema (account_type='SYSTEM_FUNDING', status='ACTIVE', currency='COP').
///   4. Calcular balances:
///      - SYSTEM_FUNDING: newSystemBalance = oldSystemBalance - amountMinor (permitido saldo negativo).
///      - CLIENT_WALLET: newClientBalance = oldClientBalance + amountMinor.
///   5. Generar operation_id (UUID) y public_reference única (prefijo RCG-...).
///   6. INSERT ledger_operations (type='SIMULATED_RECHARGE', status='COMPLETED', actor_id=clientId, actor_type='CLIENT').
///   7. INSERT ledger_entries x2 (entry 1 SYSTEM_FUNDING con delta negativo, entry 2 CLIENT_WALLET con delta positivo; delta1 + delta2 = 0).
///   8. UPDATE wallet_accounts x2 con optimistic locking (WHERE account_id=@id AND version=@ver, verificando filas afectadas == 1).
///   9. INSERT outbox_events x1 (aggregate_type='LEDGER_OPERATION', event_type='RECHARGE_COMPLETED', solo para el cliente).
///  10. Commit atómico.
/// </summary>
public sealed class SpannerRechargeService(SpannerDb db, ILogger<SpannerRechargeService> logger) : IRechargeService
{
    // =========================================================================
    // PUBLIC INTERFACE
    // =========================================================================

    /// <summary>
    /// Ejecuta una recarga simulada autoritativa en Cloud Spanner acreditando fondos
    /// desde SYSTEM_FUNDING hacia la CLIENT_WALLET del cliente.
    /// <paramref name="clientId"/> representa el auth_subject del token JWT.
    /// </summary>
    public async Task<RechargeResponseDto> CreateRechargeAsync(
        string clientId,
        string idempotencyKey,
        CreateRechargeRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var authSubject = clientId;

        if (request.Amount < 1_000m || request.Amount > 5_000_000m)
            throw new InvalidTransferAmountException("El monto mínimo de recarga es $1.000 COP y el máximo $5.000.000 COP.");

        var amountMinorDecimal = request.Amount * 100m;
        if (amountMinorDecimal % 1m != 0)
            throw new InvalidTransferAmountException("El monto en COP debe representar unidades menores enteras (máximo 2 decimales).");

        var amountMinor = checked((long)amountMinorDecimal);
        if (amountMinor <= 0)
            throw new InvalidTransferAmountException("El monto de la recarga debe ser superior a 0.");

        if (request.Currency != "COP")
            throw new InvalidCurrencyException("La moneda debe ser exclusivamente COP.");

        logger.LogInformation(
            "Iniciando SIMULATED_RECHARGE auth_subject={AuthSubject} amount_minor={AmountMinor} method={Method} key={Key}",
            authSubject, amountMinor, request.PaymentMethod, idempotencyKey);

        await using var conn = db.Open();
        RechargeResponseDto result = null!;

        await conn.RunWithRetriableTransactionAsync(async tx =>
        {
            // -----------------------------------------------------------------
            // 1. Resolver cliente por auth_subject
            // -----------------------------------------------------------------
            var clientDbId = await ResolveClientByAuthSubjectInTxAsync(conn, tx, authSubject, cancellationToken);

            // -----------------------------------------------------------------
            // 2. Resolver cuenta CLIENT_WALLET activa del cliente
            // -----------------------------------------------------------------
            var (clientAccountId, clientBalanceMinor, clientVersion) =
                await ReadClientWalletInTxAsync(conn, tx, clientDbId, cancellationToken);

            // -----------------------------------------------------------------
            // 3. Resolver cuenta SYSTEM_FUNDING activa del sistema
            // -----------------------------------------------------------------
            var (systemAccountId, systemBalanceMinor, systemVersion) =
                await ReadSystemFundingWalletInTxAsync(conn, tx, cancellationToken);

            // -----------------------------------------------------------------
            // 4. Calcular balances posteriores
            // -----------------------------------------------------------------
            var newSystemBalance = systemBalanceMinor - amountMinor;
            var newClientBalance = clientBalanceMinor + amountMinor;

            // -----------------------------------------------------------------
            // 5. Identificadores únicos
            // -----------------------------------------------------------------
            var operationId = Guid.NewGuid().ToString();
            var guidHex     = Guid.NewGuid().ToString("N")[..16].ToUpperInvariant();
            var publicRef   = $"RCG-{DateTime.UtcNow:yyyyMMdd}-{guidHex}";
            var eventId     = Guid.NewGuid().ToString();
            var occurredAt  = DateTimeOffset.UtcNow;

            // -----------------------------------------------------------------
            // 6. INSERT ledger_operations
            // -----------------------------------------------------------------
            await InsertLedgerOperationAsync(conn, tx,
                operationId, publicRef,
                clientDbId,
                amountMinor, request.Currency,
                request.PaymentMethod,
                idempotencyKey,
                cancellationToken);

            // -----------------------------------------------------------------
            // 7. INSERT ledger_entries x2 (entry 1 SYSTEM_FUNDING, entry 2 CLIENT_WALLET)
            // -----------------------------------------------------------------
            await InsertLedgerEntryAsync(conn, tx,
                operationId, entryNo: 1, systemAccountId,
                deltaMinor: -amountMinor,
                balanceBeforeMinor: systemBalanceMinor,
                balanceAfterMinor: newSystemBalance,
                cancellationToken);

            await InsertLedgerEntryAsync(conn, tx,
                operationId, entryNo: 2, clientAccountId,
                deltaMinor: amountMinor,
                balanceBeforeMinor: clientBalanceMinor,
                balanceAfterMinor: newClientBalance,
                cancellationToken);

            // -----------------------------------------------------------------
            // 8. UPDATE wallet_accounts x2 con optimistic locking
            // -----------------------------------------------------------------
            await UpdateWalletBalanceAsync(conn, tx,
                systemAccountId, newSystemBalance, systemVersion,
                "SYSTEM_FUNDING", cancellationToken);

            await UpdateWalletBalanceAsync(conn, tx,
                clientAccountId, newClientBalance, clientVersion,
                "CLIENT_WALLET", cancellationToken);

            // -----------------------------------------------------------------
            // 9. INSERT outbox_events x1 (solo para el cliente financiero)
            // -----------------------------------------------------------------
            var domainEvent = new DomainEvent(
                EventId: eventId,
                EventType: EventTypes.RechargeCompleted,
                OperationId: operationId,
                ClientId: clientDbId,
                OccurredAt: occurredAt,
                AmountCents: amountMinor,
                Currency: request.Currency,
                CounterpartyClientId: null,
                Description: $"Recarga simulada vía {request.PaymentMethod}",
                BalanceAfterCents: newClientBalance);

            await InsertOutboxEventAsync(conn, tx, eventId, operationId, domainEvent, cancellationToken);

            result = new RechargeResponseDto(
                RechargeId: publicRef,
                ClientId: clientDbId,
                Amount: request.Amount,
                AmountCents: amountMinor,
                Currency: request.Currency,
                PaymentMethod: request.PaymentMethod,
                Status: "COMPLETED",
                LedgerOperationId: operationId,
                Timestamp: occurredAt);

            logger.LogInformation(
                "SIMULATED_RECHARGE COMMITTED operation_id={OperationId} public_ref={PublicRef} client={ClientId} amount_minor={AmountMinor}",
                operationId, publicRef, clientDbId, amountMinor);
        });

        return result;
    }

    /// <summary>
    /// Consulta el listado histórico de recargas simuladas del cliente autenticado.
    /// <paramref name="clientId"/> representa el auth_subject del token JWT.
    /// </summary>
    public async Task<IReadOnlyList<RechargeResponseDto>> GetRechargesByClientIdAsync(
        string clientId,
        CancellationToken cancellationToken = default)
    {
        var authSubject = clientId;
        await using var conn = db.Open();
        var clientDbId = await ResolveClientByAuthSubjectAsync(conn, authSubject, cancellationToken);

        var cmd = conn.CreateSelectCommand(
            "SELECT " +
            "    lo.operation_id, " +
            "    lo.public_reference, " +
            "    lo.actor_id, " +
            "    lo.amount_minor, " +
            "    lo.currency, " +
            "    lo.reason, " +
            "    lo.status, " +
            "    lo.created_at, " +
            "    lo.confirmed_at " +
            "FROM ledger_operations lo " +
            "WHERE lo.actor_id = @clientId " +
            "  AND lo.type = 'SIMULATED_RECHARGE' " +
            "ORDER BY lo.created_at DESC");

        cmd.Parameters.Add("clientId", SpannerDbType.String, clientDbId);

        var results = new List<RechargeResponseDto>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var operationId = reader.GetString(0);
            var publicRef   = reader.GetString(1);
            var actorId     = reader.GetString(2);
            var amountNum   = reader.GetNumeric(3);
            var amountDec   = (decimal)amountNum;
            var currency    = reader.GetString(4);
            var reason      = reader.IsDBNull(5) ? null : reader.GetString(5);
            var status      = reader.GetString(6);
            var createdAt   = reader.GetFieldValue<DateTime>(7);
            var confirmedAt = reader.IsDBNull(8) ? (DateTime?)null : reader.GetFieldValue<DateTime>(8);

            var ts = new DateTimeOffset(DateTime.SpecifyKind(confirmedAt ?? createdAt, DateTimeKind.Utc));

            results.Add(new RechargeResponseDto(
                RechargeId: publicRef,
                ClientId: actorId,
                Amount: amountDec / 100m,
                AmountCents: checked((long)amountDec),
                Currency: currency,
                PaymentMethod: reason ?? "SIMULATED_PSE",
                Status: status,
                LedgerOperationId: operationId,
                Timestamp: ts));
        }

        return results;
    }

    // =========================================================================
    // PRIVATE — Resolvers de identidad y billeteras
    // =========================================================================

    private static async Task<string> ResolveClientByAuthSubjectInTxAsync(
        SpannerConnection conn, SpannerTransaction tx, string authSubject, CancellationToken ct)
    {
        var cmd = conn.CreateSelectCommand(
            "SELECT client_id, status FROM clients WHERE auth_subject = @authSubject");
        cmd.Transaction = tx;
        cmd.Parameters.Add("authSubject", SpannerDbType.String, authSubject);

        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct))
            throw new WalletNotFoundException("El cliente autenticado no fue encontrado en el sistema.");

        var clientId = r.GetString(0);
        var status   = r.GetString(1);

        if (status != "ACTIVE")
            throw new InactiveOriginException("El cliente autenticado se encuentra inactivo o bloqueado.");

        return clientId;
    }

    private static async Task<string> ResolveClientByAuthSubjectAsync(
        SpannerConnection conn, string authSubject, CancellationToken ct)
    {
        var cmd = conn.CreateSelectCommand(
            "SELECT client_id, status FROM clients WHERE auth_subject = @authSubject");
        cmd.Parameters.Add("authSubject", SpannerDbType.String, authSubject);

        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct))
            throw new WalletNotFoundException("El cliente autenticado no fue encontrado en el sistema.");

        var clientId = r.GetString(0);
        var status   = r.GetString(1);

        if (status != "ACTIVE")
            throw new InactiveOriginException("El cliente autenticado se encuentra inactivo o bloqueado.");

        return clientId;
    }

    private static async Task<(string AccountId, long BalanceMinor, long Version)> ReadClientWalletInTxAsync(
        SpannerConnection conn, SpannerTransaction tx, string clientId, CancellationToken ct)
    {
        var cmd = conn.CreateSelectCommand(
            "SELECT account_id, currency, current_balance_minor, status, version FROM wallet_accounts " +
            "WHERE client_id = @clientId AND account_type = 'CLIENT_WALLET'");
        cmd.Transaction = tx;
        cmd.Parameters.Add("clientId", SpannerDbType.String, clientId);

        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct))
            throw new WalletNotFoundException($"La cuenta CLIENT_WALLET para el cliente '{clientId}' no fue encontrada.");

        var accountId  = r.GetString(0);
        var currency   = r.GetString(1);
        var balanceNum = r.GetNumeric(2);
        var status     = r.GetString(3);
        var version    = r.GetInt64(4);

        if (status != "ACTIVE")
            throw new InactiveOriginException("La cuenta de billetera del cliente se encuentra inactiva o bloqueada.");

        if (currency != "COP")
            throw new InvalidCurrencyException($"La cuenta del cliente tiene moneda '{currency}', pero solo se permite COP.");

        var balanceDec = (decimal)balanceNum;
        if (balanceDec % 1m != 0 || balanceDec < 0)
            throw new InvalidOperationException(
                $"El saldo en Spanner para la cuenta '{accountId}' contiene un valor no entero o negativo: {balanceNum}.");

        return (accountId, checked((long)balanceDec), version);
    }

    private static async Task<(string AccountId, long BalanceMinor, long Version)> ReadSystemFundingWalletInTxAsync(
        SpannerConnection conn, SpannerTransaction tx, CancellationToken ct)
    {
        var cmd = conn.CreateSelectCommand(
            "SELECT account_id, current_balance_minor, version FROM wallet_accounts " +
            "WHERE account_type = 'SYSTEM_FUNDING' AND status = 'ACTIVE' AND currency = 'COP' " +
            "LIMIT 2");
        cmd.Transaction = tx;

        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct))
            throw new WalletNotFoundException("No se encontró una cuenta SYSTEM_FUNDING activa con moneda COP en el sistema.");

        var accountId  = r.GetString(0);
        var balanceNum = r.GetNumeric(1);
        var version    = r.GetInt64(2);

        if (await r.ReadAsync(ct))
            throw new InvalidOperationException("Inconsistencia en Spanner: se encontró más de una cuenta SYSTEM_FUNDING activa con moneda COP.");

        var balanceDec = (decimal)balanceNum;
        if (balanceDec % 1m != 0)
            throw new InvalidOperationException(
                $"El saldo en Spanner para SYSTEM_FUNDING '{accountId}' contiene un valor no entero: {balanceNum}.");

        return (accountId, checked((long)balanceDec), version);
    }

    // =========================================================================
    // PRIVATE — Escrituras dentro de transacción
    // =========================================================================

    private static async Task InsertLedgerOperationAsync(
        SpannerConnection conn, SpannerTransaction tx,
        string operationId, string publicReference,
        string actorId,
        long amountMinor, string currency,
        string? reason, string idempotencyKey,
        CancellationToken ct)
    {
        var cmd = conn.CreateDmlCommand(
            "INSERT INTO ledger_operations " +
            "(operation_id, public_reference, type, status, " +
            " actor_id, actor_type, " +
            " amount_minor, currency, idempotency_key, original_operation_id, reason, " +
            " created_at, confirmed_at, updated_at) " +
            "VALUES (@opId, @pubRef, 'SIMULATED_RECHARGE', 'COMPLETED', " +
            "        @actorId, 'CLIENT', " +
            "        @amountMinor, @currency, @idempotencyKey, NULL, @reason, " +
            "        CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())");
        cmd.Transaction = tx;
        cmd.Parameters.Add("opId",           SpannerDbType.String,  operationId);
        cmd.Parameters.Add("pubRef",         SpannerDbType.String,  publicReference);
        cmd.Parameters.Add("actorId",        SpannerDbType.String,  actorId);
        cmd.Parameters.Add("amountMinor",    SpannerDbType.Numeric, SpannerNumeric.Parse(amountMinor.ToString()));
        cmd.Parameters.Add("currency",       SpannerDbType.String,  currency);
        cmd.Parameters.Add("idempotencyKey", SpannerDbType.String,  idempotencyKey);
        cmd.Parameters.Add("reason",         SpannerDbType.String,  reason ?? (object)DBNull.Value);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task InsertLedgerEntryAsync(
        SpannerConnection conn, SpannerTransaction tx,
        string operationId, int entryNo, string accountId,
        long deltaMinor, long balanceBeforeMinor, long balanceAfterMinor,
        CancellationToken ct)
    {
        var cmd = conn.CreateDmlCommand(
            "INSERT INTO ledger_entries " +
            "(operation_id, entry_no, account_id, " +
            " delta_minor, balance_before_minor, balance_after_minor, created_at) " +
            "VALUES (@opId, @entryNo, @accId, " +
            "        @delta, @balBefore, @balAfter, CURRENT_TIMESTAMP())");
        cmd.Transaction = tx;
        cmd.Parameters.Add("opId",      SpannerDbType.String,  operationId);
        cmd.Parameters.Add("entryNo",   SpannerDbType.Int64,   (long)entryNo);
        cmd.Parameters.Add("accId",     SpannerDbType.String,  accountId);
        cmd.Parameters.Add("delta",     SpannerDbType.Numeric, SpannerNumeric.Parse(deltaMinor.ToString()));
        cmd.Parameters.Add("balBefore", SpannerDbType.Numeric, SpannerNumeric.Parse(balanceBeforeMinor.ToString()));
        cmd.Parameters.Add("balAfter",  SpannerDbType.Numeric, SpannerNumeric.Parse(balanceAfterMinor.ToString()));
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task UpdateWalletBalanceAsync(
        SpannerConnection conn, SpannerTransaction tx,
        string accountId, long newBalanceMinor, long expectedVersion,
        string accountType,
        CancellationToken ct)
    {
        var cmd = conn.CreateDmlCommand(
            "UPDATE wallet_accounts " +
            "SET current_balance_minor = @newBalance, " +
            "    version = version + 1, " +
            "    updated_at = CURRENT_TIMESTAMP() " +
            "WHERE account_id = @accountId AND version = @expectedVersion");
        cmd.Transaction = tx;
        cmd.Parameters.Add("newBalance",      SpannerDbType.Numeric, SpannerNumeric.Parse(newBalanceMinor.ToString()));
        cmd.Parameters.Add("accountId",       SpannerDbType.String,  accountId);
        cmd.Parameters.Add("expectedVersion", SpannerDbType.Int64,   expectedVersion);
        var rows = await cmd.ExecuteNonQueryAsync(ct);

        if (rows != 1)
            throw new ConcurrencyConflictException(
                $"Conflicto de concurrencia al actualizar la cuenta {accountType} '{accountId}'. Versión esperada: {expectedVersion}.");
    }

    private static async Task InsertOutboxEventAsync(
        SpannerConnection conn, SpannerTransaction tx,
        string eventId, string operationId,
        DomainEvent evt,
        CancellationToken ct)
    {
        var cmd = conn.CreateDmlCommand(
            "INSERT INTO outbox_events " +
            "(event_id, aggregate_id, aggregate_type, event_type, payload, " +
            " created_at, pending_since, published_at, attempts, last_error) " +
            "VALUES (@eventId, @aggregateId, 'LEDGER_OPERATION', @eventType, @payload, " +
            "        CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), NULL, 0, NULL)");
        cmd.Transaction = tx;
        cmd.Parameters.Add("eventId",     SpannerDbType.String, eventId);
        cmd.Parameters.Add("aggregateId", SpannerDbType.String, operationId);
        cmd.Parameters.Add("eventType",   SpannerDbType.String, evt.EventType);
        cmd.Parameters.Add("payload",     SpannerDbType.Json,   evt.ToJson());
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
