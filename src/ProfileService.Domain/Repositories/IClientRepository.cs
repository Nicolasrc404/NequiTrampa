using ProfileService.Domain.Entities;
using ProfileService.Domain.Enums;

namespace ProfileService.Domain.Repositories;

public interface IClientRepository
{
    Task<Client?> GetByIdAsync(Guid clientId, CancellationToken cancellationToken = default);
    Task<Client?> GetByAuthSubjectAsync(string authSubject, CancellationToken cancellationToken = default);
    Task<Client?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task<Client?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<Client?> GetByPublicTransferCodeAsync(string publicTransferCode, CancellationToken cancellationToken = default);
    Task<bool> ExistsByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<bool> ExistsByPublicTransferCodeAsync(string publicTransferCode, CancellationToken cancellationToken = default);
    Task AddAsync(Client client, CancellationToken cancellationToken = default);
    Task UpdateAsync(Client client, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Client>> ListAsync(int page = 1, int pageSize = 20, string? search = null, UserStatus? status = null, CancellationToken cancellationToken = default);
    Task<int> CountAsync(string? search = null, UserStatus? status = null, CancellationToken cancellationToken = default);
}
