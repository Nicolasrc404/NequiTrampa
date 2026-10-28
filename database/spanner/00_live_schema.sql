-- DDL VIGENTE de projects/full-stack-2026/instances/finanzas-mvp/databases/finanzas-core
-- Exportado con: gcloud spanner databases ddl describe finanzas-core --instance finanzas-mvp --project full-stack-2026
-- Es la fuente de verdad: 01_schema.sql es el borrador inicial y difiere (p. ej. clients con email/alias, tablas administrators y reconciliation_issues,
-- tipos de operacion SIMULATED_RECHARGE | INTERNAL_TRANSFER | REVERSAL | ADMIN_ADJUSTMENT, estados de cliente/billetera ACTIVE|SUSPENDED|CLOSED / ACTIVE|FROZEN|CLOSED).

CREATE TABLE administrators (
  administrator_id STRING(36) NOT NULL,
  auth_subject STRING(128) NOT NULL,
  email STRING(320) NOT NULL,
  display_name STRING(150) NOT NULL,
  admin_level STRING(16) NOT NULL DEFAULT ('SUPPORT'),
  status STRING(16) NOT NULL DEFAULT ('ACTIVE'),
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
  CONSTRAINT ck_admin_level CHECK(admin_level IN ('SUPPORT','OPERATOR','SUPERADMIN')),
  CONSTRAINT ck_admin_status CHECK(status IN ('ACTIVE','SUSPENDED','CLOSED')),
) PRIMARY KEY(administrator_id);

CREATE UNIQUE INDEX ux_admins_auth_subject ON administrators(auth_subject);

CREATE UNIQUE INDEX ux_admins_email ON administrators(email);

CREATE TABLE clients (
  client_id STRING(36) NOT NULL,
  auth_subject STRING(128) NOT NULL,
  email STRING(320) NOT NULL,
  username STRING(50) NOT NULL,
  first_name STRING(100) NOT NULL,
  last_name STRING(100) NOT NULL,
  alias STRING(50),
  public_transfer_code STRING(20) NOT NULL,
  status STRING(16) NOT NULL DEFAULT ('ACTIVE'),
  timezone STRING(64) NOT NULL DEFAULT ('America/Bogota'),
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
  CONSTRAINT ck_clients_status CHECK(status IN ('ACTIVE','SUSPENDED','CLOSED')),
) PRIMARY KEY(client_id);

CREATE UNIQUE INDEX ux_clients_auth_subject ON clients(auth_subject);

CREATE UNIQUE INDEX ux_clients_email ON clients(email);

CREATE UNIQUE INDEX ux_clients_transfer_code ON clients(public_transfer_code) STORING (first_name, last_name, alias, status);

CREATE UNIQUE INDEX ux_clients_username ON clients(username);

CREATE TABLE daily_transfer_usage (
  client_id STRING(36) NOT NULL,
  local_day DATE NOT NULL,
  outgoing_total_minor NUMERIC NOT NULL DEFAULT (CAST(0 AS NUMERIC)),
  operations_count INT64 NOT NULL DEFAULT (0),
  version INT64 NOT NULL DEFAULT (0),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
  CONSTRAINT fk_dtu_client FOREIGN KEY(client_id) REFERENCES clients(client_id),
  CONSTRAINT ck_dtu_cap CHECK(outgoing_total_minor >= 0 AND outgoing_total_minor <= 500000000),
  CONSTRAINT ck_dtu_entero CHECK(MOD(outgoing_total_minor, 1) = 0),
) PRIMARY KEY(client_id, local_day);

CREATE TABLE idempotency_records (
  actor_id STRING(36) NOT NULL,
  scope STRING(64) NOT NULL,
  idempotency_key STRING(64) NOT NULL,
  request_hash STRING(64) NOT NULL,
  operation_id STRING(36),
  status STRING(16) NOT NULL DEFAULT ('IN_PROGRESS'),
  http_status INT64,
  response_body JSON,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
  completed_at TIMESTAMP,
  CONSTRAINT ck_idem_status CHECK(status IN ('IN_PROGRESS','COMPLETED','FAILED')),
) PRIMARY KEY(actor_id, scope, idempotency_key), ROW DELETION POLICY (OLDER_THAN(created_at, INTERVAL 30 DAY));

CREATE TABLE ledger_operations (
  operation_id STRING(36) NOT NULL,
  public_reference STRING(32) NOT NULL,
  type STRING(24) NOT NULL,
  status STRING(16) NOT NULL DEFAULT ('PENDING'),
  actor_id STRING(36) NOT NULL,
  actor_type STRING(16) NOT NULL DEFAULT ('CLIENT'),
  amount_minor NUMERIC NOT NULL,
  currency STRING(3) NOT NULL DEFAULT ('COP'),
  idempotency_key STRING(64),
  original_operation_id STRING(36),
  reason STRING(500),
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
  processing_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
  CONSTRAINT fk_op_original FOREIGN KEY(original_operation_id) REFERENCES ledger_operations(operation_id),
  CONSTRAINT ck_op_actor_type CHECK(actor_type IN ('CLIENT','ADMIN','SYSTEM')),
  CONSTRAINT ck_op_amount CHECK(amount_minor > 0),
  CONSTRAINT ck_op_amount_entero CHECK(MOD(amount_minor, 1) = 0),
  CONSTRAINT ck_op_currency CHECK(currency = 'COP'),
  CONSTRAINT ck_op_reversal_ref CHECK(type != 'REVERSAL' OR original_operation_id IS NOT NULL),
  CONSTRAINT ck_op_status CHECK(status IN (
      'PENDING','PROCESSING','COMPLETED','REJECTED','FAILED','REVERSED')),
  CONSTRAINT ck_op_transfer_cap CHECK(type != 'INTERNAL_TRANSFER' OR amount_minor <= 200000000),
  CONSTRAINT ck_op_type CHECK(type IN (
      'SIMULATED_RECHARGE','INTERNAL_TRANSFER','REVERSAL','ADMIN_ADJUSTMENT')),
) PRIMARY KEY(operation_id);

