using ProfileService.Domain.Common;
using ProfileService.Domain.Enums;

namespace ProfileService.Domain.Entities;

// Espejo del modelo de dominio para la tabla `administrators` de Spanner (finanzas-core).
public class Administrator : BaseEntity
{
    public Guid AdministratorId { get; private set; }
    public string AuthSubject { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string DisplayName { get; private set; } = string.Empty;
    public AdminRole AdminLevel { get; private set; }
    public UserStatus Status { get; private set; }

    private Administrator() { }

    public static Administrator Create(
        Guid administratorId,
        string authSubject,
        string email,
        string displayName,
        AdminRole adminLevel = AdminRole.SUPPORT)
    {
        if (administratorId == Guid.Empty)
            throw new BusinessRuleValidationException("El ID del administrador no puede ser vacío.", "INVALID_ADMIN_ID");

        if (string.IsNullOrWhiteSpace(authSubject))
            throw new BusinessRuleValidationException("El UID de Identity Platform es obligatorio.", "REQUIRED_AUTH_SUBJECT");

        if (string.IsNullOrWhiteSpace(email))
            throw new BusinessRuleValidationException("El correo electrónico es obligatorio.", "REQUIRED_EMAIL");

        if (string.IsNullOrWhiteSpace(displayName))
            throw new BusinessRuleValidationException("El nombre completo es obligatorio.", "REQUIRED_DISPLAY_NAME");

        return new Administrator
        {
            AdministratorId = administratorId,
            AuthSubject = authSubject.Trim(),
            Email = email.Trim().ToLowerInvariant(),
            DisplayName = displayName.Trim(),
            AdminLevel = adminLevel,
            Status = UserStatus.ACTIVE,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public void UpdateAdminLevel(AdminRole newLevel)
    {
        AdminLevel = newLevel;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Suspend()
    {
        Status = UserStatus.SUSPENDED;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        Status = UserStatus.ACTIVE;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Close()
    {
        Status = UserStatus.CLOSED;
        UpdatedAt = DateTime.UtcNow;
    }

    // Público porque lo invoca el mapeo de fila del repositorio (otro ensamblado),
    // pero solo debe usarse ahí — para crear un administrador nuevo usar Create().
    public static Administrator Hydrate(
        Guid administratorId,
        string authSubject,
        string email,
        string displayName,
        AdminRole adminLevel,
        UserStatus status,
        DateTime createdAt,
        DateTime updatedAt)
    {
        return new Administrator
        {
            AdministratorId = administratorId,
            AuthSubject = authSubject,
            Email = email,
            DisplayName = displayName,
            AdminLevel = adminLevel,
            Status = status,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt
        };
    }
}
