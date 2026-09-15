using ProfileService.Domain.Enums;

namespace ProfileService.Application.DTOs;

public record RegisterClientRequest(
    string Email,
    string Password,
    string Username,
    string FirstName,
    string LastName,
    string? Alias
);

public record RegisterClientResponse(
    Guid ClientId,
    string AuthSubject,
    string Email,
    string Username,
    string FullName,
    string PublicTransferCode,
    UserStatus Status,
    DateTime CreatedAt
);

public record SyncClaimsRequest(
    string AuthSubject
);

public record ClientProfileResponse(
    Guid ClientId,
    string AuthSubject,
    string Email,
    string Username,
    string FirstName,
    string LastName,
    string FullName,
    string? Alias,
    string PublicTransferCode,
    UserStatus Status,
    string Timezone,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record UpdateProfileRequest(
    string FirstName,
    string LastName,
    string? Alias
);

public record ClientAccessResponse(
    Guid ClientId,
    string AuthSubject,
    string Email,
    IReadOnlyList<string> Roles,
    UserStatus Status
);

// Resolución de destinatario para transferencias: por código público (no hay
// phone_number en el esquema real de `clients`) o por email.
public record ResolveTargetResponse(
    Guid TargetClientId,
    string PublicTransferCode,
    string TargetName,
    bool Exists,
    bool CanReceiveTransfers
);
