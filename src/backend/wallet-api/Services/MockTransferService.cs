using System.Collections.Concurrent;
using NequiTrampa.WalletApi.DTOs;
using NequiTrampa.WalletApi.Errors;
using NequiTrampa.WalletApi.Interfaces;

namespace NequiTrampa.WalletApi.Services;

/// <summary>
/// Implementación simulada de ITransferService con validaciones de límites, saldo e idempotencia.
/// </summary>
public class MockTransferService : ITransferService
{
    private static readonly ConcurrentDictionary<string, (string PayloadHash, TransferResponseDto Response)> IdempotencyCache = new();
    private static readonly List<TransferResponseDto> Transfers = new();

    public Task<TransferResponseDto> CreateTransferAsync(
        string originClientId, 
        string idempotencyKey, 
        CreateTransferRequestDto request, 
        CancellationToken cancellationToken = default)
    {
        // 1. Validación de idempotencia simulada
        var payloadHash = $"{originClientId}:{request.DestinationPhoneNumber}:{request.Amount}:{request.Currency}";
        if (IdempotencyCache.TryGetValue(idempotencyKey, out var existingRecord))
        {
            if (existingRecord.PayloadHash != payloadHash)
            {
                throw new IdempotencyConflictException("La clave de idempotencia enviada ya fue procesada con parámetros diferentes.");
            }
            return Task.FromResult(existingRecord.Response);
        }

        // 2. Validación de reglas financieras
        if (request.Amount > 2000000)
        {
            throw new LimitExceededException("El monto de la transferencia supera el límite individual permitido ($2.000.000 COP).");
        }

        if (request.DestinationPhoneNumber == "3000000000")
        {
            throw new InactiveDestinationException("El número de teléfono destino no corresponde a un cliente activo en el sistema.");
        }

        // 3. Creación del registro
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

        IdempotencyCache.TryAdd(idempotencyKey, (payloadHash, transfer));
        lock (Transfers)
        {
            Transfers.Add(transfer);
        }

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
            var transfer = Transfers.FirstOrDefault(t => t.TransferId == transferId);
            if (transfer == null)
            {
                throw new ResourceNotFoundException($"La transferencia con identificador '{transferId}' no fue encontrada.");
            }

            // Validación de propiedad sobre el recurso (Resource-Based Authorization)
            if (transfer.OriginClientId != clientId && transfer.DestinationClientId != clientId)
            {
                throw new UnauthorizedAccessException("No tiene autorización para visualizar una transferencia que no le pertenece.");
            }

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
            var transfer = Transfers.FirstOrDefault(t => t.TransferId == transferId);
            if (transfer == null)
            {
                throw new ResourceNotFoundException($"No se encontró la transferencia '{transferId}' para generar el comprobante.");
            }

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
