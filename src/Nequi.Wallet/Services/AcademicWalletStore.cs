using System.Text.Json;
using Nequi.Shared.Idempotency;
using Nequi.Wallet.DTOs;
using Nequi.Wallet.Exceptions;

namespace Nequi.Wallet.Services;

/// <summary>Atomic process-local ledger used only by the academic memory backend.</summary>
public sealed class AcademicWalletStore : IIdempotencyStore
{
    public const long InitialBalanceCents = 125_000_000;
    private readonly object _gate = new();
    private readonly string? _persistencePath;
    private readonly Dictionary<string, long> _balances = new(StringComparer.Ordinal);
    private readonly List<TransferResponseDto> _transfers = [];
    private readonly List<RechargeResponseDto> _recharges = [];
    private readonly Dictionary<string, IdempotencyRecord> _idempotency = new(StringComparer.Ordinal);

    public static AcademicWalletStore Shared { get; } = new();

    public AcademicWalletStore(string? persistencePath = null)
    {
        _persistencePath = string.IsNullOrWhiteSpace(persistencePath) ? null : Path.GetFullPath(persistencePath);
        Load();
    }

    public long GetBalanceCents(string clientId)
    {
        lock (_gate)
        {
            if (_balances.ContainsKey(clientId)) return _balances[clientId];
            var balances = new Dictionary<string, long>(_balances, StringComparer.Ordinal)
            {
                [clientId] = InitialBalanceCents
            };
            Commit(new State(balances, _transfers, _recharges, _idempotency.Values.ToList()));
            return InitialBalanceCents;
        }
    }

    public TransferResponseDto CreateTransfer(
        string originClientId, string idempotencyKey, CreateTransferRequestDto request, string? destinationClientId = null)
    {
        lock (_gate)
        {
            var identity = Id(originClientId, IdempotencyOperationClassification.TransferScope, idempotencyKey);
            if (_idempotency.TryGetValue(identity, out var existing) && existing.StatusCode is not null && existing.ResponseBody is not null)
                return JsonSerializer.Deserialize<TransferResponseDto>(existing.ResponseBody, JsonOptions)!;

            if (request.Amount <= 0 || request.Amount > 2_000_000m)
                throw new TransferLimitExceededException("El monto de la transferencia supera el límite individual permitido.");
            var amountCentsDecimal = request.Amount * 100m;
            if (amountCentsDecimal % 1m != 0)
                throw new InvalidTransferAmountException("El monto en COP debe representar unidades menores enteras (máximo 2 decimales).");
            if (!string.Equals(request.Currency, "COP", StringComparison.Ordinal))
                throw new InvalidCurrencyException();
            if (string.IsNullOrWhiteSpace(destinationClientId))
                throw new DestinationNotFoundException(request.DestinationTransferCode);
            var amountCents = checked((long)amountCentsDecimal);
            if (amountCents > 200_000_000)
                throw new TransferLimitExceededException("El monto de la transferencia supera el límite individual permitido.");

            var today = DateTimeOffset.UtcNow.UtcDateTime.Date;
            var transferredToday = _transfers
                .Where(t => t.OriginClientId == originClientId && t.Timestamp.UtcDateTime.Date == today)
                .Sum(t => t.AmountCents);
            if (transferredToday + amountCents > 500_000_000)
                throw new TransferLimitExceededException("El monto acumulado diario supera el límite permitido.");

            var balances = new Dictionary<string, long>(_balances, StringComparer.Ordinal);
            var originBalance = Balance(balances, originClientId);
            if (amountCents > originBalance) throw new InsufficientFundsException();

            var transfer = new TransferResponseDto(
                $"trf_{Guid.NewGuid():N}"[..18], originClientId, destinationClientId,
                request.DestinationTransferCode, request.Amount, amountCents, request.Currency,
                "COMPLETED", $"led_op_{Guid.NewGuid():N}"[..18], DateTimeOffset.UtcNow,
                request.Description);
            balances[originClientId] = originBalance - amountCents;
            balances[destinationClientId] = checked(Balance(balances, destinationClientId) + amountCents);

            var transfers = new List<TransferResponseDto>(_transfers) { transfer };
            var idempotency = new Dictionary<string, IdempotencyRecord>(_idempotency, StringComparer.Ordinal);
            if (existing is not null)
                idempotency[identity] = existing with
                {
                    StatusCode = 201,
                    ResponseBody = JsonSerializer.Serialize(transfer, JsonOptions),
                    ContentType = "application/json"
                };
            Commit(new State(balances, transfers, _recharges, idempotency.Values.ToList()));
            return transfer;
        }
    }

