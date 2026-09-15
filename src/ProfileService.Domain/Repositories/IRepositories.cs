using ProfileService.Domain.Entities;
using ProfileService.Domain.Enums;

namespace ProfileService.Domain.Repositories;

public interface IAdminRepository
{
    Task<Administrator?> GetByIdAsync(Guid administratorId, CancellationToken cancellationToken = default);
    Task<Administrator?> GetByAuthSubjectAsync(string authSubject, CancellationToken cancellationToken = default);
    Task<Administrator?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task AddAsync(Administrator admin, CancellationToken cancellationToken = default);
    Task UpdateAsync(Administrator admin, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Administrator>> ListAsync(int page = 1, int pageSize = 20, AdminRole? adminLevel = null, CancellationToken cancellationToken = default);
}

// NOTA (ver TROUBLESHOOTING.md): la tabla `beneficiaries` NO existe en el esquema
// desplegado de Spanner (spanner/01_schema.sql solo define 9 tablas). Esta interfaz
// y su implementación quedan fuera del alcance de "autenticación y usuarios" — se
// dejan compilando pero fallarán en tiempo de ejecución hasta que se decida y
// aplique una migración que agregue la tabla.
public interface IBeneficiaryRepository
{
    Task<Beneficiary?> GetByIdAsync(Guid beneficiaryId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Beneficiary>> GetByClientIdAsync(Guid clientId, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(Guid clientId, Guid targetClientId, CancellationToken cancellationToken = default);
    Task AddAsync(Beneficiary beneficiary, CancellationToken cancellationToken = default);
    Task UpdateAsync(Beneficiary beneficiary, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid beneficiaryId, CancellationToken cancellationToken = default);
}

public interface IOutboxRepository
{
    Task AddAsync(OutboxEvent outboxEvent, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<OutboxEvent>> GetPendingEventsAsync(int batchSize = 50, CancellationToken cancellationToken = default);
    Task MarkAsPublishedAsync(Guid eventId, CancellationToken cancellationToken = default);
    Task MarkAsFailedAsync(Guid eventId, CancellationToken cancellationToken = default);
}

public interface IUnitOfWork
{
    Task<TResult> ExecuteInTransactionAsync<TResult>(Func<Task<TResult>> action, CancellationToken cancellationToken = default);
    Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken cancellationToken = default);
}
