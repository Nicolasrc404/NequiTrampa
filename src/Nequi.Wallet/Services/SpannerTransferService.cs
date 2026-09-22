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
/// Implementación autoritativa de <see cref="ITransferService"/> respaldada por Google Cloud Spanner.
///
/// Flujo de una INTERNAL_TRANSFER (todo dentro de una única transacción read-write en Spanner):
///   1. Resolver identidades:
///      a. auth_subject → clients.client_id (origen, estado ACTIVE, timezone).
///      b. public_transfer_code → clients.client_id (destino, estado ACTIVE).
///      c. Validar origen != destino.
///   2. Resolver cuentas CLIENT_WALLET ACTIVE para origen y destino; validar currency = COP.
///   3. Validar saldo suficiente en origen (amountMinor <= originBalanceMinor).
///   4. Calcular local_day usando clients.timezone del cliente origen (convertido a DATE de Spanner).
///   5. Validar y actualizar daily_transfer_usage transaccionalmente (outgoing_total_minor + amount <= $5.000.000 COP).
///   6. Generar operation_id (UUID) y public_reference única (máximo 32 caracteres).
///   7. INSERT ledger_operations (type='INTERNAL_TRANSFER', status='COMPLETED', actor_id=originClientId, actor_type='CLIENT').
///   8. INSERT ledger_entries x2 (entry_no=1 débito origen con delta negativo, entry_no=2 crédito destino con delta positivo).
///   9. UPDATE wallet_accounts x2 con optimistic locking (WHERE account_id=@id AND version=@ver, verificando filas afectadas == 1).
///  10. INSERT outbox_events x2 (uno por cliente: aggregate_type='LEDGER_OPERATION', event_type='TRANSFER_COMPLETED', payload JSON).
///
/// DDL fuente de verdad verificada en GCP (full-stack-2026 / finanzas-mvp / finanzas-core).
/// Dinero: NUMERIC en Spanner (100 minor = 1 COP) → long en C#. Nunca float/double.
/// Idempotencia: delegada al IdempotencyActionFilter; ledger_operations.idempotency_key almacena la clave recibida.
/// </summary>
public sealed class SpannerTransferService(SpannerDb db, ILogger<SpannerTransferService> logger) : ITransferService
{
    // -------------------------------------------------------------------------
    // Límites físicos (en unidades menores: 100 minor = 1 COP)
    // -------------------------------------------------------------------------
    private const long MaxTransferMinor = 200_000_000L;   // $2.000.000 COP
    private const long MaxDailyMinor    = 500_000_000L;   // $5.000.000 COP

    // =========================================================================
    // PUBLIC INTERFACE
    // =========================================================================

