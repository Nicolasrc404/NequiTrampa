using Nequi.Wallet.DTOs;
using Nequi.Wallet.Exceptions;
using Nequi.Wallet.Interfaces;

namespace Nequi.Wallet.Services;

/// <summary>
/// Implementación simulada de ITransferService con validaciones de límites y saldo.
/// Estado: MOCK — en la fase productiva se reemplaza por SpannerTransferService con transacciones
/// atómicas en Spanner y publicación al Transactional Outbox (TO-BE).
/// Idempotencia: delegada al IdempotencyActionFilter (Nequi.Shared) en la capa MVC.
///
/// LIMITACIÓN DEL MOCK: el saldo es fijo ($1.250.000) y NO se reduce tras una transferencia.
/// Las recargas no aumentan el saldo. La autoridad financiera real (Spanner ledger) es TO-BE.
/// </summary>
public sealed class MockTransferService : ITransferService
{
    private const decimal MaxTransferAmount = 2_000_000m;
    private const decimal MaxDailyAmount = 5_000_000m;

    // In-memory state; se usa solo en modo MOCK. No thread-safe para concurrencia real.
    private static readonly List<TransferResponseDto> Transfers = [];

    public Task<TransferResponseDto> CreateTransferAsync(
        string originClientId,
        string idempotencyKey,
        CreateTransferRequestDto request,
        CancellationToken cancellationToken = default)
    {
        // Idempotencia: delegada al IdempotencyActionFilter (Nequi.Shared → IIdempotencyStore).
        // Este servicio no debe duplicar la lógica de idempotencia.

        // Reglas financieras
        if (request.Amount > MaxTransferAmount)
            throw new TransferLimitExceededException($"El monto de la transferencia supera el límite individual permitido (${MaxTransferAmount:N0} COP).");

        decimal transferredToday;

        lock (Transfers)
        {
            var todayUtc = DateTimeOffset.UtcNow.UtcDateTime.Date;

            transferredToday = Transfers
                .Where(t =>
                    t.OriginClientId == originClientId &&
                    t.Status == "COMPLETED" &&
                    t.Timestamp.UtcDateTime.Date == todayUtc)
                .Sum(t => t.Amount);
        }

        if (transferredToday + request.Amount > MaxDailyAmount)
            throw new TransferLimitExceededException(
                $"El monto acumulado diario supera el límite permitido (${MaxDailyAmount:N0} COP).");

        // Saldo simulado fijo; en producción: leer wallet.balance de Spanner
        // LIMITACIÓN DEL MOCK: el saldo no disminuye tras la transferencia (TO-BE: ledger Spanner).
        const decimal mockBalance = 1_250_000m;
        if (request.Amount > mockBalance)
            throw new InsufficientFundsException();

        // Destino simulado inactivo
        if (request.DestinationPhoneNumber == "3000000000")
            throw new InactiveDestinationException();

        var transfer = new TransferResponseDto(
            TransferId: $"trf_{Guid.NewGuid():N}"[..18],
            OriginClientId: originClientId,
            DestinationClientId: $"cli_dest_{request.DestinationPhoneNumber[..5]}",
            DestinationPhoneNumber: request.DestinationPhoneNumber,
            Amount: request.Amount,
            AmountCents: (long)(request.Amount * 100),
            Currency: request.Currency,
            Status: "COMPLETED",
            LedgerOperationId: $"led_op_{Guid.NewGuid():N}"[..18],
            Timestamp: DateTimeOffset.UtcNow,
            Description: request.Description
        );

        lock (Transfers) { Transfers.Add(transfer); }

        return Task.FromResult(transfer);
    }

    public Task<IReadOnlyList<TransferResponseDto>> GetTransfersByClientIdAsync(
        string clientId,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        lock (Transfers)
        {
            IReadOnlyList<TransferResponseDto> result = Transfers
                .Where(t => t.OriginClientId == clientId || t.DestinationClientId == clientId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Task.FromResult(result);
        }
    }

    public Task<TransferResponseDto> GetTransferByIdAsync(
        string clientId,
        string transferId,
        CancellationToken cancellationToken = default)
    {
        lock (Transfers)
        {
            var transfer = Transfers.FirstOrDefault(t => t.TransferId == transferId)
                ?? throw new WalletNotFoundException($"La transferencia con identificador '{transferId}' no fue encontrada.");

            // Resource-based authorization: un cliente solo ve sus propias transferencias
            if (transfer.OriginClientId != clientId && transfer.DestinationClientId != clientId)
                throw new UnauthorizedAccessException("No tiene autorización para visualizar una transferencia que no le pertenece.");

            return Task.FromResult(transfer);
        }
    }

    public Task<TransferReceiptDto> GetTransferReceiptAsync(
        string clientId,
        string transferId,
        CancellationToken cancellationToken = default)
    {
        lock (Transfers)
        {
            var transfer = Transfers.FirstOrDefault(t => t.TransferId == transferId)
                ?? throw new WalletNotFoundException($"No se encontró la transferencia '{transferId}' para generar el comprobante.");

            // Resource-based authorization: mismo chequeo que GetTransferByIdAsync.
            // Un cliente solo obtiene el comprobante si es origen o destino de la transferencia.
            if (transfer.OriginClientId != clientId && transfer.DestinationClientId != clientId)
                throw new UnauthorizedAccessException("No tiene autorización para obtener el comprobante de una transferencia que no le pertenece.");

            var receipt = new TransferReceiptDto(
                ReceiptNumber: $"REC-{DateTime.UtcNow:yyyyMMdd}-{transferId[..6].ToUpper()}",
                TransferId: transfer.TransferId,
                OriginMaskedPhone: "300***1234",
                DestinationMaskedPhone: $"{transfer.DestinationPhoneNumber[..3]}***{transfer.DestinationPhoneNumber[^4..]}",
                Amount: transfer.Amount,
                Currency: transfer.Currency,
                CompletedAt: transfer.Timestamp,
                AuthorizationCode: $"AUTH-{Guid.NewGuid():N}"[..10].ToUpper(),
                Status: transfer.Status
            );

            return Task.FromResult(receipt);
        }
    }
}
