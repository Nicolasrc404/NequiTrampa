using System.Text.Json;
using ProfileService.Application.DTOs;
using ProfileService.Application.Interfaces;
using ProfileService.Domain.Common;
using ProfileService.Domain.Entities;
using ProfileService.Domain.Enums;
using ProfileService.Domain.Repositories;

namespace ProfileService.Application.Services;

public class BeneficiaryApplicationService : IBeneficiaryService
{
    private readonly IBeneficiaryRepository _beneficiaryRepository;
    private readonly IClientRepository _clientRepository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUnitOfWork _unitOfWork;

    public BeneficiaryApplicationService(
        IBeneficiaryRepository beneficiaryRepository,
        IClientRepository clientRepository,
        IOutboxRepository outboxRepository,
        ICurrentUserService currentUserService,
        IUnitOfWork unitOfWork)
    {
        _beneficiaryRepository = beneficiaryRepository;
        _clientRepository = clientRepository;
        _outboxRepository = outboxRepository;
        _currentUserService = currentUserService;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<BeneficiaryResponse>> GetMyBeneficiariesAsync(CancellationToken cancellationToken = default)
    {
        var clientId = _currentUserService.GetRequiredClientId();
        var beneficiaries = await _beneficiaryRepository.GetByClientIdAsync(clientId, cancellationToken);
        return beneficiaries.Select(MapToResponse).ToList();
    }

    public async Task<BeneficiaryResponse> AddBeneficiaryAsync(CreateBeneficiaryRequest request, CancellationToken cancellationToken = default)
    {
        var clientId = _currentUserService.GetRequiredClientId();

        // 1. Resolver el cliente destinatario
        var targetClient = await _clientRepository.GetByPublicTransferCodeAsync(request.TargetPublicCode, cancellationToken)
            ?? throw new EntityNotFoundException("Destinatario", request.TargetPublicCode);

        if (targetClient.ClientId == clientId)
            throw new BusinessRuleValidationException("No puedes agregarte a ti mismo como beneficiario.", "CANNOT_ADD_SELF");

        if (!targetClient.CanOperate())
            throw new BusinessRuleValidationException("El destinatario no se encuentra activo para recibir operaciones.", "TARGET_NOT_ACTIVE");

        // 2. Validar que no esté agregado previamente
        if (await _beneficiaryRepository.ExistsAsync(clientId, targetClient.ClientId, cancellationToken))
            throw new ConflictException("Este contacto ya está registrado como beneficiario.", "BENEFICIARY_ALREADY_EXISTS");

        // NOTA: la tabla `beneficiaries` no existe todavía en el esquema real de
        // Spanner (ver TROUBLESHOOTING.md) — este flujo compila pero fallará en runtime.
        var beneficiary = Beneficiary.Create(
            Guid.NewGuid(),
            clientId,
            targetClient.ClientId,
            request.Alias,
            targetClient.PublicTransferCode,
            targetClient.FullName);

        var outboxPayload = JsonSerializer.Serialize(new
        {
            BeneficiaryId = beneficiary.BeneficiaryId,
            ClientId = beneficiary.ClientId,
            TargetClientId = beneficiary.TargetClientId,
            Alias = beneficiary.Alias,
            TargetPhoneNumber = beneficiary.TargetPhoneNumber,
            CreatedAt = beneficiary.CreatedAt
        });

        var outboxEvent = OutboxEvent.Create(
            AggregateType.BENEFICIARY,
            beneficiary.BeneficiaryId.ToString(),
            "BeneficiaryAdded",
            outboxPayload);

        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _beneficiaryRepository.AddAsync(beneficiary, cancellationToken);
            await _outboxRepository.AddAsync(outboxEvent, cancellationToken);
        }, cancellationToken);

        return MapToResponse(beneficiary);
    }

    public async Task<BeneficiaryResponse> UpdateBeneficiaryAliasAsync(Guid beneficiaryId, UpdateBeneficiaryRequest request, CancellationToken cancellationToken = default)
    {
        var clientId = _currentUserService.GetRequiredClientId();
        var beneficiary = await _beneficiaryRepository.GetByIdAsync(beneficiaryId, cancellationToken)
            ?? throw new EntityNotFoundException("Beneficiario", beneficiaryId);

        // Prevención de IDOR: Validar que el recurso pertenezca al usuario autenticado
        if (beneficiary.ClientId != clientId)
            throw new BusinessRuleValidationException("No tienes autorización sobre este beneficiario.", "UNAUTHORIZED_BENEFICIARY_ACCESS");

        beneficiary.UpdateAlias(request.Alias);
        await _beneficiaryRepository.UpdateAsync(beneficiary, cancellationToken);

        return MapToResponse(beneficiary);
    }

    public async Task DeleteBeneficiaryAsync(Guid beneficiaryId, CancellationToken cancellationToken = default)
    {
        var clientId = _currentUserService.GetRequiredClientId();
        var beneficiary = await _beneficiaryRepository.GetByIdAsync(beneficiaryId, cancellationToken)
            ?? throw new EntityNotFoundException("Beneficiario", beneficiaryId);

        // Prevención de IDOR
        if (beneficiary.ClientId != clientId)
            throw new BusinessRuleValidationException("No tienes autorización para eliminar este beneficiario.", "UNAUTHORIZED_BENEFICIARY_ACCESS");

        await _beneficiaryRepository.DeleteAsync(beneficiaryId, cancellationToken);
    }

    private static BeneficiaryResponse MapToResponse(Beneficiary b)
    {
        return new BeneficiaryResponse(
            b.BeneficiaryId,
            b.ClientId,
            b.TargetClientId,
            b.Alias,
            b.TargetPhoneNumber,
            b.TargetName,
            b.CreatedAt);
    }
}