    /// <summary>
    /// Ejecuta una transferencia interna autoritativa en Cloud Spanner.
    /// <paramref name="originClientId"/> es el auth_subject del token JWT del cliente autenticado.
    /// </summary>
    public async Task<TransferResponseDto> CreateTransferAsync(
        string originClientId,
        string idempotencyKey,
        CreateTransferRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var originAuthSubject = originClientId;

        if (request.Amount <= 0 || request.Amount > 2_000_000m)
            throw new TransferLimitExceededException("El monto de la transferencia supera el límite individual permitido ($2.000.000 COP).");

        var amountMinorDecimal = request.Amount * 100m;
        if (amountMinorDecimal % 1m != 0)
            throw new InvalidTransferAmountException("El monto en COP debe representar unidades menores enteras (máximo 2 decimales).");

        var amountMinor = checked((long)amountMinorDecimal);
        if (amountMinor <= 0 || amountMinor > MaxTransferMinor)
            throw new TransferLimitExceededException("El monto de la transferencia supera el límite individual permitido ($2.000.000 COP).");

        if (request.Currency != "COP")
            throw new InvalidCurrencyException("La única moneda autorizada en el sistema es COP.");

        logger.LogInformation(
            "Iniciando INTERNAL_TRANSFER origin_auth={OriginAuth} dest_code={DestCode} amount_minor={AmountMinor} key={Key}",
            originAuthSubject, request.DestinationTransferCode, amountMinor, idempotencyKey);

        await using var conn = db.Open();

        TransferResponseDto result = null!;

        await conn.RunWithRetriableTransactionAsync(async tx =>
        {
            // -----------------------------------------------------------------
            // 1. Resolver identidades dentro de la transacción
            // -----------------------------------------------------------------
            var (originClientDbId, originTransferCode, originTimezone) =
                await ResolveOriginClientInTxAsync(conn, tx, originAuthSubject, cancellationToken);

            var (destinationClientDbId, destinationTransferCode) =
                await ResolveDestinationClientInTxAsync(conn, tx, request.DestinationTransferCode, cancellationToken);

            if (originClientDbId == destinationClientDbId)
                throw new SelfTransferException("El destinatario de la transferencia no puede ser el mismo cliente origen.");

            // -----------------------------------------------------------------
            // 2. Leer y validar wallets de origen y destino
            // -----------------------------------------------------------------
            var (originAccountId, originBalanceMinor, originVersion) =
                await ReadWalletInTxAsync(conn, tx, originClientDbId, isOrigin: true, cancellationToken);

            var (destinationAccountId, destinationBalanceMinor, destinationVersion) =
                await ReadWalletInTxAsync(conn, tx, destinationClientDbId, isOrigin: false, cancellationToken);

            // -----------------------------------------------------------------
            // 3. Validar saldo suficiente
            // -----------------------------------------------------------------
            if (amountMinor > originBalanceMinor)
                throw new InsufficientFundsException();

            // -----------------------------------------------------------------
            // 4. Calcular local_day y validar/actualizar daily_transfer_usage
            // -----------------------------------------------------------------
            var localDayDate = GetClientLocalDate(originTimezone);
            var spannerLocalDay = new SpannerDate(localDayDate.Year, localDayDate.Month, localDayDate.Day);

            await CheckAndUpdateDailyUsageInTxAsync(conn, tx, originClientDbId, spannerLocalDay, amountMinor, cancellationToken);

            // -----------------------------------------------------------------
            // 5. Identificadores únicos
            // -----------------------------------------------------------------
            var operationId   = Guid.NewGuid().ToString();
            var publicRef     = $"TRF-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..24].ToUpperInvariant();
            var eventIdOrigin = Guid.NewGuid().ToString();
            var eventIdDest   = Guid.NewGuid().ToString();
            var occurredAt    = DateTimeOffset.UtcNow;

            var newOriginBalance      = originBalanceMinor - amountMinor;
            var newDestinationBalance = destinationBalanceMinor + amountMinor;

            // -----------------------------------------------------------------
            // 6. INSERT ledger_operations
            // -----------------------------------------------------------------
            await InsertLedgerOperationAsync(conn, tx,
                operationId, publicRef,
                originClientDbId,
                amountMinor, request.Currency,
                request.Description,
                idempotencyKey,
                cancellationToken);

            // -----------------------------------------------------------------
            // 7. INSERT ledger_entries (entry_no=1 débito, entry_no=2 crédito)
            // -----------------------------------------------------------------
            await InsertLedgerEntryAsync(conn, tx,
                operationId, entryNo: 1, originAccountId,
                deltaMinor: -amountMinor,
                balanceBeforeMinor: originBalanceMinor,
                balanceAfterMinor: newOriginBalance,
                cancellationToken);

            await InsertLedgerEntryAsync(conn, tx,
                operationId, entryNo: 2, destinationAccountId,
                deltaMinor: amountMinor,
                balanceBeforeMinor: destinationBalanceMinor,
                balanceAfterMinor: newDestinationBalance,
                cancellationToken);

            // -----------------------------------------------------------------
            // 8. UPDATE wallet_accounts x2 (optimistic lock por version)
            // -----------------------------------------------------------------
            await UpdateWalletBalanceAsync(conn, tx,
                originAccountId, newOriginBalance, originVersion,
                cancellationToken);

            await UpdateWalletBalanceAsync(conn, tx,
                destinationAccountId, newDestinationBalance, destinationVersion,
                cancellationToken);

            // -----------------------------------------------------------------
            // 9. INSERT outbox_events x2 (aggregate_type='LEDGER_OPERATION')
            // -----------------------------------------------------------------
            var evtOrigin = new DomainEvent(
                EventId: eventIdOrigin,
                EventType: EventTypes.TransferCompleted,
                OperationId: operationId,
                ClientId: originClientDbId,
                OccurredAt: occurredAt,
                AmountCents: -amountMinor,           // débito: negativo
                Currency: request.Currency,
                CounterpartyClientId: destinationClientDbId,
                Description: request.Description,
                BalanceAfterCents: newOriginBalance);

            var evtDest = new DomainEvent(
                EventId: eventIdDest,
                EventType: EventTypes.TransferCompleted,
                OperationId: operationId,
                ClientId: destinationClientDbId,
                OccurredAt: occurredAt,
                AmountCents: amountMinor,            // crédito: positivo
                Currency: request.Currency,
                CounterpartyClientId: originClientDbId,
                Description: request.Description,
                BalanceAfterCents: newDestinationBalance);

            await InsertOutboxEventAsync(conn, tx, eventIdOrigin, operationId, evtOrigin, cancellationToken);
            await InsertOutboxEventAsync(conn, tx, eventIdDest,   operationId, evtDest,   cancellationToken);

            result = new TransferResponseDto(
                TransferId: publicRef,
                OriginClientId: originClientDbId,
                DestinationClientId: destinationClientDbId,
                DestinationTransferCode: destinationTransferCode,
                Amount: request.Amount,
                AmountCents: amountMinor,
                Currency: request.Currency,
                Status: "COMPLETED",
                LedgerOperationId: operationId,
                Timestamp: occurredAt,
                Description: request.Description);

            logger.LogInformation(
                "INTERNAL_TRANSFER COMMITTED operation_id={OperationId} public_ref={PublicRef} origin={Origin} dest={Dest} amount_minor={AmountMinor}",
                operationId, publicRef, originClientDbId, destinationClientDbId, amountMinor);
        });

        return result;
    }

