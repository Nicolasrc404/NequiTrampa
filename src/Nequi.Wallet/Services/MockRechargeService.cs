using Nequi.Wallet.DTOs;
using Nequi.Wallet.Interfaces;

namespace Nequi.Wallet.Services;

/// <summary>Academic simulated recharge service; no card, bank or GCP call is made.</summary>
public sealed class MockRechargeService(AcademicWalletStore? store = null) : IRechargeService
{
    private readonly AcademicWalletStore _store = store ?? AcademicWalletStore.Shared;

    public Task<RechargeResponseDto> CreateRechargeAsync(string clientId, string idempotencyKey, CreateRechargeRequestDto request, CancellationToken cancellationToken = default) =>
        Task.FromResult(_store.CreateRecharge(clientId, request));

    public Task<IReadOnlyList<RechargeResponseDto>> GetRechargesByClientIdAsync(string clientId, CancellationToken cancellationToken = default) =>
        Task.FromResult(_store.GetRecharges(clientId));
}