    public RechargeResponseDto CreateRecharge(string clientId, string idempotencyKey, CreateRechargeRequestDto request)
    {
        lock (_gate)
        {
            var identity = Id(clientId, IdempotencyOperationClassification.RechargeScope, idempotencyKey);
            if (_idempotency.TryGetValue(identity, out var existing) && existing.StatusCode is not null && existing.ResponseBody is not null)
                return JsonSerializer.Deserialize<RechargeResponseDto>(existing.ResponseBody, JsonOptions)!;

            if (request.Amount < 1_000m || request.Amount > 5_000_000m || decimal.Round(request.Amount, 2) != request.Amount)
                throw new InvalidTransferAmountException("El monto debe estar entre $1.000 y $5.000.000 COP y usar máximo dos decimales.");
            if (!string.Equals(request.Currency, "COP", StringComparison.Ordinal))
                throw new InvalidCurrencyException();
            var amountCents = checked((long)(request.Amount * 100m));
            var balances = new Dictionary<string, long>(_balances, StringComparer.Ordinal);
            var recharge = new RechargeResponseDto(
                $"rch_{Guid.NewGuid():N}"[..18], clientId, request.Amount, amountCents,
                request.Currency, request.PaymentMethod, "COMPLETED",
                $"led_op_{Guid.NewGuid():N}"[..18], DateTimeOffset.UtcNow);
            balances[clientId] = checked(Balance(balances, clientId) + amountCents);

            var recharges = new List<RechargeResponseDto>(_recharges) { recharge };
            var idempotency = new Dictionary<string, IdempotencyRecord>(_idempotency, StringComparer.Ordinal);
            if (existing is not null)
                idempotency[identity] = existing with
                {
                    StatusCode = 201,
                    ResponseBody = JsonSerializer.Serialize(recharge, JsonOptions),
                    ContentType = "application/json"
                };
            Commit(new State(balances, _transfers, recharges, idempotency.Values.ToList()));
            return recharge;
        }
    }

    public IReadOnlyList<TransferResponseDto> GetTransfers(string clientId, int page, int pageSize)
    {
        lock (_gate)
            return _transfers.Where(t => t.OriginClientId == clientId || t.DestinationClientId == clientId)
                .OrderByDescending(t => t.Timestamp).Skip(Math.Max(0, page - 1) * pageSize).Take(pageSize).ToList();
    }

    public TransferResponseDto? FindTransfer(string transferId)
    {
        lock (_gate) return _transfers.FirstOrDefault(t => t.TransferId == transferId);
    }

    public IReadOnlyList<RechargeResponseDto> GetRecharges(string clientId)
    {
        lock (_gate) return _recharges.Where(r => r.ClientId == clientId).OrderByDescending(r => r.Timestamp).ToList();
    }

    public Task<(BeginOutcome Outcome, IdempotencyRecord? Record)> BeginAsync(
        string actorId, string scope, string key, string requestHash, CancellationToken ct)
    {
        lock (_gate)
        {
            var identity = Id(actorId, scope, key);
            if (_idempotency.TryGetValue(identity, out var existing))
            {
                if (!string.Equals(existing.RequestHash, requestHash, StringComparison.Ordinal))
                    return Task.FromResult<(BeginOutcome, IdempotencyRecord?)>((BeginOutcome.Conflict, existing));
                if (existing.StatusCode is not null)
                    return Task.FromResult<(BeginOutcome, IdempotencyRecord?)>((BeginOutcome.Replay, existing));
                return Task.FromResult<(BeginOutcome, IdempotencyRecord?)>((BeginOutcome.InProgress, existing));
            }

            var record = new IdempotencyRecord(actorId, scope, key, requestHash, null, null, null, DateTimeOffset.UtcNow);
            var records = new Dictionary<string, IdempotencyRecord>(_idempotency, StringComparer.Ordinal) { [identity] = record };
            Commit(new State(_balances, _transfers, _recharges, records.Values.ToList()));
            return Task.FromResult<(BeginOutcome, IdempotencyRecord?)>((BeginOutcome.Started, null));
        }
    }

    public Task CompleteAsync(string actorId, string scope, string key, int statusCode, string? body, string? contentType, CancellationToken ct)
    {
        lock (_gate)
        {
            var identity = Id(actorId, scope, key);
            var old = _idempotency.TryGetValue(identity, out var existing)
                ? existing
                : new IdempotencyRecord(actorId, scope, key, "", null, null, null, DateTimeOffset.UtcNow);
            var records = new Dictionary<string, IdempotencyRecord>(_idempotency, StringComparer.Ordinal)
            {
                [identity] = old with { StatusCode = statusCode, ResponseBody = body, ContentType = contentType }
            };
            Commit(new State(_balances, _transfers, _recharges, records.Values.ToList()));
            return Task.CompletedTask;
        }
    }

