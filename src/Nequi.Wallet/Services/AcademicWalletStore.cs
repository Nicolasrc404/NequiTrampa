using Nequi.Wallet.DTOs;
using Nequi.Wallet.Exceptions;
using System.Text.Json;

namespace Nequi.Wallet.Services;

/// <summary>Atomic process-local ledger used only by the academic memory backend.</summary>
public sealed class AcademicWalletStore
{
    public const long InitialBalanceCents = 125_000_000;
    private readonly object _gate = new();
    private readonly string? _persistencePath;
    private readonly Dictionary<string, long> _balances = new(StringComparer.Ordinal);
    private readonly List<TransferResponseDto> _transfers = [];
    private readonly List<RechargeResponseDto> _recharges = [];

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
            var existed = _balances.ContainsKey(clientId);
            var balance = GetOrCreateBalance(clientId);
            if (!existed) SaveLocked();
            return balance;
        }
    }

    public TransferResponseDto CreateTransfer(string originClientId, CreateTransferRequestDto request)
    {
        var destinationClientId = DestinationClientId(request.DestinationTransferCode);
        var amountCents = checked((long)(request.Amount * 100m));

        lock (_gate)
        {
            if (amountCents > 200_000_000)
                throw new TransferLimitExceededException("El monto de la transferencia supera el límite individual permitido.");

            var today = DateTimeOffset.UtcNow.UtcDateTime.Date;
            var transferredToday = _transfers
                .Where(t => t.OriginClientId == originClientId && t.Timestamp.UtcDateTime.Date == today)
                .Sum(t => t.AmountCents);
            if (transferredToday + amountCents > 500_000_000)
                throw new TransferLimitExceededException("El monto acumulado diario supera el límite permitido.");

            var originBalance = GetOrCreateBalance(originClientId);
            if (amountCents > originBalance) throw new InsufficientFundsException();

            var transfer = new TransferResponseDto(
                $"trf_{Guid.NewGuid():N}"[..18], originClientId, destinationClientId,
                request.DestinationTransferCode, request.Amount, amountCents, request.Currency,
                "COMPLETED", $"led_op_{Guid.NewGuid():N}"[..18], DateTimeOffset.UtcNow,
                request.Description);
            _balances[originClientId] = originBalance - amountCents;
            _balances[destinationClientId] = checked(GetOrCreateBalance(destinationClientId) + amountCents);
            _transfers.Add(transfer);
            SaveLocked();
            return transfer;
        }
    }

    public RechargeResponseDto CreateRecharge(string clientId, CreateRechargeRequestDto request)
    {
        var amountCents = checked((long)(request.Amount * 100m));
        lock (_gate)
        {
            var recharge = new RechargeResponseDto(
                $"rch_{Guid.NewGuid():N}"[..18], clientId, request.Amount, amountCents,
                request.Currency, request.PaymentMethod, "COMPLETED",
                $"led_op_{Guid.NewGuid():N}"[..18], DateTimeOffset.UtcNow);
            _balances[clientId] = checked(GetOrCreateBalance(clientId) + amountCents);
            _recharges.Add(recharge);
            SaveLocked();
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

    private long GetOrCreateBalance(string clientId) =>
        _balances.TryGetValue(clientId, out var balance) ? balance : _balances[clientId] = InitialBalanceCents;

    private void Load()
    {
        if (_persistencePath is null || !File.Exists(_persistencePath)) return;
        try
        {
            var state = JsonSerializer.Deserialize<PersistedState>(File.ReadAllText(_persistencePath));
            if (state is null) return;
            foreach (var (clientId, balance) in state.Balances) _balances[clientId] = balance;
            _transfers.AddRange(state.Transfers);
            _recharges.AddRange(state.Recharges);
        }
        catch (JsonException)
        {
            // A corrupt local demo file must not make the academic API contact another backend.
        }
    }

    private void SaveLocked()
    {
        if (_persistencePath is null) return;
        var directory = Path.GetDirectoryName(_persistencePath);
        if (!string.IsNullOrWhiteSpace(directory)) Directory.CreateDirectory(directory);
        var state = new PersistedState(_balances, _transfers, _recharges);
        var temporaryPath = _persistencePath + ".tmp";
        File.WriteAllText(temporaryPath, JsonSerializer.Serialize(state));
        File.Move(temporaryPath, _persistencePath, true);
    }

    private sealed record PersistedState(
        Dictionary<string, long> Balances,
        List<TransferResponseDto> Transfers,
        List<RechargeResponseDto> Recharges);

    private static string DestinationClientId(string transferCode) =>
        $"cli_dest_{transferCode[..Math.Min(8, transferCode.Length)]}";
}