CREATE INDEX ix_op_actor_created ON ledger_operations(actor_id, created_at DESC) STORING (type, status, amount_minor);

CREATE NULL_FILTERED INDEX ix_op_original ON ledger_operations(original_operation_id);

CREATE UNIQUE INDEX ux_op_public_reference ON ledger_operations(public_reference);

CREATE TABLE ledger_entries (
  operation_id STRING(36) NOT NULL,
  entry_no INT64 NOT NULL,
  account_id STRING(36) NOT NULL,
  delta_minor NUMERIC NOT NULL,
  balance_before_minor NUMERIC NOT NULL,
  balance_after_minor NUMERIC NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
  CONSTRAINT ck_entry_coherent CHECK(balance_after_minor = balance_before_minor + delta_minor),
  CONSTRAINT ck_entry_delta CHECK(delta_minor != 0),
  CONSTRAINT ck_entry_delta_entero CHECK(MOD(delta_minor, 1) = 0),
) PRIMARY KEY(operation_id, entry_no),
  INTERLEAVE IN PARENT ledger_operations ON DELETE CASCADE;

CREATE INDEX ix_entries_account ON ledger_entries(account_id, created_at DESC) STORING (delta_minor, balance_after_minor);

CREATE TABLE outbox_events (
  event_id STRING(36) NOT NULL,
  aggregate_id STRING(36) NOT NULL,
  aggregate_type STRING(32) NOT NULL DEFAULT ('LEDGER_OPERATION'),
  event_type STRING(64) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
  pending_since TIMESTAMP,
  published_at TIMESTAMP,
  attempts INT64 NOT NULL DEFAULT (0),
  last_error STRING(1000),
) PRIMARY KEY(event_id), ROW DELETION POLICY (OLDER_THAN(created_at, INTERVAL 30 DAY));

CREATE INDEX ix_outbox_aggregate ON outbox_events(aggregate_id, created_at DESC);

CREATE NULL_FILTERED INDEX ix_outbox_pending ON outbox_events(pending_since) STORING (event_type, aggregate_id, aggregate_type, attempts);

CREATE TABLE reconciliation_issues (
  issue_id STRING(36) NOT NULL,
  account_id STRING(36) NOT NULL,
  client_id STRING(36) NOT NULL,
  materialized_balance_minor NUMERIC NOT NULL,
  reconstructed_balance_minor NUMERIC NOT NULL,
  difference_minor NUMERIC NOT NULL AS (materialized_balance_minor - reconstructed_balance_minor) STORED,
  severity STRING(16) NOT NULL DEFAULT ('HIGH'),
  status STRING(16) NOT NULL DEFAULT ('OPEN'),
  notes STRING(2000),
  detected_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
  resolved_by STRING(36),
  resolved_at TIMESTAMP,
  CONSTRAINT ck_ri_severity CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  CONSTRAINT ck_ri_status CHECK(status IN ('OPEN','INVESTIGATING','RESOLVED','FALSE_POSITIVE')),
) PRIMARY KEY(issue_id);

CREATE INDEX ix_ri_status ON reconciliation_issues(status, detected_at DESC) STORING (account_id, client_id, difference_minor, severity);

CREATE TABLE wallet_accounts (
  account_id STRING(36) NOT NULL,
  account_type STRING(16) NOT NULL DEFAULT ('CLIENT_WALLET'),
  client_id STRING(36),
  currency STRING(3) NOT NULL DEFAULT ('COP'),
  current_balance_minor NUMERIC NOT NULL DEFAULT (CAST(0 AS NUMERIC)),
  status STRING(16) NOT NULL DEFAULT ('ACTIVE'),
  version INT64 NOT NULL DEFAULT (0),
  created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
  updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP()),
  CONSTRAINT fk_wallet_client FOREIGN KEY(client_id) REFERENCES clients(client_id),
  CONSTRAINT ck_wallet_balance CHECK(account_type != 'CLIENT_WALLET' OR current_balance_minor >= 0),
  CONSTRAINT ck_wallet_currency CHECK(currency = 'COP'),
  CONSTRAINT ck_wallet_entero CHECK(MOD(current_balance_minor, 1) = 0),
  CONSTRAINT ck_wallet_owner CHECK((account_type = 'CLIENT_WALLET'  AND client_id IS NOT NULL) OR
      (account_type = 'SYSTEM_FUNDING' AND client_id IS NULL)),
  CONSTRAINT ck_wallet_status CHECK(status IN ('ACTIVE','FROZEN','CLOSED')),
  CONSTRAINT ck_wallet_type CHECK(account_type IN ('CLIENT_WALLET','SYSTEM_FUNDING')),
) PRIMARY KEY(account_id);

ALTER TABLE ledger_entries ADD CONSTRAINT fk_entry_account FOREIGN KEY(account_id) REFERENCES wallet_accounts(account_id);

ALTER TABLE reconciliation_issues ADD CONSTRAINT fk_ri_account FOREIGN KEY(account_id) REFERENCES wallet_accounts(account_id);

CREATE UNIQUE NULL_FILTERED INDEX ux_wallet_client ON wallet_accounts(client_id) STORING (current_balance_minor, status, version);

