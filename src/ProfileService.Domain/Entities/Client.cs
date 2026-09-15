using System.Text.RegularExpressions;
using ProfileService.Domain.Common;
using ProfileService.Domain.Enums;

namespace ProfileService.Domain.Entities;

// Espejo del modelo de dominio para la tabla `clients` de Spanner (finanzas-core).
// Ver spanner/01_schema.sql — cualquier campo nuevo debe existir primero ahí.
public class Client : BaseEntity
{
    public Guid ClientId { get; private set; }
    public string AuthSubject { get; private set; } = string.Empty; // sub del JWT de Identity Platform
    public string Email { get; private set; } = string.Empty;
    public string Username { get; private set; } = string.Empty;
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string? Alias { get; private set; }
    public string PublicTransferCode { get; private set; } = string.Empty; // código público para recibir transferencias
    public UserStatus Status { get; private set; }
    public string Timezone { get; private set; } = "America/Bogota";

    public string FullName => $"{FirstName} {LastName}".Trim();

    private Client() { } // For deserialization

    // publicTransferCode se genera y valida por unicidad en la capa de aplicación
    // (necesita consultar el repositorio), no aquí.
    public static Client Create(
        Guid clientId,
        string authSubject,
        string email,
        string username,
        string firstName,
        string lastName,
        string publicTransferCode,
        string? alias = null,
        string timezone = "America/Bogota")
    {
        if (clientId == Guid.Empty)
            throw new BusinessRuleValidationException("El identificador del cliente no puede ser vacío.", "INVALID_CLIENT_ID");

        if (string.IsNullOrWhiteSpace(authSubject))
            throw new BusinessRuleValidationException("El UID de Identity Platform es obligatorio.", "REQUIRED_AUTH_SUBJECT");

        if (string.IsNullOrWhiteSpace(publicTransferCode))
            throw new BusinessRuleValidationException("El código público de transferencia es obligatorio.", "REQUIRED_PUBLIC_TRANSFER_CODE");

        var client = new Client
        {
            ClientId = clientId,
            AuthSubject = authSubject.Trim(),
            PublicTransferCode = publicTransferCode.Trim().ToUpperInvariant(),
            Status = UserStatus.ACTIVE,
            Timezone = string.IsNullOrWhiteSpace(timezone) ? "America/Bogota" : timezone.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        client.SetEmail(email);
        client.SetUsername(username);
        client.SetName(firstName, lastName);
        client.SetAlias(alias);

        return client;
    }

    public void UpdateProfile(string firstName, string lastName, string? alias = null)
    {
        EnsureActive();
        SetName(firstName, lastName);
        SetAlias(alias);
        UpdatedAt = DateTime.UtcNow;
    }

    public void Suspend(string reason)
    {
        if (Status == UserStatus.SUSPENDED)
            throw new BusinessRuleValidationException("El cliente ya se encuentra suspendido.", "ALREADY_SUSPENDED");

        Status = UserStatus.SUSPENDED;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        if (Status == UserStatus.ACTIVE)
            throw new BusinessRuleValidationException("El cliente ya se encuentra activo.", "ALREADY_ACTIVE");

        Status = UserStatus.ACTIVE;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Close(string reason)
    {
        Status = UserStatus.CLOSED;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool CanOperate() => Status == UserStatus.ACTIVE;

    private void EnsureActive()
    {
        if (Status != UserStatus.ACTIVE)
            throw new BusinessRuleValidationException($"El cliente no está activo. Estado actual: {Status}", "INACTIVE_CLIENT");
    }

    private void SetEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new BusinessRuleValidationException("El correo electrónico es obligatorio.", "REQUIRED_EMAIL");

        var normalizedEmail = email.Trim().ToLowerInvariant();
        if (!Regex.IsMatch(normalizedEmail, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            throw new BusinessRuleValidationException("El formato del correo electrónico es inválido.", "INVALID_EMAIL_FORMAT");

        Email = normalizedEmail;
    }

    private void SetUsername(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new BusinessRuleValidationException("El nombre de usuario es obligatorio.", "REQUIRED_USERNAME");

        var normalized = username.Trim();
        if (!Regex.IsMatch(normalized, @"^[a-zA-Z0-9_]{3,50}$"))
            throw new BusinessRuleValidationException("El nombre de usuario debe tener entre 3 y 50 caracteres alfanuméricos o guión bajo.", "INVALID_USERNAME_FORMAT");

        Username = normalized;
    }

    private void SetAlias(string? alias)
    {
        if (string.IsNullOrWhiteSpace(alias))
        {
            Alias = null;
            return;
        }

        var trimmed = alias.Trim();
        if (trimmed.Length > 50)
            throw new BusinessRuleValidationException("El alias no puede exceder 50 caracteres.", "INVALID_ALIAS_LENGTH");

        Alias = trimmed;
    }

    private void SetName(string firstName, string lastName)
    {
        if (string.IsNullOrWhiteSpace(firstName))
            throw new BusinessRuleValidationException("El nombre es obligatorio.", "REQUIRED_FIRST_NAME");

        if (string.IsNullOrWhiteSpace(lastName))
            throw new BusinessRuleValidationException("El apellido es obligatorio.", "REQUIRED_LAST_NAME");

        FirstName = firstName.Trim();
        LastName = lastName.Trim();
    }

    // Hidrata una instancia ya persistida sin re-disparar las reglas de creación.
    // Público porque lo invoca el mapeo de fila del repositorio (otro ensamblado),
    // pero solo debe usarse ahí — para crear un cliente nuevo usar Create().
    public static Client Hydrate(
        Guid clientId,
        string authSubject,
        string email,
        string username,
        string firstName,
        string lastName,
        string? alias,
        string publicTransferCode,
        UserStatus status,
        string timezone,
        DateTime createdAt,
        DateTime updatedAt)
    {
        return new Client
        {
            ClientId = clientId,
            AuthSubject = authSubject,
            Email = email,
            Username = username,
            FirstName = firstName,
            LastName = lastName,
            Alias = alias,
            PublicTransferCode = publicTransferCode,
            Status = status,
            Timezone = timezone,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt
        };
    }
}