    /// <summary>
    /// Lista el historial de transferencias donde el cliente autenticado (<paramref name="clientId"/> = auth_subject)
    /// sea el ORIGEN o el DESTINO de la transferencia.
    /// </summary>
    public async Task<IReadOnlyList<TransferResponseDto>> GetTransfersByClientIdAsync(
        string clientId,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        await using var conn = db.Open();
        var clientDbId = await ResolveClientByAuthSubjectAsync(conn, clientId, cancellationToken);

        var offset = (Math.Max(1, page) - 1) * Math.Min(100, pageSize);
        var limit  = Math.Min(100, pageSize);

        var cmd = conn.CreateSelectCommand(
            "SELECT " +
            "    lo.operation_id, " +
            "    lo.public_reference, " +
            "    lo.actor_id, " +
            "    wa_dest.client_id AS dest_client_id, " +
            "    c_dest.public_transfer_code AS dest_code, " +
            "    lo.amount_minor, " +
            "    lo.currency, " +
            "    lo.status, " +
            "    lo.reason, " +
            "    lo.created_at, " +
            "    lo.confirmed_at " +
            "FROM ledger_operations lo " +
            "JOIN ledger_entries le_dest " +
            "    ON le_dest.operation_id = lo.operation_id AND le_dest.entry_no = 2 " +
            "JOIN wallet_accounts wa_dest " +
            "    ON wa_dest.account_id = le_dest.account_id " +
            "JOIN clients c_dest " +
            "    ON c_dest.client_id = wa_dest.client_id " +
            "WHERE lo.type = 'INTERNAL_TRANSFER' " +
            "  AND (lo.actor_id = @clientId OR wa_dest.client_id = @clientId) " +
            "ORDER BY lo.created_at DESC " +
            "LIMIT @limit OFFSET @offset");

        cmd.Parameters.Add("clientId", SpannerDbType.String, clientDbId);
        cmd.Parameters.Add("limit",    SpannerDbType.Int64,  (long)limit);
        cmd.Parameters.Add("offset",   SpannerDbType.Int64,  (long)offset);

        var results = new List<TransferResponseDto>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            results.Add(MapTransferRow(reader));

        return results;
    }

