using Google.Cloud.Spanner.Data;
using ProfileService.Domain.Entities;
using ProfileService.Domain.Enums;
using ProfileService.Domain.Repositories;

namespace ProfileService.Infrastructure.Persistence;

// Mapea 1:1 contra la tabla `clients` real de Spanner (spanner/01_schema.sql).
public class SpannerClientRepository : IClientRepository
{
    private const string SelectColumns = @"client_id, auth_subject, email, username, first_name, last_name,
                   alias, public_transfer_code, status, timezone, created_at, updated_at";

    private readonly ISpannerContext _context;

    public SpannerClientRepository(ISpannerContext context)
    {
        _context = context;
    }

    public async Task<Client?> GetByIdAsync(Guid clientId, CancellationToken cancellationToken = default)
    {
        var sql = $"SELECT {SelectColumns} FROM clients WHERE client_id = @clientId";

        return await QuerySingleClientAsync(sql, new SpannerParameterCollection
        {
            { "clientId", SpannerDbType.String, clientId.ToString() }
        }, cancellationToken);
    }

    public async Task<Client?> GetByAuthSubjectAsync(string authSubject, CancellationToken cancellationToken = default)
    {
        var sql = $"SELECT {SelectColumns} FROM clients WHERE auth_subject = @authSubject";

        return await QuerySingleClientAsync(sql, new SpannerParameterCollection
        {
            { "authSubject", SpannerDbType.String, authSubject }
        }, cancellationToken);
    }

    public async Task<Client?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        var sql = $"SELECT {SelectColumns} FROM clients WHERE username = @username";

