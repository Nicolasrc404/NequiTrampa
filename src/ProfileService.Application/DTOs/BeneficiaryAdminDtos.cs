using ProfileService.Domain.Enums;

namespace ProfileService.Application.DTOs;

// NOTA: la tabla `beneficiaries` no existe en el esquema real de Spanner todavía
// (ver TROUBLESHOOTING.md). Estos contratos compilan pero el flujo falla en runtime.
public record BeneficiaryResponse(
    Guid BeneficiaryId,
    Guid ClientId,
    Guid TargetClientId,
    string Alias,
    string TargetPhoneNumber,
    string TargetName,
    DateTime CreatedAt
);

public record CreateBeneficiaryRequest(
    string TargetPublicCode,
    string Alias
);

public record UpdateBeneficiaryRequest(
    string Alias
);

public record AdminUserSummaryResponse(
    Guid Id,
    string AuthSubject,
    string Email,
    string FullName,
    string Username,
    string UserType, // "CLIENT" | "ADMIN"
    string RoleOrStatus,
    UserStatus Status,
    DateTime CreatedAt
);

public record AdminUserDetailResponse(
    Guid Id,
    string AuthSubject,
    string Email,
    string FullName,
    string? Username,
    string? PublicTransferCode,
    string UserType,
    string? AdminLevel,
    UserStatus Status,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record UpdateUserStatusRequest(
    UserStatus NewStatus,
    string Reason
);

public record AssignRolesRequest(
    AdminRole AdminLevel
);

public record CreateAdminRequest(
    string Email,
    string Password,
    string FullName,
    AdminRole AdminLevel
);

public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);