    /// <summary>
    /// Consulta el detalle de una transferencia buscando por su identificador público (public_reference).
    /// Aplica resource authorization: solo el cliente origen o destino puede visualizarla.
    /// </summary>
    public async Task<TransferResponseDto> GetTransferByIdAsync(
        string clientId,
        string transferId,
        CancellationToken cancellationToken = default)
    {
        await using var conn = db.Open();
        var clientDbId = await ResolveClientByAuthSubjectAsync(conn, clientId, cancellationToken);

        var cmd = conn.CreateSelectCommand(
            "SELECT " +
            "    lo.operation_id, " +
            "    lo.public_reference, " +
            "    lo.actor_id, " +
            "    wa_dest.client_id AS dest_client_id, " +
            "    c_dest.public_transfer_code AS dest_code, " +
            "    lo.amount_minor, " +
            "    lo.currency, " +
            "    lo.status, " +
            "    lo.reason, " +
            "    lo.created_at, " +
            "    lo.confirmed_at " +
            "FROM ledger_operations lo " +
            "JOIN ledger_entries le_dest " +
            "    ON le_dest.operation_id = lo.operation_id AND le_dest.entry_no = 2 " +
            "JOIN wallet_accounts wa_dest " +
            "    ON wa_dest.account_id = le_dest.account_id " +
            "JOIN clients c_dest " +
            "    ON c_dest.client_id = wa_dest.client_id " +
            "WHERE lo.public_reference = @publicRef AND lo.type = 'INTERNAL_TRANSFER'");

        cmd.Parameters.Add("publicRef", SpannerDbType.String, transferId);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            throw new WalletNotFoundException($"La transferencia '{transferId}' no fue encontrada.");

        var dto = MapTransferRow(reader);

        if (dto.OriginClientId != clientDbId && dto.DestinationClientId != clientDbId)
            throw new UnauthorizedAccessException(
                "No tiene autorización para visualizar una transferencia que no le pertenece.");

        return dto;
    }

    /// <summary>
    /// Obtiene el comprobante formal de la transferencia buscando por su identificador público (public_reference).
    /// Aplica resource authorization: solo el cliente origen o destino puede obtener el comprobante.
    /// Emite los códigos públicos de transferencia enmascarados de forma segura.
    /// </summary>
    public async Task<TransferReceiptDto> GetTransferReceiptAsync(
        string clientId,
        string transferId,
        CancellationToken cancellationToken = default)
    {
        await using var conn = db.Open();
        var clientDbId = await ResolveClientByAuthSubjectAsync(conn, clientId, cancellationToken);

        var cmd = conn.CreateSelectCommand(
            "SELECT " +
            "    lo.operation_id, " +
            "    lo.public_reference, " +
            "    lo.actor_id, " +
            "    wa_dest.client_id AS dest_client_id, " +
            "    c_orig.public_transfer_code AS orig_code, " +
            "    c_dest.public_transfer_code AS dest_code, " +
            "    lo.amount_minor, " +
            "    lo.currency, " +
            "    lo.status, " +
            "    lo.created_at, " +
            "    lo.confirmed_at " +
            "FROM ledger_operations lo " +
            "JOIN clients c_orig " +
            "    ON c_orig.client_id = lo.actor_id " +
            "JOIN ledger_entries le_dest " +
            "    ON le_dest.operation_id = lo.operation_id AND le_dest.entry_no = 2 " +
            "JOIN wallet_accounts wa_dest " +
            "    ON wa_dest.account_id = le_dest.account_id " +
            "JOIN clients c_dest " +
            "    ON c_dest.client_id = wa_dest.client_id " +
            "WHERE lo.public_reference = @publicRef AND lo.type = 'INTERNAL_TRANSFER'");

        cmd.Parameters.Add("publicRef", SpannerDbType.String, transferId);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            throw new WalletNotFoundException($"No se encontró la transferencia '{transferId}' para generar el comprobante.");

        var operationId    = reader.GetString(0);
        var publicRef      = reader.GetString(1);
        var originClientId = reader.GetString(2);
        var destClientId   = reader.GetString(3);
        var origCode       = reader.GetString(4);
        var destCode       = reader.GetString(5);
        var amountNum      = reader.GetNumeric(6);
        var currency       = reader.GetString(7);
        var status         = reader.GetString(8);
        var createdAt      = reader.GetFieldValue<DateTime>(9);
        var confirmedAt    = reader.IsDBNull(10) ? (DateTime?)null : reader.GetFieldValue<DateTime>(10);

        if (originClientId != clientDbId && destClientId != clientDbId)
            throw new UnauthorizedAccessException(
                "No tiene autorización para obtener el comprobante de una transferencia que no le pertenece.");

        var amountDec = (decimal)amountNum;
        var amountCop = amountDec / 100m;
        var completedDt = confirmedAt ?? createdAt;
        var completedAt = new DateTimeOffset(DateTime.SpecifyKind(completedDt, DateTimeKind.Utc));

        return new TransferReceiptDto(
            ReceiptNumber: $"REC-{completedAt:yyyyMMdd}-{publicRef[..Math.Min(12, publicRef.Length)].ToUpperInvariant()}",
            TransferId: publicRef,
            OriginMaskedTransferCode: MaskTransferCode(origCode),
            DestinationMaskedTransferCode: MaskTransferCode(destCode),
            Amount: amountCop,
            Currency: currency,
            CompletedAt: completedAt,
            AuthorizationCode: $"AUTH-{operationId[..8].ToUpperInvariant()}",
            Status: status);
    }