    public Task AbandonAsync(string actorId, string scope, string key, CancellationToken ct)
    {
        lock (_gate)
        {
            var identity = Id(actorId, scope, key);
            if (!_idempotency.ContainsKey(identity)) return Task.CompletedTask;
            if (IdempotencyOperationClassification.Classify(scope) == IdempotencyOperationKind.Financial)
                return Task.CompletedTask;

            var records = new Dictionary<string, IdempotencyRecord>(_idempotency, StringComparer.Ordinal);
            records.Remove(identity);
            Commit(new State(_balances, _transfers, _recharges, records.Values.ToList()));
            return Task.CompletedTask;
        }
    }

    public Task<IReadOnlyList<IdempotencyRecord>> FindStaleInProgressAsync(TimeSpan olderThan, int limit, CancellationToken ct)
    {
        lock (_gate)
        {
            var cutoff = DateTimeOffset.UtcNow - olderThan;
            return Task.FromResult<IReadOnlyList<IdempotencyRecord>>(_idempotency.Values
                .Where(r => r.StatusCode is null && r.CreatedAt < cutoff)
                .OrderBy(r => r.CreatedAt).Take(limit).ToList());
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private void Commit(State next)
    {
        var balances = new Dictionary<string, long>(next.Balances, StringComparer.Ordinal);
        var transfers = next.Transfers.ToList();
        var recharges = next.Recharges.ToList();
        var idempotency = next.IdempotencyRecords?.ToList() ?? [];
        SaveLocked(new State(balances, transfers, recharges, idempotency));
        _balances.Clear();
        foreach (var item in balances) _balances[item.Key] = item.Value;
        _transfers.Clear();
        _transfers.AddRange(transfers);
        _recharges.Clear();
        _recharges.AddRange(recharges);
        _idempotency.Clear();
        foreach (var item in idempotency) _idempotency[Id(item.ActorId, item.Scope, item.Key)] = item;
    }

    private void Load()
    {
        if (_persistencePath is null || !File.Exists(_persistencePath)) return;
        try
        {
            var state = JsonSerializer.Deserialize<State>(File.ReadAllText(_persistencePath), JsonOptions)
                ?? throw new InvalidDataException("El estado académico está vacío.");
            if (state.Balances is null || state.Transfers is null || state.Recharges is null)
                throw new InvalidDataException("El estado académico no contiene todas sus colecciones.");
            foreach (var (clientId, balance) in state.Balances) _balances[clientId] = balance;
            _transfers.AddRange(state.Transfers);
            _recharges.AddRange(state.Recharges);
            foreach (var record in state.IdempotencyRecords ?? [])
            {
                var key = Id(record.ActorId, record.Scope, record.Key);
                if (!_idempotency.TryAdd(key, record))
                    throw new InvalidDataException("El estado académico contiene reservas de idempotencia duplicadas.");
            }
        }
        catch (JsonException ex)
        {
            throw new InvalidDataException("El archivo de estado académico está corrupto; no se creará una billetera nueva.", ex);
        }
    }

    private void SaveLocked(State state)
    {
        if (_persistencePath is null) return;
        var directory = Path.GetDirectoryName(_persistencePath);
        if (!string.IsNullOrWhiteSpace(directory)) Directory.CreateDirectory(directory);
        var temporaryPath = _persistencePath + ".tmp";
        try
        {
            File.WriteAllText(temporaryPath, JsonSerializer.Serialize(state, JsonOptions));
            if (File.Exists(_persistencePath)) File.Replace(temporaryPath, _persistencePath, null);
            else File.Move(temporaryPath, _persistencePath);
        }
        finally
        {
            if (File.Exists(temporaryPath)) File.Delete(temporaryPath);
        }
    }

    private static long Balance(Dictionary<string, long> balances, string clientId) =>
        balances.TryGetValue(clientId, out var balance) ? balance : balances[clientId] = InitialBalanceCents;

    private static string Id(string actor, string scope, string key) => $"{actor}|{scope}|{key}";

    private sealed record State(
        Dictionary<string, long> Balances,
        List<TransferResponseDto> Transfers,
        List<RechargeResponseDto> Recharges,
        List<IdempotencyRecord>? IdempotencyRecords = null);
}
