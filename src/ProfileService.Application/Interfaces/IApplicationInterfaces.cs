using ProfileService.Application.DTOs;
using ProfileService.Domain.Enums;

namespace ProfileService.Application.Interfaces;

public interface ICurrentUserService
{
    string? AuthSubject { get; }
    Guid? ClientId { get; }
    Guid? AdminId { get; }
    string? Email { get; }
    IReadOnlyList<string> Roles { get; }
    bool IsAuthenticated { get; }
    bool IsInRole(string role);
    Guid GetRequiredClientId();
}

public interface IDateTimeProvider
{
    DateTime UtcNow { get; }
}

public interface IIdentityPlatformService
{
    Task<string> CreateUserAsync(string email, string password, string displayName, CancellationToken cancellationToken = default);
    Task SetCustomUserClaimsAsync(string authSubject, Dictionary<string, object> claims, CancellationToken cancellationToken = default);
    Task DisableUserAsync(string authSubject, CancellationToken cancellationToken = default);
    Task EnableUserAsync(string authSubject, CancellationToken cancellationToken = default);
    Task DeleteUserAsync(string authSubject, CancellationToken cancellationToken = default);
}

public interface IAuthApplicationService
{
    Task<RegisterClientResponse> RegisterClientAsync(RegisterClientRequest request, CancellationToken cancellationToken = default);
    Task SyncUserClaimsAsync(string authSubject, CancellationToken cancellationToken = default);
}

public interface IProfileService
{
    Task<ClientProfileResponse> GetMyProfileAsync(CancellationToken cancellationToken = default);
    Task<ClientProfileResponse> UpdateMyProfileAsync(UpdateProfileRequest request, CancellationToken cancellationToken = default);
    Task<ClientAccessResponse> GetMyAccessAsync(CancellationToken cancellationToken = default);
    Task<ResolveTargetResponse> ResolveTargetAsync(string? publicTransferCode, string? email, CancellationToken cancellationToken = default);
}

public interface IBeneficiaryService
{
    Task<IReadOnlyList<BeneficiaryResponse>> GetMyBeneficiariesAsync(CancellationToken cancellationToken = default);
    Task<BeneficiaryResponse> AddBeneficiaryAsync(CreateBeneficiaryRequest request, CancellationToken cancellationToken = default);
    Task<BeneficiaryResponse> UpdateBeneficiaryAliasAsync(Guid beneficiaryId, UpdateBeneficiaryRequest request, CancellationToken cancellationToken = default);
    Task DeleteBeneficiaryAsync(Guid beneficiaryId, CancellationToken cancellationToken = default);
}

public interface IAdminService
{
    Task<PagedResult<AdminUserSummaryResponse>> ListUsersAsync(int page, int pageSize, string? search, UserStatus? status, CancellationToken cancellationToken = default);
    Task<AdminUserDetailResponse> GetUserDetailAsync(Guid id, CancellationToken cancellationToken = default);
    Task UpdateUserStatusAsync(Guid id, UpdateUserStatusRequest request, CancellationToken cancellationToken = default);
    Task AssignRoleAsync(Guid adminId, AssignRolesRequest request, CancellationToken cancellationToken = default);
    Task<AdminUserDetailResponse> CreateAdminUserAsync(CreateAdminRequest request, CancellationToken cancellationToken = default);
}
