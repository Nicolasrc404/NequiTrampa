using System.Text.Json;
using ProfileService.Application.DTOs;
using ProfileService.Application.Interfaces;
using ProfileService.Domain.Common;
using ProfileService.Domain.Entities;
using ProfileService.Domain.Enums;
using ProfileService.Domain.Repositories;

namespace ProfileService.Application.Services;

public class AdminApplicationService : IAdminService
{
    private readonly IClientRepository _clientRepository;
    private readonly IAdminRepository _adminRepository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly IIdentityPlatformService _identityPlatformService;
    private readonly IUnitOfWork _unitOfWork;

    public AdminApplicationService(
        IClientRepository clientRepository,
        IAdminRepository adminRepository,
        IOutboxRepository outboxRepository,
        IIdentityPlatformService identityPlatformService,
        IUnitOfWork unitOfWork)
    {
        _clientRepository = clientRepository;
        _adminRepository = adminRepository;
        _outboxRepository = outboxRepository;
        _identityPlatformService = identityPlatformService;
        _unitOfWork = unitOfWork;
    }

    public async Task<PagedResult<AdminUserSummaryResponse>> ListUsersAsync(int page, int pageSize, string? search, UserStatus? status, CancellationToken cancellationToken = default)
    {
        var clients = await _clientRepository.ListAsync(page, pageSize, search, status, cancellationToken);
        var totalCount = await _clientRepository.CountAsync(search, status, cancellationToken);

        var summaries = clients.Select(c => new AdminUserSummaryResponse(
            c.ClientId,
            c.AuthSubject,
            c.Email,
            c.FullName,
            c.Username,
            "CLIENT",
            c.Status.ToString(),
            c.Status,
            c.CreatedAt
        )).ToList();

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResult<AdminUserSummaryResponse>(
            summaries,
            totalCount,
            page,
            pageSize,
            totalPages);
    }

    public async Task<AdminUserDetailResponse> GetUserDetailAsync(Guid id, CancellationToken cancellationToken = default)
    {
        // 1. Buscar en Clientes
        var client = await _clientRepository.GetByIdAsync(id, cancellationToken);
        if (client != null)
        {
            return new AdminUserDetailResponse(
                client.ClientId,
                client.AuthSubject,
                client.Email,
                client.FullName,
                client.Username,
                client.PublicTransferCode,
                "CLIENT",
                null,
                client.Status,
                client.CreatedAt,
                client.UpdatedAt);
        }

        // 2. Buscar en Administradores
        var admin = await _adminRepository.GetByIdAsync(id, cancellationToken);
        if (admin != null)
        {
            return new AdminUserDetailResponse(
                admin.AdministratorId,
                admin.AuthSubject,
                admin.Email,
                admin.DisplayName,
                null,
                null,
                "ADMIN",
                admin.AdminLevel.ToString(),
                admin.Status,
                admin.CreatedAt,
                admin.UpdatedAt);
        }

        throw new EntityNotFoundException("Usuario", id);
    }

    public async Task UpdateUserStatusAsync(Guid id, UpdateUserStatusRequest request, CancellationToken cancellationToken = default)
    {
        var client = await _clientRepository.GetByIdAsync(id, cancellationToken);
        if (client != null)
        {
            switch (request.NewStatus)
            {
                case UserStatus.ACTIVE:
                    client.Activate();
                    await _identityPlatformService.EnableUserAsync(client.AuthSubject, cancellationToken);
                    break;
                case UserStatus.SUSPENDED:
                    client.Suspend(request.Reason);
                    await _identityPlatformService.DisableUserAsync(client.AuthSubject, cancellationToken);
                    break;
                case UserStatus.CLOSED:
                    client.Close(request.Reason);
                    await _identityPlatformService.DisableUserAsync(client.AuthSubject, cancellationToken);
                    break;
            }

            var outboxPayload = JsonSerializer.Serialize(new
            {
                ClientId = client.ClientId,
                AuthSubject = client.AuthSubject,
                NewStatus = request.NewStatus.ToString(),
                Reason = request.Reason,
                ChangedAt = DateTime.UtcNow
            });

            var outboxEvent = OutboxEvent.Create(
                AggregateType.CLIENT,
                client.ClientId.ToString(),
                "ClientStatusChanged",
                outboxPayload);

            await _unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                await _clientRepository.UpdateAsync(client, cancellationToken);
                await _outboxRepository.AddAsync(outboxEvent, cancellationToken);
            }, cancellationToken);

            return;
        }

        throw new EntityNotFoundException("Cliente", id);
    }

    public async Task AssignRoleAsync(Guid adminId, AssignRolesRequest request, CancellationToken cancellationToken = default)
    {
        var admin = await _adminRepository.GetByIdAsync(adminId, cancellationToken)
            ?? throw new EntityNotFoundException("Administrador", adminId);

        admin.UpdateAdminLevel(request.AdminLevel);
        await _adminRepository.UpdateAsync(admin, cancellationToken);

        // Actualizar Custom Claims en Identity Platform
        var claims = new Dictionary<string, object>
        {
            { "roles", new[] { admin.AdminLevel.ToString() } },
            { "adminId", admin.AdministratorId.ToString() },
            { "status", admin.Status.ToString() }
        };
        await _identityPlatformService.SetCustomUserClaimsAsync(admin.AuthSubject, claims, cancellationToken);
    }

    public async Task<AdminUserDetailResponse> CreateAdminUserAsync(CreateAdminRequest request, CancellationToken cancellationToken = default)
    {
        if (await _adminRepository.GetByEmailAsync(request.Email, cancellationToken) != null)
            throw new ConflictException("Ya existe un administrador con este correo.", "EMAIL_ALREADY_EXISTS");

        var authSubject = await _identityPlatformService.CreateUserAsync(
            request.Email,
            request.Password,
            request.FullName,
            cancellationToken);

        var admin = Administrator.Create(
            Guid.NewGuid(),
            authSubject,
            request.Email,
            request.FullName,
            request.AdminLevel);

        var claims = new Dictionary<string, object>
        {
            { "roles", new[] { admin.AdminLevel.ToString() } },
            { "adminId", admin.AdministratorId.ToString() },
            { "status", admin.Status.ToString() }
        };
        await _identityPlatformService.SetCustomUserClaimsAsync(authSubject, claims, cancellationToken);

        await _adminRepository.AddAsync(admin, cancellationToken);

        return new AdminUserDetailResponse(
            admin.AdministratorId,
            admin.AuthSubject,
            admin.Email,
            admin.DisplayName,
            null,
            null,
            "ADMIN",
            admin.AdminLevel.ToString(),
            admin.Status,
            admin.CreatedAt,
            admin.UpdatedAt);
    }
}
