using Google.Cloud.Spanner.Data;
using ProfileService.Domain.Entities;
using ProfileService.Domain.Enums;
using ProfileService.Domain.Repositories;

namespace ProfileService.Infrastructure.Persistence;

// Mapea 1:1 contra la tabla `administrators` real de Spanner (spanner/01_schema.sql).
public class SpannerAdminRepository : IAdminRepository
{
    private const string SelectColumns = "administrator_id, auth_subject, email, display_name, admin_level, status, created_at, updated_at";

    private readonly ISpannerContext _context;

    public SpannerAdminRepository(ISpannerContext context)
    {
        _context = context;
    }

    public async Task<Administrator?> GetByIdAsync(Guid administratorId, CancellationToken cancellationToken = default)
    {
        var sql = $"SELECT {SelectColumns} FROM administrators WHERE administrator_id = @administratorId";

        var list = await QueryAdminsAsync(sql, new SpannerParameterCollection
        {
            { "administratorId", SpannerDbType.String, administratorId.ToString() }
        }, cancellationToken);

        return list.Count > 0 ? list[0] : null;
    }

    public async Task<Administrator?> GetByAuthSubjectAsync(string authSubject, CancellationToken cancellationToken = default)
    {
        var sql = $"SELECT {SelectColumns} FROM administrators WHERE auth_subject = @authSubject";

        var list = await QueryAdminsAsync(sql, new SpannerParameterCollection
        {
            { "authSubject", SpannerDbType.String, authSubject }
        }, cancellationToken);

        return list.Count > 0 ? list[0] : null;
    }

    public async Task<Administrator?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var sql = $"SELECT {SelectColumns} FROM administrators WHERE email = @email";

        var list = await QueryAdminsAsync(sql, new SpannerParameterCollection
        {
            { "email", SpannerDbType.String, email.ToLowerInvariant() }
        }, cancellationToken);

