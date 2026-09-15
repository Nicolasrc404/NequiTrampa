using System.Security.Cryptography;
using System.Text.Json;
using ProfileService.Application.DTOs;
using ProfileService.Application.Interfaces;
using ProfileService.Domain.Common;
using ProfileService.Domain.Entities;
using ProfileService.Domain.Enums;
using ProfileService.Domain.Repositories;

namespace ProfileService.Application.Services;

public class AuthApplicationService : IAuthApplicationService
{
    // Alfabeto sin caracteres ambiguos (0/O, 1/I/L) para códigos que un humano
    // puede transcribir a mano al recibir una transferencia.
    private const string PublicCodeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const int PublicCodeLength = 8;
    private const int MaxPublicCodeAttempts = 5;

    private readonly IClientRepository _clientRepository;
    private readonly IOutboxRepository _outboxRepository;
    private readonly IIdentityPlatformService _identityPlatformService;
    private readonly IUnitOfWork _unitOfWork;

    public AuthApplicationService(
        IClientRepository clientRepository,
        IOutboxRepository outboxRepository,
        IIdentityPlatformService identityPlatformService,
        IUnitOfWork unitOfWork)
    {
        _clientRepository = clientRepository;
        _outboxRepository = outboxRepository;
        _identityPlatformService = identityPlatformService;
        _unitOfWork = unitOfWork;
    }

    public async Task<RegisterClientResponse> RegisterClientAsync(RegisterClientRequest request, CancellationToken cancellationToken = default)
    {
        // 1. Validar unicidad previa en Spanner
        if (await _clientRepository.ExistsByEmailAsync(request.Email, cancellationToken))
            throw new ConflictException("Ya existe un cliente registrado con este correo electrónico.", "EMAIL_ALREADY_EXISTS");

        if (await _clientRepository.ExistsByUsernameAsync(request.Username, cancellationToken))
            throw new ConflictException("Ya existe un cliente registrado con este nombre de usuario.", "USERNAME_ALREADY_EXISTS");

        // 2. Crear usuario en Identity Platform
        var displayName = $"{request.FirstName} {request.LastName}".Trim();
        var authSubject = await _identityPlatformService.CreateUserAsync(
            request.Email,
            request.Password,
            displayName,
            cancellationToken);

        var clientId = Guid.NewGuid();

        try
        {
            // 3. Generar el código público de transferencia (único, reintenta en colisión)
            var publicTransferCode = await GenerateUniquePublicTransferCodeAsync(cancellationToken);

            // 4. Crear entidad de Dominio Client
            var client = Client.Create(
                clientId,
                authSubject,
                request.Email,
                request.Username,
                request.FirstName,
                request.LastName,
                publicTransferCode,
                request.Alias);

            // 5. Inyectar Custom Claims en Identity Platform
            var customClaims = new Dictionary<string, object>
            {
                { "roles", new[] { "CLIENTE" } },
                { "clientId", client.ClientId.ToString() },
                { "status", client.Status.ToString() }
            };
            await _identityPlatformService.SetCustomUserClaimsAsync(authSubject, customClaims, cancellationToken);

            // 6. Crear Evento Outbox Transaccional (ClientRegistered)
            var outboxPayload = JsonSerializer.Serialize(new
            {
                ClientId = client.ClientId,
                AuthSubject = client.AuthSubject,
                Email = client.Email,
                Username = client.Username,
                FullName = client.FullName,
                PublicTransferCode = client.PublicTransferCode,
                Status = client.Status.ToString(),
                CreatedAt = client.CreatedAt
            });

            var outboxEvent = OutboxEvent.Create(
                AggregateType.CLIENT,
                client.ClientId.ToString(),
                "ClientRegistered",
                outboxPayload);

            // 7. Persistir de forma atómica en Spanner (Cliente + Outbox)
            await _unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                await _clientRepository.AddAsync(client, cancellationToken);
                await _outboxRepository.AddAsync(outboxEvent, cancellationToken);
            }, cancellationToken);

            return new RegisterClientResponse(
                client.ClientId,
                client.AuthSubject,
                client.Email,
                client.Username,
                client.FullName,
                client.PublicTransferCode,
                client.Status,
                client.CreatedAt);
        }
        catch (Exception)
        {
            // Compensación: eliminar usuario huérfano en Identity Platform si falla la persistencia
            try
            {
                await _identityPlatformService.DeleteUserAsync(authSubject, CancellationToken.None);
            }
            catch
            {
                // Loguear error de compensación
            }
            throw;
        }
    }

    public async Task SyncUserClaimsAsync(string authSubject, CancellationToken cancellationToken = default)
    {
        var client = await _clientRepository.GetByAuthSubjectAsync(authSubject, cancellationToken);
        if (client != null)
        {
            var claims = new Dictionary<string, object>
            {
                { "roles", new[] { "CLIENTE" } },
                { "clientId", client.ClientId.ToString() },
                { "status", client.Status.ToString() }
            };
            await _identityPlatformService.SetCustomUserClaimsAsync(authSubject, claims, cancellationToken);
            return;
        }

        throw new EntityNotFoundException("Usuario", authSubject);
    }

    private async Task<string> GenerateUniquePublicTransferCodeAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < MaxPublicCodeAttempts; attempt++)
        {
            var candidate = GeneratePublicTransferCode();
            if (!await _clientRepository.ExistsByPublicTransferCodeAsync(candidate, cancellationToken))
                return candidate;
        }

        throw new InvalidOperationException("No se pudo generar un código público de transferencia único tras varios intentos.");
    }

    private static string GeneratePublicTransferCode()
    {
        Span<char> buffer = stackalloc char[PublicCodeLength];
        for (var i = 0; i < PublicCodeLength; i++)
        {
            var index = RandomNumberGenerator.GetInt32(PublicCodeAlphabet.Length);
            buffer[i] = PublicCodeAlphabet[index];
        }

        return new string(buffer);
    }
}
