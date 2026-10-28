-- =============================================================================
-- NequiTrampa — Google Cloud Spanner DDL Schema
-- Fuente de verdad financiera y ledger autoritativo
-- Regla de dinero: Unidades menores enteras (100 minor = 1 COP). NUMERIC en Spanner.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Clientes de la plataforma
-- -----------------------------------------------------------------------------
CREATE TABLE clients (
    client_id STRING(64) NOT NULL,
    auth_subject STRING(128) NOT NULL,
    public_transfer_code STRING(32) NOT NULL,
    status STRING(16) NOT NULL,
    timezone STRING(64),
    created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true),
    updated_at TIMESTAMP OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (client_id);

CREATE UNIQUE INDEX idx_clients_auth_subject ON clients(auth_subject);
CREATE UNIQUE INDEX idx_clients_public_transfer_code ON clients(public_transfer_code);

-- -----------------------------------------------------------------------------
-- 2. Cuentas de billetera (CLIENT_WALLET y SYSTEM_FUNDING)
-- -----------------------------------------------------------------------------
CREATE TABLE wallet_accounts (
    account_id STRING(64) NOT NULL,
    client_id STRING(64),
    account_type STRING(32) NOT NULL,
    currency STRING(3) NOT NULL,
    current_balance_minor NUMERIC NOT NULL,
    status STRING(16) NOT NULL,
    version INT64 NOT NULL,
    created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true),
    updated_at TIMESTAMP OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (account_id);

CREATE UNIQUE NULL_FILTERED INDEX idx_wallet_accounts_client_type ON wallet_accounts(client_id, account_type);
CREATE INDEX idx_wallet_accounts_system ON wallet_accounts(account_type, status, currency);

-- -----------------------------------------------------------------------------
-- 3. Control acumulado diario de transferencias por cliente (Límite: $5.000.000 COP)
-- -----------------------------------------------------------------------------
CREATE TABLE daily_transfer_usage (
    client_id STRING(64) NOT NULL,
    local_day DATE NOT NULL,
    outgoing_total_minor NUMERIC NOT NULL,
    operations_count INT64 NOT NULL,
    version INT64 NOT NULL,
    updated_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (client_id, local_day);

-- -----------------------------------------------------------------------------
-- 4. Operaciones autoritativas del ledger financiero (Inmutables)
-- -----------------------------------------------------------------------------
CREATE TABLE ledger_operations (
    operation_id STRING(64) NOT NULL,
    public_reference STRING(32) NOT NULL,
    type STRING(32) NOT NULL,
    status STRING(16) NOT NULL,
    actor_id STRING(64) NOT NULL,
    actor_type STRING(16) NOT NULL,
    amount_minor NUMERIC NOT NULL,
    currency STRING(3) NOT NULL,
    idempotency_key STRING(128),
    original_operation_id STRING(64),
    reason STRING(256),
    created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true),
    confirmed_at TIMESTAMP OPTIONS (allow_commit_timestamp = true),
    updated_at TIMESTAMP OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (operation_id);

CREATE UNIQUE INDEX idx_ledger_operations_public_ref ON ledger_operations(public_reference);
CREATE INDEX idx_ledger_operations_actor_type ON ledger_operations(actor_id, type, created_at DESC);
CREATE NULL_FILTERED INDEX idx_ledger_operations_idempotency ON ledger_operations(idempotency_key);

-- -----------------------------------------------------------------------------
-- 5. Asientos contables de partida doble del ledger (Interleaved)
-- -----------------------------------------------------------------------------
CREATE TABLE ledger_entries (
    operation_id STRING(64) NOT NULL,
    entry_no INT64 NOT NULL,
    account_id STRING(64) NOT NULL,
    delta_minor NUMERIC NOT NULL,
    balance_before_minor NUMERIC NOT NULL,
    balance_after_minor NUMERIC NOT NULL,
    created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (operation_id, entry_no),
  INTERLEAVE IN PARENT ledger_operations ON DELETE NO ACTION;

CREATE INDEX idx_ledger_entries_account ON ledger_entries(account_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 6. Registro de Idempotencia distribuida
-- -----------------------------------------------------------------------------
CREATE TABLE idempotency_records (
    actor_id STRING(64) NOT NULL,
    scope STRING(64) NOT NULL,
    idempotency_key STRING(128) NOT NULL,
    request_hash STRING(128) NOT NULL,
    status STRING(16) NOT NULL,
    http_status INT64,
    response_body JSON,
    completed_at TIMESTAMP,
    created_at TIMESTAMP OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (actor_id, scope, idempotency_key);

-- -----------------------------------------------------------------------------
-- 7. Transactional Outbox (Eventos de dominio confirmados junto al ledger)
-- -----------------------------------------------------------------------------
CREATE TABLE outbox_events (
    event_id STRING(64) NOT NULL,
    aggregate_id STRING(64) NOT NULL,
    aggregate_type STRING(32) NOT NULL,
    event_type STRING(32) NOT NULL,
    payload JSON NOT NULL,
    created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true),
    pending_since TIMESTAMP,
    published_at TIMESTAMP,
    attempts INT64 NOT NULL,
    last_error STRING(1024)
) PRIMARY KEY (event_id);

CREATE NULL_FILTERED INDEX idx_outbox_events_pending ON outbox_events(pending_since);