        return list.Count > 0 ? list[0] : null;
    }

    public async Task AddAsync(Administrator admin, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            INSERT INTO administrators (administrator_id, auth_subject, email, display_name, admin_level, status, created_at, updated_at)
            VALUES (@administratorId, @authSubject, @email, @displayName, @adminLevel, @status, @createdAt, @updatedAt)";

        var parameters = new SpannerParameterCollection
        {
            { "administratorId", SpannerDbType.String, admin.AdministratorId.ToString() },
            { "authSubject", SpannerDbType.String, admin.AuthSubject },
            { "email", SpannerDbType.String, admin.Email },
            { "displayName", SpannerDbType.String, admin.DisplayName },
            { "adminLevel", SpannerDbType.String, admin.AdminLevel.ToString() },
            { "status", SpannerDbType.String, admin.Status.ToString() },
            { "createdAt", SpannerDbType.Timestamp, admin.CreatedAt },
            { "updatedAt", SpannerDbType.Timestamp, admin.UpdatedAt }
        };

        await ExecuteNonQueryAsync(sql, parameters, cancellationToken);
    }

    public async Task UpdateAsync(Administrator admin, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            UPDATE administrators
            SET admin_level = @adminLevel, status = @status, updated_at = @updatedAt
            WHERE administrator_id = @administratorId";

        var parameters = new SpannerParameterCollection
        {
            { "administratorId", SpannerDbType.String, admin.AdministratorId.ToString() },
            { "adminLevel", SpannerDbType.String, admin.AdminLevel.ToString() },
            { "status", SpannerDbType.String, admin.Status.ToString() },
            { "updatedAt", SpannerDbType.Timestamp, admin.UpdatedAt }
        };

        await ExecuteNonQueryAsync(sql, parameters, cancellationToken);
    }

    public async Task<IReadOnlyList<Administrator>> ListAsync(int page = 1, int pageSize = 20, AdminRole? adminLevel = null, CancellationToken cancellationToken = default)
    {
        var offset = (page - 1) * pageSize;
        var whereSql = adminLevel.HasValue ? "WHERE admin_level = @adminLevel" : "";
        var sql = $@"
            SELECT {SelectColumns}
            FROM administrators
            {whereSql}
            ORDER BY created_at DESC
            LIMIT @pageSize OFFSET @offset";

        var parameters = new SpannerParameterCollection
        {
            { "pageSize", SpannerDbType.Int64, (long)pageSize },
            { "offset", SpannerDbType.Int64, (long)offset }
        };

        if (adminLevel.HasValue)
        {
            parameters.Add("adminLevel", SpannerDbType.String, adminLevel.Value.ToString());
        }

        return await QueryAdminsAsync(sql, parameters, cancellationToken);
    }

    private async Task<IReadOnlyList<Administrator>> QueryAdminsAsync(string sql, SpannerParameterCollection parameters, CancellationToken cancellationToken)
    {
        var list = new List<Administrator>();
        var tx = _context.CurrentTransaction;
        if (tx != null)
        {
            var conn = (SpannerConnection)tx.Connection!;
            using var cmd = conn.CreateSelectCommand(sql, parameters);
            cmd.Transaction = tx;
            using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                list.Add(MapRowToAdmin(reader));
            }
        }
        else
        {
            await using var conn = _context.GetConnection();
            await conn.OpenAsync(cancellationToken);
            using var cmd = conn.CreateSelectCommand(sql, parameters);
            using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                list.Add(MapRowToAdmin(reader));
            }
        }
        return list;
    }

    private async Task ExecuteNonQueryAsync(string sql, SpannerParameterCollection parameters, CancellationToken cancellationToken)
    {
        var tx = _context.CurrentTransaction;
        if (tx != null)
        {
            var conn = (SpannerConnection)tx.Connection!;
            using var cmd = conn.CreateDmlCommand(sql, parameters);
            cmd.Transaction = tx;
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
        else
        {
            await using var conn = _context.GetConnection();
            await conn.OpenAsync(cancellationToken);
            using var cmd = conn.CreateDmlCommand(sql, parameters);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private static Administrator MapRowToAdmin(SpannerDataReader reader)
    {
        var id = Guid.Parse(reader.GetFieldValue<string>("administrator_id"));
        var authSubject = reader.GetFieldValue<string>("auth_subject");
        var email = reader.GetFieldValue<string>("email");
        var displayName = reader.GetFieldValue<string>("display_name");
        var adminLevel = Enum.Parse<AdminRole>(reader.GetFieldValue<string>("admin_level"), true);
        var status = Enum.Parse<UserStatus>(reader.GetFieldValue<string>("status"), true);
        var createdAt = reader.GetFieldValue<DateTime>("created_at");
        var updatedAt = reader.GetFieldValue<DateTime>("updated_at");

        return Administrator.Hydrate(id, authSubject, email, displayName, adminLevel, status, createdAt, updatedAt);
    }
}

public class SpannerBeneficiaryRepository : IBeneficiaryRepository
{
    private readonly ISpannerContext _context;

    public SpannerBeneficiaryRepository(ISpannerContext context)
    {
        _context = context;
    }

    public async Task<Beneficiary?> GetByIdAsync(Guid beneficiaryId, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            SELECT beneficiary_id, client_id, target_client_id, alias, target_phone_number, target_name, created_at, updated_at
            FROM beneficiaries
            WHERE beneficiary_id = @beneficiaryId";

        var list = await QueryBeneficiariesAsync(sql, new SpannerParameterCollection
        {
            { "beneficiaryId", SpannerDbType.String, beneficiaryId.ToString() }
        }, cancellationToken);

        return list.Count > 0 ? list[0] : null;
    }

    public async Task<IReadOnlyList<Beneficiary>> GetByClientIdAsync(Guid clientId, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            SELECT beneficiary_id, client_id, target_client_id, alias, target_phone_number, target_name, created_at, updated_at
            FROM beneficiaries
            WHERE client_id = @clientId
            ORDER BY alias ASC";

        return await QueryBeneficiariesAsync(sql, new SpannerParameterCollection
        {
            { "clientId", SpannerDbType.String, clientId.ToString() }
        }, cancellationToken);
    }

    public async Task<bool> ExistsAsync(Guid clientId, Guid targetClientId, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            SELECT COUNT(1) 
            FROM beneficiaries 
            WHERE client_id = @clientId AND target_client_id = @targetClientId";

        var parameters = new SpannerParameterCollection
        {
            { "clientId", SpannerDbType.String, clientId.ToString() },
            { "targetClientId", SpannerDbType.String, targetClientId.ToString() }
        };

        var tx = _context.CurrentTransaction;
        if (tx != null)
        {
            var conn = (SpannerConnection)tx.Connection!;
            using var cmd = conn.CreateSelectCommand(sql, parameters);
            cmd.Transaction = tx;
            return Convert.ToInt64(await cmd.ExecuteScalarAsync(cancellationToken)) > 0;
        }
        else
        {
            await using var conn = _context.GetConnection();
            await conn.OpenAsync(cancellationToken);
            using var cmd = conn.CreateSelectCommand(sql, parameters);
            return Convert.ToInt64(await cmd.ExecuteScalarAsync(cancellationToken)) > 0;
        }
    }

    public async Task AddAsync(Beneficiary beneficiary, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            INSERT INTO beneficiaries (beneficiary_id, client_id, target_client_id, alias, target_phone_number, target_name, created_at, updated_at)
            VALUES (@beneficiaryId, @clientId, @targetClientId, @alias, @targetPhoneNumber, @targetName, @createdAt, @updatedAt)";

        var parameters = new SpannerParameterCollection
        {
            { "beneficiaryId", SpannerDbType.String, beneficiary.BeneficiaryId.ToString() },
            { "clientId", SpannerDbType.String, beneficiary.ClientId.ToString() },
            { "targetClientId", SpannerDbType.String, beneficiary.TargetClientId.ToString() },
            { "alias", SpannerDbType.String, beneficiary.Alias },
            { "targetPhoneNumber", SpannerDbType.String, beneficiary.TargetPhoneNumber },
            { "targetName", SpannerDbType.String, beneficiary.TargetName },
            { "createdAt", SpannerDbType.Timestamp, beneficiary.CreatedAt },
            { "updatedAt", SpannerDbType.Timestamp, beneficiary.UpdatedAt }
        };

        await ExecuteNonQueryAsync(sql, parameters, cancellationToken);
    }

    public async Task UpdateAsync(Beneficiary beneficiary, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            UPDATE beneficiaries
            SET alias = @alias, updated_at = @updatedAt
            WHERE beneficiary_id = @beneficiaryId";

        var parameters = new SpannerParameterCollection
        {
            { "beneficiaryId", SpannerDbType.String, beneficiary.BeneficiaryId.ToString() },
            { "alias", SpannerDbType.String, beneficiary.Alias },
            { "updatedAt", SpannerDbType.Timestamp, beneficiary.UpdatedAt }
        };

        await ExecuteNonQueryAsync(sql, parameters, cancellationToken);
    }

    public async Task DeleteAsync(Guid beneficiaryId, CancellationToken cancellationToken = default)
    {
        const string sql = "DELETE FROM beneficiaries WHERE beneficiary_id = @beneficiaryId";
        var parameters = new SpannerParameterCollection
        {
            { "beneficiaryId", SpannerDbType.String, beneficiaryId.ToString() }
        };

        await ExecuteNonQueryAsync(sql, parameters, cancellationToken);
    }

    private async Task<IReadOnlyList<Beneficiary>> QueryBeneficiariesAsync(string sql, SpannerParameterCollection parameters, CancellationToken cancellationToken)
    {
        var list = new List<Beneficiary>();
        var tx = _context.CurrentTransaction;
        if (tx != null)
        {
            var conn = (SpannerConnection)tx.Connection!;
            using var cmd = conn.CreateSelectCommand(sql, parameters);
            cmd.Transaction = tx;
            using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                list.Add(MapRowToBeneficiary(reader));
            }
        }
        else
        {
            await using var conn = _context.GetConnection();
            await conn.OpenAsync(cancellationToken);
            using var cmd = conn.CreateSelectCommand(sql, parameters);
            using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                list.Add(MapRowToBeneficiary(reader));
            }
        }
        return list;
    }

    private async Task ExecuteNonQueryAsync(string sql, SpannerParameterCollection parameters, CancellationToken cancellationToken)
    {
        var tx = _context.CurrentTransaction;
        if (tx != null)
        {
            var conn = (SpannerConnection)tx.Connection!;
            using var cmd = conn.CreateDmlCommand(sql, parameters);
            cmd.Transaction = tx;
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
        else
        {
            await using var conn = _context.GetConnection();
            await conn.OpenAsync(cancellationToken);
            using var cmd = conn.CreateDmlCommand(sql, parameters);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private static Beneficiary MapRowToBeneficiary(SpannerDataReader reader)
    {
        var id = Guid.Parse(reader.GetFieldValue<string>("beneficiary_id"));
        var clientId = Guid.Parse(reader.GetFieldValue<string>("client_id"));
        var targetClientId = Guid.Parse(reader.GetFieldValue<string>("target_client_id"));
        var alias = reader.GetFieldValue<string>("alias");
        var phone = reader.GetFieldValue<string>("target_phone_number");
        var name = reader.GetFieldValue<string>("target_name");
        var createdAt = reader.GetFieldValue<DateTime>("created_at");
        var updatedAt = reader.GetFieldValue<DateTime>("updated_at");

        var b = Beneficiary.Create(id, clientId, targetClientId, alias, phone, name);
        b.CreatedAt = createdAt;
        b.UpdatedAt = updatedAt;
        return b;
    }
}

public class SpannerOutboxRepository : IOutboxRepository
{
    private readonly ISpannerContext _context;

    public SpannerOutboxRepository(ISpannerContext context)
    {
        _context = context;
    }

    public async Task AddAsync(OutboxEvent outboxEvent, CancellationToken cancellationToken = default)
    {
        // outbox_events no tiene columna `status` (ver spanner/01_schema.sql): el
        // estado "pendiente" se modela con pending_since = created_at, y se limpia
        // (NULL) al publicar — así el índice NULL_FILTERED ix_outbox_pending solo
        // contiene los eventos pendientes.
        const string sql = @"
            INSERT INTO outbox_events (event_id, aggregate_type, aggregate_id, event_type, payload, created_at, pending_since)
            VALUES (@eventId, @aggregateType, @aggregateId, @eventType, @payload, @createdAt, @pendingSince)";

        var parameters = new SpannerParameterCollection
        {
            { "eventId", SpannerDbType.String, outboxEvent.EventId.ToString() },
            { "aggregateType", SpannerDbType.String, outboxEvent.AggregateType.ToString() },
            { "aggregateId", SpannerDbType.String, outboxEvent.AggregateId },
            { "eventType", SpannerDbType.String, outboxEvent.EventType },
            { "payload", SpannerDbType.Json, outboxEvent.Payload },
            { "createdAt", SpannerDbType.Timestamp, outboxEvent.CreatedAt },
            { "pendingSince", SpannerDbType.Timestamp, outboxEvent.CreatedAt }
        };

        var tx = _context.CurrentTransaction;
        if (tx != null)
        {
            var conn = (SpannerConnection)tx.Connection!;
            using var cmd = conn.CreateDmlCommand(sql, parameters);
            cmd.Transaction = tx;
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
        else
        {
            await using var conn = _context.GetConnection();
            await conn.OpenAsync(cancellationToken);
            using var cmd = conn.CreateDmlCommand(sql, parameters);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    public async Task<IReadOnlyList<OutboxEvent>> GetPendingEventsAsync(int batchSize = 50, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            SELECT event_id, aggregate_type, aggregate_id, event_type, payload, created_at, pending_since
            FROM outbox_events
            WHERE pending_since IS NOT NULL
            ORDER BY created_at ASC
            LIMIT @batchSize";

        var parameters = new SpannerParameterCollection
        {
            { "batchSize", SpannerDbType.Int64, (long)batchSize }
        };

        var list = new List<OutboxEvent>();
        await using var conn = _context.GetConnection();
        await conn.OpenAsync(cancellationToken);
        using var cmd = conn.CreateSelectCommand(sql, parameters);
        using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var aggType = Enum.Parse<AggregateType>(reader.GetFieldValue<string>("aggregate_type"), true);
            var aggId = reader.GetFieldValue<string>("aggregate_id");
            var eventType = reader.GetFieldValue<string>("event_type");
            var payload = reader.GetFieldValue<string>("payload");
            var evt = OutboxEvent.Create(aggType, aggId, eventType, payload);
            list.Add(evt);
        }
        return list;
    }

    public async Task MarkAsPublishedAsync(Guid eventId, CancellationToken cancellationToken = default)
    {
        const string sql = "UPDATE outbox_events SET pending_since = NULL, published_at = @now WHERE event_id = @eventId";
        var parameters = new SpannerParameterCollection
        {
            { "eventId", SpannerDbType.String, eventId.ToString() },
            { "now", SpannerDbType.Timestamp, DateTime.UtcNow }
        };

        await using var conn = _context.GetConnection();
        await conn.OpenAsync(cancellationToken);
        using var cmd = conn.CreateDmlCommand(sql, parameters);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    // No hay columna `status`: un fallo de publicación se registra en `last_error` /
    // `attempts` y el evento queda pending_since (se reintenta después).
    public async Task MarkAsFailedAsync(Guid eventId, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            UPDATE outbox_events
            SET attempts = attempts + 1, last_error = @lastError
            WHERE event_id = @eventId";
        var parameters = new SpannerParameterCollection
        {
            { "eventId", SpannerDbType.String, eventId.ToString() },
            { "lastError", SpannerDbType.String, "Fallo de publicación a Pub/Sub" }
        };

        await using var conn = _context.GetConnection();
        await conn.OpenAsync(cancellationToken);
        using var cmd = conn.CreateDmlCommand(sql, parameters);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }
}

public class SpannerUnitOfWork : IUnitOfWork
{
    private readonly ISpannerContext _context;

    public SpannerUnitOfWork(ISpannerContext context)
    {
        _context = context;
    }

    public Task<TResult> ExecuteInTransactionAsync<TResult>(Func<Task<TResult>> action, CancellationToken cancellationToken = default)
    {
        return _context.ExecuteInTransactionAsync(async _ => await action(), cancellationToken);
    }

    public Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken cancellationToken = default)
    {
        return _context.ExecuteInTransactionAsync(async _ => await action(), cancellationToken);
    }
}
