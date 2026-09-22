# Auditoría Pre-Consolidación — Iteración 03

Fecha: 2026-09-21

## Estado del repositorio ANTES de esta iteración

### Estructura src/ encontrada

| Proyecto | Estado | Contenido |
|---|---|---|
| `Nequi.Shared` | ✅ Completo | csproj + Security, Idempotency, Health, Http, Data, Events, Observability, NequiHost |
| `Nequi.Workers` | ✅ Completo | csproj + Program.cs + Outbox, Projection, Notifications, Reports |
| `Nequi.Realtime` | ✅ Completo | csproj + Program.cs |
| `Nequi.Wallet` | ⚠️ Parcial | Solo DTOs/ e Interfaces/ — sin csproj, sin Controllers, sin Services |
| `Nequi.Profile` | ❌ Solo README | Sin csproj, sin Program.cs, sin Controllers |
| `Nequi.Finance` | ❌ Solo README | Sin csproj, sin Program.cs, sin Controllers |
| `Nequi.Backoffice` | ❌ Solo README | Sin csproj, sin Program.cs, sin Controllers |
| `Nequi.Assistant` | ❌ Solo README | Sin csproj, sin Program.cs, sin Controllers |
| `src/backend/wallet-api` | ⚠️ Legado | net8.0, namespace NequiTrampa.WalletApi.*, duplica Security, ProblemDetails |

### Análisis del legado wallet-api

**Duplicaciones identificadas vs Nequi.Shared:**

| Componente Legacy | Equivalente en Nequi.Shared |
|---|---|
| `Security/SecurityExtensions.cs` → `AddAppSecurity()` | `Security/AuthExtensions.cs` → `AddNequiAuth()` |
| `Security/AuthorizationRoles.cs` | `Security/Roles.cs` |
| `Security/AuthorizationPolicies.cs` | `Security/Roles.cs` (Policies) |
| `Errors/ProblemDetailsExtensions.cs` → `AddAppProblemDetails()` | `Http/Problems.cs` → `AddNequiProblemDetails()` |
| `Errors/BusinessException.cs` (IdempotencyConflictException) | `Idempotency/IdempotencyStore.cs` (IIdempotencyStore) |
| Manual `GetCurrentClientId()` en cada controller | `Security/CurrentUser.From(User)` |
| Health inline en Program.cs | `Health/HealthExtensions.cs` → `MapNequiHealth()` |
| `IdempotencyCache` en MockTransferService | `Idempotency/IdempotencyFilter.cs` + `IIdempotencyStore` |

### Nequi.slnx original

Solo registraba: Nequi.Shared, Nequi.Workers, Nequi.Realtime, Nequi.Tests.
Faltaban: Nequi.Wallet, Nequi.Profile, Nequi.Finance, Nequi.Backoffice, Nequi.Assistant.

### Bases de datos

**EVIDENCIA FALTANTE** — Los siguientes archivos NO existen en el repositorio:
- `database/spanner/01_schema.sql`
- `database/spanner/02_opcional_fk_autoreferencia.sql`
- `database/spanner/03_datos_prueba.sql`
- `database/firestore/`
- `database/sqlite/01_schema_local.sql`

El código referencia `idempotency_records` y `outbox_events` (en SpannerStores.cs) pero no existe el DDL que los define.

### dotnet CLI

`dotnet` no disponible en PATH del entorno de agente → BUILD pendiente de validación manual.