    // =========================================================================
    // MASKING HELPER
    // =========================================================================

    /// <summary>
    /// Enmascara un código público de transferencia de forma segura.
    /// Formato: primeros 3 caracteres + *** + últimos 4 caracteres.
    /// Ejemplo: TRF-ALE-0001 → TRF***0001
    /// Seguro ante cualquier longitud sin generar IndexOutOfRangeException.
    /// </summary>
    public static string MaskTransferCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return "***";
        if (code.Length >= 7)
            return $"{code[..3]}***{code[^4..]}";
        if (code.Length >= 4)
            return $"{code[..1]}***{code[^2..]}";
        return $"{code}***";
    }

    // =========================================================================
    // PRIVATE — Resolvers de identidad
    // =========================================================================

    /// <summary>
    /// Resuelve auth_subject → (client_id, public_transfer_code, timezone) del cliente origen dentro de la transacción.
    /// </summary>
    private static async Task<(string ClientId, string TransferCode, string Timezone)> ResolveOriginClientInTxAsync(
        SpannerConnection conn, SpannerTransaction tx, string authSubject, CancellationToken ct)
    {
        var cmd = conn.CreateSelectCommand(
            "SELECT client_id, status, public_transfer_code, timezone FROM clients " +
            "WHERE auth_subject = @authSubject");
        cmd.Transaction = tx;
        cmd.Parameters.Add("authSubject", SpannerDbType.String, authSubject);

        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct))
            throw new WalletNotFoundException("El cliente autenticado no fue encontrado en el sistema.");

        var clientId = r.GetString(0);
        var status   = r.GetString(1);
        var code     = r.GetString(2);
        var tz       = r.IsDBNull(3) ? "America/Bogota" : r.GetString(3);

        if (status != "ACTIVE")
            throw new InactiveOriginException("El cliente autenticado se encuentra inactivo o bloqueado.");

        return (clientId, code, tz);
    }

    /// <summary>
    /// Resuelve public_transfer_code → (client_id, public_transfer_code) del cliente destino dentro de la transacción.
    /// </summary>
    private static async Task<(string ClientId, string TransferCode)> ResolveDestinationClientInTxAsync(
        SpannerConnection conn, SpannerTransaction tx, string transferCode, CancellationToken ct)
    {
        var cmd = conn.CreateSelectCommand(
            "SELECT client_id, status, public_transfer_code FROM clients " +
            "WHERE public_transfer_code = @transferCode");
        cmd.Transaction = tx;
        cmd.Parameters.Add("transferCode", SpannerDbType.String, transferCode);

        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct))
            throw new WalletNotFoundException(
                $"El código de transferencia '{transferCode}' no corresponde a ningún cliente registrado.");

        var clientId = r.GetString(0);
        var status   = r.GetString(1);
        var code     = r.GetString(2);

        if (status != "ACTIVE")
            throw new InactiveDestinationException(
                $"El cliente destino con código '{transferCode}' se encuentra inactivo.");

        return (clientId, code);
    }

    /// <summary>
    /// Resuelve auth_subject → client_id fuera de transacción para operaciones GET.
    /// </summary>
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

    // =========================================================================
    // PRIVATE — Lectura de billeteras y límites dentro de transacción
    // =========================================================================

    /// <summary>
    /// Lee account_id, current_balance_minor y version de la CLIENT_WALLET activa.
    /// Valida que la cuenta esté activa, que la moneda sea COP y que el saldo sea válido.
    /// </summary>
    private static async Task<(string AccountId, long BalanceMinor, long Version)> ReadWalletInTxAsync(
        SpannerConnection conn, SpannerTransaction tx,
        string clientId, bool isOrigin, CancellationToken ct)
    {
        var cmd = conn.CreateSelectCommand(
            "SELECT account_id, currency, current_balance_minor, status, version FROM wallet_accounts " +
            "WHERE client_id = @clientId AND account_type = 'CLIENT_WALLET'");
        cmd.Transaction = tx;
        cmd.Parameters.Add("clientId", SpannerDbType.String, clientId);

        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct))
        {
            throw new WalletNotFoundException(
                $"La cuenta CLIENT_WALLET para el cliente '{(isOrigin ? "origen" : "destino")}' no fue encontrada.");
        }

        var accountId  = r.GetString(0);
        var currency   = r.GetString(1);
        var balanceNum = r.GetNumeric(2);
        var status     = r.GetString(3);
        var version    = r.GetInt64(4);

        if (status != "ACTIVE")
        {
            if (isOrigin)
                throw new InactiveOriginException("La cuenta de billetera del cliente origen se encuentra inactiva o bloqueada.");
            else
                throw new InactiveDestinationException("La cuenta de billetera del cliente destino se encuentra inactiva o bloqueada.");
        }

        if (currency != "COP")
        {
            throw new InvalidCurrencyException($"La cuenta tiene moneda '{currency}', pero solo se permite COP.");
        }

        var balanceDec = (decimal)balanceNum;
        if (balanceDec % 1m != 0 || balanceDec < 0)
        {
            throw new InvalidOperationException(
                $"El saldo en Spanner para la cuenta '{accountId}' contiene un valor no entero o negativo: {balanceNum}.");
        }

        return (accountId, checked((long)balanceDec), version);
    }

    /// <summary>
    /// Valida y actualiza o inserta el uso diario acumulado en daily_transfer_usage dentro de la transacción.
    /// Aplica optimistic locking si la fila ya existía.
    /// </summary>
    private static async Task CheckAndUpdateDailyUsageInTxAsync(
        SpannerConnection conn, SpannerTransaction tx,
        string clientId, SpannerDate localDay, long amountMinor,
        CancellationToken ct)
    {
        var cmd = conn.CreateSelectCommand(
            "SELECT outgoing_total_minor, operations_count, version FROM daily_transfer_usage " +
            "WHERE client_id = @clientId AND local_day = @localDay");
        cmd.Transaction = tx;
        cmd.Parameters.Add("clientId", SpannerDbType.String, clientId);
        cmd.Parameters.Add("localDay", SpannerDbType.Date,   localDay);

        await using var r = await cmd.ExecuteReaderAsync(ct);
        if (await r.ReadAsync(ct))
        {
            var usageDec = (decimal)r.GetNumeric(0);
            var currentUsage = checked((long)usageDec);
            var expectedVersion = r.GetInt64(2);

            if (currentUsage + amountMinor > MaxDailyMinor)
                throw new TransferLimitExceededException(
                    "El monto acumulado diario supera el límite permitido ($5.000.000 COP).");

            var update = conn.CreateDmlCommand(
                "UPDATE daily_transfer_usage " +
                "SET outgoing_total_minor = outgoing_total_minor + @added, " +
                "    operations_count = operations_count + 1, " +
                "    version = version + 1, " +
                "    updated_at = CURRENT_TIMESTAMP() " +
                "WHERE client_id = @clientId AND local_day = @localDay AND version = @expectedVersion");
            update.Transaction = tx;
            update.Parameters.Add("added",           SpannerDbType.Numeric, SpannerNumeric.Parse(amountMinor.ToString()));
            update.Parameters.Add("clientId",        SpannerDbType.String,  clientId);
            update.Parameters.Add("localDay",        SpannerDbType.Date,    localDay);
            update.Parameters.Add("expectedVersion", SpannerDbType.Int64,   expectedVersion);

            var rows = await update.ExecuteNonQueryAsync(ct);
            if (rows != 1)
                throw new ConcurrencyConflictException(
                    "Conflicto de concurrencia al actualizar el límite diario de transferencias.");
        }
        else
        {
            if (amountMinor > MaxDailyMinor)
                throw new TransferLimitExceededException(
                    "El monto acumulado diario supera el límite permitido ($5.000.000 COP).");

            var insert = conn.CreateDmlCommand(
                "INSERT INTO daily_transfer_usage " +
                "(client_id, local_day, outgoing_total_minor, operations_count, version, updated_at) " +
                "VALUES (@clientId, @localDay, @added, 1, 1, CURRENT_TIMESTAMP())");
            insert.Transaction = tx;
            insert.Parameters.Add("clientId", SpannerDbType.String,  clientId);
            insert.Parameters.Add("localDay", SpannerDbType.Date,    localDay);
            insert.Parameters.Add("added",    SpannerDbType.Numeric, SpannerNumeric.Parse(amountMinor.ToString()));

            await insert.ExecuteNonQueryAsync(ct);
        }
    }

    // =========================================================================
    // PRIVATE — Escrituras dentro de transacción
    // =========================================================================

    /// <summary>
    /// INSERT ledger_operations con DDL real:
    /// operation_id, public_reference, type, status, actor_id, actor_type,
    /// amount_minor, currency, idempotency_key, original_operation_id, reason,
    /// created_at, confirmed_at, updated_at.
    /// </summary>
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
            "VALUES (@opId, @pubRef, 'INTERNAL_TRANSFER', 'COMPLETED', " +
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

    /// <summary>
    /// INSERT ledger_entries con DDL real:
    /// operation_id, entry_no, account_id, delta_minor, balance_before_minor, balance_after_minor, created_at.
    /// entry_no=1 → débito origen (delta negativo), entry_no=2 → crédito destino (delta positivo).
    /// </summary>
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

    /// <summary>
    /// UPDATE wallet_accounts con optimistic lock por version.
    /// Columnas: current_balance_minor, version, updated_at.
    /// Verifica que se actualice exactamente 1 fila.
    /// </summary>
    private static async Task UpdateWalletBalanceAsync(
        SpannerConnection conn, SpannerTransaction tx,
        string accountId, long newBalanceMinor, long expectedVersion,
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
                $"Conflicto de concurrencia al actualizar la cuenta '{accountId}'. Versión esperada: {expectedVersion}.");
    }

    /// <summary>
    /// INSERT outbox_events con DDL real:
    /// event_id, aggregate_id, aggregate_type, event_type, payload, created_at, pending_since, published_at, attempts, last_error.
    /// aggregate_type = 'LEDGER_OPERATION'.
    /// Payload serializado usando DomainEvent.ToJson().
    /// </summary>
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

    // =========================================================================
    // PRIVATE — Helpers de mapeo y timezone
    // =========================================================================

    /// <summary>
    /// Calcula la fecha local (Date) del cliente a partir de su Timezone IANA.
    /// Compatible con Linux y Windows, con fallback seguro a America/Bogota o UTC.
    /// </summary>
    private static DateTime GetClientLocalDate(string? timezoneIana)
    {
        var tzId = string.IsNullOrWhiteSpace(timezoneIana) ? "America/Bogota" : timezoneIana;
        TimeZoneInfo tz;
        try
        {
            tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);
        }
        catch (TimeZoneNotFoundException)
        {
            if (tzId.Equals("America/Bogota", StringComparison.OrdinalIgnoreCase))
            {
                try { tz = TimeZoneInfo.FindSystemTimeZoneById("SA Pacific Standard Time"); }
                catch { tz = TimeZoneInfo.Utc; }
            }
            else
            {
                tz = TimeZoneInfo.Utc;
            }
        }
        catch (InvalidTimeZoneException)
        {
            tz = TimeZoneInfo.Utc;
        }

        var localNow = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, tz);
        return localNow.Date;
    }

    /// <summary>
    /// Mapea una fila de consulta de transferencia a TransferResponseDto.
    /// </summary>
    private static TransferResponseDto MapTransferRow(SpannerDataReader r)
    {
        var operationId = r.GetString(0);
        var publicRef   = r.GetString(1);
        var originId    = r.GetString(2);
        var destId      = r.GetString(3);
        var destCode    = r.GetString(4);
        var amountNum   = r.GetNumeric(5);
        var amountDec   = (decimal)amountNum;
        var amountCop   = amountDec / 100m;
        var currency    = r.GetString(6);
        var status      = r.GetString(7);
        var reason      = r.IsDBNull(8) ? null : r.GetString(8);
        var createdAt   = r.GetFieldValue<DateTime>(9);
        var confirmedAt = r.IsDBNull(10) ? (DateTime?)null : r.GetFieldValue<DateTime>(10);

        var timestampDt = confirmedAt ?? createdAt;
        var timestamp   = new DateTimeOffset(DateTime.SpecifyKind(timestampDt, DateTimeKind.Utc));

        return new TransferResponseDto(
            TransferId: publicRef,
            OriginClientId: originId,
            DestinationClientId: destId,
            DestinationTransferCode: destCode,
            Amount: amountCop,
            AmountCents: checked((long)amountDec),
            Currency: currency,
            Status: status,
            LedgerOperationId: operationId,
            Timestamp: timestamp,
            Description: reason);
    }
}
