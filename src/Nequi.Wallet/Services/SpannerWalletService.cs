using Google.Cloud.Spanner.Data;
using Google.Cloud.Spanner.V1;
using Microsoft.Extensions.Logging;
using Nequi.Shared.Data;
using Nequi.Wallet.DTOs;
using Nequi.Wallet.Exceptions;
using Nequi.Wallet.Interfaces;

namespace Nequi.Wallet.Services;

/// <summary>
/// Implementación autoritativa de <see cref="IWalletService"/> respaldada por Google Cloud Spanner.
/// Consulta en la tabla física <c>clients</c> por <c>auth_subject</c> y en <c>wallet_accounts</c> por <c>CLIENT_WALLET</c>.
/// </summary>
public sealed class SpannerWalletService(SpannerDb db, ILogger<SpannerWalletService> logger) : IWalletService
{
    private const string SelectBalanceSql =
        "SELECT " +
        "    wa.account_id, " +
        "    c.client_id, " +
        "    wa.current_balance_minor, " +
        "    wa.currency, " +
        "    wa.status, " +
        "    wa.version, " +
        "    CURRENT_TIMESTAMP() AS as_of " +
        "FROM clients c " +
        "JOIN wallet_accounts wa ON wa.client_id = c.client_id " +
        "WHERE c.auth_subject = @authSubject " +
        "  AND c.status = 'ACTIVE' " +
        "  AND wa.account_type = 'CLIENT_WALLET' " +
        "  AND wa.status = 'ACTIVE'";

    private const string SelectWalletSql =
        "SELECT " +
        "    wa.account_id, " +
        "    c.client_id, " +
        "    c.public_transfer_code, " +
        "    wa.status, " +
        "    wa.currency, " +
        "    wa.created_at, " +
        "    wa.updated_at " +
        "FROM clients c " +
        "JOIN wallet_accounts wa ON wa.client_id = c.client_id " +
        "WHERE c.auth_subject = @authSubject " +
        "  AND c.status = 'ACTIVE' " +
        "  AND wa.account_type = 'CLIENT_WALLET' " +
        "  AND wa.status = 'ACTIVE'";

    /// <summary>
    /// Consulta el saldo autoritativo en Cloud Spanner para el sujeto autenticado (<paramref name="clientId"/> = auth_subject).
    /// </summary>
    public async Task<WalletBalanceResponseDto> GetOfficialBalanceAsync(string clientId, CancellationToken cancellationToken = default)
    {
        var authSubject = clientId;
        logger.LogInformation("Consultando saldo autoritativo en Cloud Spanner para auth_subject {AuthSubject}", authSubject);

        await using var conn = db.Open();
        var cmd = conn.CreateSelectCommand(SelectBalanceSql);
        cmd.Parameters.Add("authSubject", SpannerDbType.String, authSubject);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            logger.LogWarning("Billetera no encontrada o inactiva en Cloud Spanner para auth_subject {AuthSubject}", authSubject);
            throw new WalletNotFoundException("Cuenta de billetera no encontrada o inactiva para el cliente autenticado.");
        }

        var accountId = reader.GetString(0);
        var resolvedClientId = reader.GetString(1);
        var balanceNumeric = reader.GetNumeric(2);
        var currency = reader.GetString(3);
        // reader.GetString(4) -> status
        // reader.GetInt64(5) -> version
        var asOfDateTime = reader.GetFieldValue<DateTime>(6);
        var asOf = new DateTimeOffset(DateTime.SpecifyKind(asOfDateTime, DateTimeKind.Utc));

        // Manejo de NUMERIC sin pérdida de precisión (sin float/double)
        var minorDecimal = (decimal)balanceNumeric;
        if (minorDecimal < long.MinValue || minorDecimal > long.MaxValue || minorDecimal % 1m != 0)
        {
            throw new InvalidOperationException(
                $"El saldo en Spanner no es un número entero de unidades menores válido: {balanceNumeric}.");
        }

        var availableBalanceCents = checked((long)minorDecimal);
        var availableBalance = minorDecimal / 100m;

        return new WalletBalanceResponseDto(
            WalletId: accountId,
            ClientId: resolvedClientId,
            AvailableBalance: availableBalance,
            AvailableBalanceCents: availableBalanceCents,
            Currency: currency,
            AsOfTimestamp: asOf,
            SourceAuthority: "CLOUD_SPANNER"
        );
    }

    /// <summary>
    /// Consulta los detalles de la billetera digital en Cloud Spanner para el sujeto autenticado (<paramref name="clientId"/> = auth_subject).
    /// </summary>
    public async Task<WalletResponseDto> GetWalletByClientIdAsync(string clientId, CancellationToken cancellationToken = default)
    {
        var authSubject = clientId;
        logger.LogInformation("Consultando detalles de billetera en Cloud Spanner para auth_subject {AuthSubject}", authSubject);

        await using var conn = db.Open();
        var cmd = conn.CreateSelectCommand(SelectWalletSql);
        cmd.Parameters.Add("authSubject", SpannerDbType.String, authSubject);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            logger.LogWarning("Billetera no encontrada o inactiva en Cloud Spanner para auth_subject {AuthSubject}", authSubject);
            throw new WalletNotFoundException("Cuenta de billetera no encontrada o inactiva para el cliente autenticado.");
        }

        var accountId = reader.GetString(0);
        var resolvedClientId = reader.GetString(1);
        var publicCode = reader.IsDBNull(2) ? string.Empty : reader.GetString(2);
        var status = reader.GetString(3);
        var currency = reader.GetString(4);
        var createdAtDt = reader.GetFieldValue<DateTime>(5);
        var updatedAtDt = reader.IsDBNull(6) ? createdAtDt : reader.GetFieldValue<DateTime>(6);

        return new WalletResponseDto(
            WalletId: accountId,
            ClientId: resolvedClientId,
            PhoneNumber: publicCode,
            Status: status,
            Currency: currency,
            CreatedAt: new DateTimeOffset(DateTime.SpecifyKind(createdAtDt, DateTimeKind.Utc)),
            UpdatedAt: new DateTimeOffset(DateTime.SpecifyKind(updatedAtDt, DateTimeKind.Utc))
        );
    }
}
