-- =============================================================================
-- NequiTrampa — Google Cloud Spanner Datos de Prueba y Cuentas Semilla
-- Moneda: COP. Unidades menores: 100 minor = 1 COP (NUMERIC).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Clientes de prueba
-- -----------------------------------------------------------------------------
INSERT INTO clients (client_id, auth_subject, public_transfer_code, status, timezone, created_at, updated_at)
VALUES
    ('cli_alejandro_0001', 'client-1', 'TRF-ALE-0001', 'ACTIVE', 'America/Bogota', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
    ('cli_laura_0002',     'client-2', 'TRF-LAU-0002', 'ACTIVE', 'America/Bogota', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
    ('cli_inactivo_0003',  'client-3', 'TRF-INA-0003', 'SUSPENDED', 'America/Bogota', CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());

-- -----------------------------------------------------------------------------
-- 2. Cuentas de billetera (Billeteras de clientes y Fondeo del Sistema)
-- -----------------------------------------------------------------------------
INSERT INTO wallet_accounts (account_id, client_id, account_type, currency, current_balance_minor, status, version, created_at, updated_at)
VALUES
    -- Cuenta central del sistema para recargas simuladas (SYSTEM_FUNDING)
    ('acc_system_funding_cop', NULL, 'SYSTEM_FUNDING', 'COP', 100000000000, 'ACTIVE', 1, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),

    -- Billeteras de clientes con saldo inicial de prueba ($1.000.000 COP y $500.000 COP)
    ('acc_alejandro_0001', 'cli_alejandro_0001', 'CLIENT_WALLET', 'COP', 100000000, 'ACTIVE', 1, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
    ('acc_laura_0002',     'cli_laura_0002',     'CLIENT_WALLET', 'COP', 50000000,  'ACTIVE', 1, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP()),
    ('acc_inactivo_0003',  'cli_inactivo_0003',  'CLIENT_WALLET', 'COP', 0,         'BLOCKED', 1, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP());
