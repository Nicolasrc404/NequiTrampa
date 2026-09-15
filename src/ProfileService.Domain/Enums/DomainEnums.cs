namespace ProfileService.Domain.Enums;

// Coincide exactamente con el CHECK ck_clients_status / ck_admin_status de Spanner
// (spanner/01_schema.sql). No existe 'BLOCKED' ni 'PENDING_VERIFICATION' a nivel de
// base de datos: un bloqueo administrativo se modela como SUSPENDED, y CLOSED es
// el cierre definitivo de la cuenta.
public enum UserStatus
{
    ACTIVE,
    SUSPENDED,
    CLOSED
}

// Coincide con el CHECK ck_admin_level de Spanner (columna administrators.admin_level).
public enum AdminRole
{
    SUPPORT,
    OPERATOR,
    SUPERADMIN
}

public enum OutboxStatus
{
    PENDING,
    PUBLISHED,
    FAILED
}

public enum AggregateType
{
    CLIENT,
    ADMINISTRATOR,
    BENEFICIARY
}
