using System.Text.Json;
using ProfileService.Application.DTOs;
using ProfileService.Application.Interfaces;
using ProfileService.Domain.Common;
using ProfileService.Domain.Entities;
using ProfileService.Domain.Enums;
using ProfileService.Domain.Repositories;

namespace ProfileService.Application.Services;

public class ProfileApplicationService : IProfileService
{
    private readonly IClientRepository _clientRepository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUnitOfWork _unitOfWork;

    public ProfileApplicationService(
        IClientRepository clientRepository,
        IOutboxRepository outboxRepository,
        ICurrentUserService currentUserService,
        IUnitOfWork unitOfWork)
    {
        _clientRepository = clientRepository;
        _outboxRepository = outboxRepository;
        _currentUserService = currentUserService;
        _unitOfWork = unitOfWork;
    }

    public async Task<ClientProfileResponse> GetMyProfileAsync(CancellationToken cancellationToken = default)
    {
        var clientId = _currentUserService.GetRequiredClientId();
        var client = await _clientRepository.GetByIdAsync(clientId, cancellationToken)
            ?? throw new EntityNotFoundException("Cliente", clientId);

        return MapToProfileResponse(client);
    }

    public async Task<ClientProfileResponse> UpdateMyProfileAsync(UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        var clientId = _currentUserService.GetRequiredClientId();
        var client = await _clientRepository.GetByIdAsync(clientId, cancellationToken)
            ?? throw new EntityNotFoundException("Cliente", clientId);

        client.UpdateProfile(request.FirstName, request.LastName, request.Alias);

        var outboxPayload = JsonSerializer.Serialize(new
        {
            ClientId = client.ClientId,
            FirstName = client.FirstName,
            LastName = client.LastName,
            FullName = client.FullName,
            Alias = client.Alias,
            UpdatedAt = client.UpdatedAt
        });

        var outboxEvent = OutboxEvent.Create(
            AggregateType.CLIENT,
            client.ClientId.ToString(),
            "ProfileUpdated",
            outboxPayload);

        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _clientRepository.UpdateAsync(client, cancellationToken);
            await _outboxRepository.AddAsync(outboxEvent, cancellationToken);
        }, cancellationToken);

        return MapToProfileResponse(client);
    }

    public async Task<ClientAccessResponse> GetMyAccessAsync(CancellationToken cancellationToken = default)
    {
        var clientId = _currentUserService.GetRequiredClientId();
        var client = await _clientRepository.GetByIdAsync(clientId, cancellationToken)
            ?? throw new EntityNotFoundException("Cliente", clientId);

        return new ClientAccessResponse(
            client.ClientId,
            client.AuthSubject,
            client.Email,
            _currentUserService.Roles,
            client.Status);
    }

    public async Task<ResolveTargetResponse> ResolveTargetAsync(string? publicTransferCode, string? email, CancellationToken cancellationToken = default)
    {
        Client? target = null;
        if (!string.IsNullOrWhiteSpace(publicTransferCode))
        {
            target = await _clientRepository.GetByPublicTransferCodeAsync(publicTransferCode.Trim(), cancellationToken);
        }
        else if (!string.IsNullOrWhiteSpace(email))
        {
            target = await _clientRepository.GetByEmailAsync(email.Trim(), cancellationToken);
        }

        if (target == null)
        {
            return new ResolveTargetResponse(
                Guid.Empty,
                publicTransferCode ?? string.Empty,
                string.Empty,
                Exists: false,
                CanReceiveTransfers: false);
        }

        var canReceive = target.CanOperate();

        return new ResolveTargetResponse(
            target.ClientId,
            target.PublicTransferCode,
            target.FullName,
            Exists: true,
            CanReceiveTransfers: canReceive);
    }

    private static ClientProfileResponse MapToProfileResponse(Client client)
    {
        return new ClientProfileResponse(
            client.ClientId,
            client.AuthSubject,
            client.Email,
            client.Username,
            client.FirstName,
            client.LastName,
            client.FullName,
            client.Alias,
            client.PublicTransferCode,
            client.Status,
            client.Timezone,
            client.CreatedAt,
            client.UpdatedAt);
    }
}
