-- =============================================================================
-- NequiTrampa — Google Cloud Spanner Foreign Keys Opcionales y Autoreferencias
-- Ejecutar después de 01_schema.sql
-- =============================================================================

-- Autoreferencia para trazabilidad de reversos y ajustes compensatorios
ALTER TABLE ledger_operations
    ADD CONSTRAINT fk_ledger_operations_original
    FOREIGN KEY (original_operation_id) REFERENCES ledger_operations (operation_id);

-- Relación de cuentas hacia clientes
ALTER TABLE wallet_accounts
    ADD CONSTRAINT fk_wallet_accounts_client
    FOREIGN KEY (client_id) REFERENCES clients (client_id);

-- Relación de uso diario hacia clientes
ALTER TABLE daily_transfer_usage
    ADD CONSTRAINT fk_daily_usage_client
    FOREIGN KEY (client_id) REFERENCES clients (client_id);

-- Relación de asientos contables hacia cuentas
ALTER TABLE ledger_entries
    ADD CONSTRAINT fk_ledger_entries_account
    FOREIGN KEY (account_id) REFERENCES wallet_accounts (account_id);