        return await QuerySingleClientAsync(sql, new SpannerParameterCollection
        {
            { "username", SpannerDbType.String, username }
        }, cancellationToken);
    }

    public async Task<Client?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var sql = $"SELECT {SelectColumns} FROM clients WHERE email = @email";

        return await QuerySingleClientAsync(sql, new SpannerParameterCollection
        {
            { "email", SpannerDbType.String, email.ToLowerInvariant() }
        }, cancellationToken);
    }

    public async Task<Client?> GetByPublicTransferCodeAsync(string publicTransferCode, CancellationToken cancellationToken = default)
    {
        var sql = $"SELECT {SelectColumns} FROM clients WHERE public_transfer_code = @publicTransferCode";

        return await QuerySingleClientAsync(sql, new SpannerParameterCollection
        {
            { "publicTransferCode", SpannerDbType.String, publicTransferCode.ToUpperInvariant() }
        }, cancellationToken);
    }

    public async Task<bool> ExistsByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT COUNT(1) FROM clients WHERE username = @username";
        return await ExecuteCountAsync(sql, new SpannerParameterCollection
        {
            { "username", SpannerDbType.String, username }
        }, cancellationToken) > 0;
    }

    public async Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT COUNT(1) FROM clients WHERE email = @email";
        return await ExecuteCountAsync(sql, new SpannerParameterCollection
        {
            { "email", SpannerDbType.String, email.ToLowerInvariant() }
        }, cancellationToken) > 0;
    }

    public async Task<bool> ExistsByPublicTransferCodeAsync(string publicTransferCode, CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT COUNT(1) FROM clients WHERE public_transfer_code = @publicTransferCode";
        return await ExecuteCountAsync(sql, new SpannerParameterCollection
        {
            { "publicTransferCode", SpannerDbType.String, publicTransferCode.ToUpperInvariant() }
        }, cancellationToken) > 0;
    }

    public async Task AddAsync(Client client, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            INSERT INTO clients (client_id, auth_subject, email, username, first_name, last_name,
                                 alias, public_transfer_code, status, timezone, created_at, updated_at)
            VALUES (@clientId, @authSubject, @email, @username, @firstName, @lastName,
                    @alias, @publicTransferCode, @status, @timezone, @createdAt, @updatedAt)";

        var parameters = new SpannerParameterCollection
        {
            { "clientId", SpannerDbType.String, client.ClientId.ToString() },
            { "authSubject", SpannerDbType.String, client.AuthSubject },
            { "email", SpannerDbType.String, client.Email },
            { "username", SpannerDbType.String, client.Username },
            { "firstName", SpannerDbType.String, client.FirstName },
            { "lastName", SpannerDbType.String, client.LastName },
            { "alias", SpannerDbType.String, client.Alias },
            { "publicTransferCode", SpannerDbType.String, client.PublicTransferCode },
            { "status", SpannerDbType.String, client.Status.ToString() },
            { "timezone", SpannerDbType.String, client.Timezone },
            { "createdAt", SpannerDbType.Timestamp, client.CreatedAt },
            { "updatedAt", SpannerDbType.Timestamp, client.UpdatedAt }
        };

        await ExecuteNonQueryAsync(sql, parameters, cancellationToken);
    }

    public async Task UpdateAsync(Client client, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            UPDATE clients
            SET first_name = @firstName,
                last_name = @lastName,
                alias = @alias,
                status = @status,
                updated_at = @updatedAt
            WHERE client_id = @clientId";

        var parameters = new SpannerParameterCollection
        {
            { "clientId", SpannerDbType.String, client.ClientId.ToString() },
            { "firstName", SpannerDbType.String, client.FirstName },
            { "lastName", SpannerDbType.String, client.LastName },
            { "alias", SpannerDbType.String, client.Alias },
            { "status", SpannerDbType.String, client.Status.ToString() },
            { "updatedAt", SpannerDbType.Timestamp, client.UpdatedAt }
        };

        await ExecuteNonQueryAsync(sql, parameters, cancellationToken);
    }

    public async Task<IReadOnlyList<Client>> ListAsync(int page = 1, int pageSize = 20, string? search = null, UserStatus? status = null, CancellationToken cancellationToken = default)
    {
        var offset = (page - 1) * pageSize;
        var whereClauses = new List<string>();
        var parameters = new SpannerParameterCollection();

        if (!string.IsNullOrWhiteSpace(search))
        {
            whereClauses.Add("(LOWER(email) LIKE @search OR LOWER(username) LIKE @search OR LOWER(first_name) LIKE @search OR LOWER(last_name) LIKE @search)");
            parameters.Add("search", SpannerDbType.String, $"%{search.ToLowerInvariant()}%");
        }

        if (status.HasValue)
        {
            whereClauses.Add("status = @status");
            parameters.Add("status", SpannerDbType.String, status.Value.ToString());
        }

        var whereSql = whereClauses.Count > 0 ? "WHERE " + string.Join(" AND ", whereClauses) : "";
        var sql = $@"
            SELECT {SelectColumns}
            FROM clients
            {whereSql}
            ORDER BY created_at DESC
            LIMIT @pageSize OFFSET @offset";

        parameters.Add("pageSize", SpannerDbType.Int64, (long)pageSize);
        parameters.Add("offset", SpannerDbType.Int64, (long)offset);

        return await QueryClientsListAsync(sql, parameters, cancellationToken);
    }

    public async Task<int> CountAsync(string? search = null, UserStatus? status = null, CancellationToken cancellationToken = default)
    {
        var whereClauses = new List<string>();
        var parameters = new SpannerParameterCollection();

        if (!string.IsNullOrWhiteSpace(search))
        {
            whereClauses.Add("(LOWER(email) LIKE @search OR LOWER(username) LIKE @search OR LOWER(first_name) LIKE @search OR LOWER(last_name) LIKE @search)");
            parameters.Add("search", SpannerDbType.String, $"%{search.ToLowerInvariant()}%");
        }

        if (status.HasValue)
        {
            whereClauses.Add("status = @status");
            parameters.Add("status", SpannerDbType.String, status.Value.ToString());
        }

        var whereSql = whereClauses.Count > 0 ? "WHERE " + string.Join(" AND ", whereClauses) : "";
        var sql = $"SELECT COUNT(1) FROM clients {whereSql}";

        return (int)await ExecuteCountAsync(sql, parameters, cancellationToken);
    }

    private async Task<Client?> QuerySingleClientAsync(string sql, SpannerParameterCollection parameters, CancellationToken cancellationToken)
    {
        var list = await QueryClientsListAsync(sql, parameters, cancellationToken);
        return list.Count > 0 ? list[0] : null;
    }

    private async Task<IReadOnlyList<Client>> QueryClientsListAsync(string sql, SpannerParameterCollection parameters, CancellationToken cancellationToken)
    {
        var results = new List<Client>();
        var tx = _context.CurrentTransaction;

        if (tx != null)
        {
            var conn = (SpannerConnection)tx.Connection!;
            using var cmd = conn.CreateSelectCommand(sql, parameters);
            cmd.Transaction = tx;
            using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                results.Add(MapRowToClient(reader));
            }
        }
        else
        {
            await using var connection = _context.GetConnection();
            await connection.OpenAsync(cancellationToken);
            using var cmd = connection.CreateSelectCommand(sql, parameters);
            using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                results.Add(MapRowToClient(reader));
            }
        }

        return results;
    }

    private async Task<long> ExecuteCountAsync(string sql, SpannerParameterCollection parameters, CancellationToken cancellationToken)
    {
        var tx = _context.CurrentTransaction;
        if (tx != null)
        {
            var conn = (SpannerConnection)tx.Connection!;
            using var cmd = conn.CreateSelectCommand(sql, parameters);
            cmd.Transaction = tx;
            var scalar = await cmd.ExecuteScalarAsync(cancellationToken);
            return Convert.ToInt64(scalar);
        }
        else
        {
            await using var connection = _context.GetConnection();
            await connection.OpenAsync(cancellationToken);
            using var cmd = connection.CreateSelectCommand(sql, parameters);
            var scalar = await cmd.ExecuteScalarAsync(cancellationToken);
            return Convert.ToInt64(scalar);
        }
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
            await using var connection = _context.GetConnection();
            await connection.OpenAsync(cancellationToken);
            using var cmd = connection.CreateDmlCommand(sql, parameters);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private static Client MapRowToClient(SpannerDataReader reader)
    {
        var clientId = Guid.Parse(reader.GetFieldValue<string>("client_id"));
        var authSubject = reader.GetFieldValue<string>("auth_subject");
        var email = reader.GetFieldValue<string>("email");
        var username = reader.GetFieldValue<string>("username");
        var firstName = reader.GetFieldValue<string>("first_name");
        var lastName = reader.GetFieldValue<string>("last_name");
        var alias = reader.IsDBNull(reader.GetOrdinal("alias")) ? null : reader.GetFieldValue<string>("alias");
        var publicTransferCode = reader.GetFieldValue<string>("public_transfer_code");
        var statusStr = reader.GetFieldValue<string>("status");
        var timezone = reader.GetFieldValue<string>("timezone");
        var createdAt = reader.GetFieldValue<DateTime>("created_at");
        var updatedAt = reader.GetFieldValue<DateTime>("updated_at");

        var status = Enum.Parse<UserStatus>(statusStr, true);

        return Client.Hydrate(clientId, authSubject, email, username, firstName, lastName, alias, publicTransferCode, status, timezone, createdAt, updatedAt);
    }
}
