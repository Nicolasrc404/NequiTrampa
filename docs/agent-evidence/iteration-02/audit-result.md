# Auditoría del Estado del Repositorio — Iteración 2

## Resumen del Diagnóstico Físico del Repositorio
* **Árbol de Directorios Actual**: Contiene `src/backend/wallet-api/`, `ARCHITECTURE.md`, `README.md`, `prueba.md` y la suite de documentación en `docs/`.
* **Ausencia Física de Directorio `database/`**: Se verificó mediante comandos de PowerShell y escaneo de git que la carpeta `database/` (`spanner/01_schema.sql`, `firestore/`, `sqlite/`) no reside en el branch `main` de este repositorio local. Se identificó la causa raíz: los esquemas residen en carpetas hermanas de infraestructura GCP del equipo de trabajo.
* **Estado de `wallet-api`**: Controllers implementados para Wallet, Transfers y Recharges con servicios Mock en memoria. La idempotencia en memoria es suficiente para pruebas locales pero parcial para Cloud Run multi-instancia.
* **Herramientas de Entorno**: Dotnet CLI no está instalado en el PATH global; se ejecutan auditorías estáticas de código y scripts de verificación.
