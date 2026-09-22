# Resultado — Iteración 03

Fecha: 2026-09-21

## 1. Nequi.Wallet — Estado: IMPLEMENTADO (MOCK)

| Componente | Archivo | Estado |
|---|---|---|
| Nequi.Wallet.csproj | `src/Nequi.Wallet/Nequi.Wallet.csproj` | ✅ IMPLEMENTADO |
| WalletController | `Controllers/WalletController.cs` | ✅ IMPLEMENTADO |
| TransfersController | `Controllers/TransfersController.cs` | ✅ IMPLEMENTADO |
| RechargesController | `Controllers/RechargesController.cs` | ✅ IMPLEMENTADO |
| MockWalletService | `Services/MockWalletService.cs` | ✅ IMPLEMENTADO |
| MockTransferService | `Services/MockTransferService.cs` | ✅ IMPLEMENTADO |
| MockRechargeService | `Services/MockRechargeService.cs` | ✅ IMPLEMENTADO |
| WalletDomainException | `Exceptions/WalletDomainException.cs` | ✅ IMPLEMENTADO |
| Program.cs | `Program.cs` | ✅ IMPLEMENTADO |
| Dockerfile | `Dockerfile` | ✅ IMPLEMENTADO |
| BUILD | — | ⚠️ PRUEBA PENDIENTE |

## 2. Endpoints Wallet — Estado por endpoint

| Método | Endpoint | Estado | Notas |
|---|---|---|---|
| GET | `/v1/wallet` | ✅ IMPLEMENTADO | Mock — SpannerWalletService pendiente |
| GET | `/v1/wallet/balance` | ✅ IMPLEMENTADO | Mock — Spanner DDL pendiente |
| POST | `/v1/transfers` | ✅ IMPLEMENTADO | Mock + validaciones financieras |
| GET | `/v1/transfers` | ✅ IMPLEMENTADO | Mock in-memory |
| GET | `/v1/transfers/{id}` | ✅ IMPLEMENTADO | Resource-based auth implementada |
| GET | `/v1/transfers/{id}/receipt` | ✅ IMPLEMENTADO | Mock |
| POST | `/v1/recharges` | ✅ IMPLEMENTADO | Mock + Idempotency-Key |
| GET | `/v1/recharges` | ✅ IMPLEMENTADO | Mock in-memory |
| GET | `/v1/me/access` | ✅ IMPLEMENTADO | Via NequiHost.MapAccessEndpoint() |
| GET | `/health/live` | ✅ IMPLEMENTADO | Via MapNequiHealth() |
| GET | `/health/ready` | ✅ IMPLEMENTADO | Via MapNequiHealth() |

## 3. Mapa de proyectos vs dominios conceptuales

| Concepto Arquitectónico | Proyecto .NET | Estado |
|---|---|---|
| core-api (Profile) | `Nequi.Profile` | ⚠️ PARCIAL — csproj + Program.cs, sin controllers de perfil |
| core-api (Finance) | `Nequi.Finance` | ⚠️ PARCIAL — solo csproj |
| wallet-api | `Nequi.Wallet` | ✅ IMPLEMENTADO (MOCK) |
| backoffice-api | `Nequi.Backoffice` | ⚠️ PARCIAL — controllers TO-BE con contratos definidos |
| assistant-api | `Nequi.Assistant` | ❌ TO-BE — solo csproj |
| workers | `Nequi.Workers` | ✅ EXISTENTE (no modificado) |
| realtime | `Nequi.Realtime` | ✅ EXISTENTE (no modificado) |
| shared | `Nequi.Shared` | ✅ EXISTENTE (reutilizado, no modificado) |

## 4. Dominios por estado

### IMPLEMENTADO (MOCK funcional)
- Wallet → GET /v1/wallet, GET /v1/wallet/balance
- Transfers → POST, GET, GET/{id}, GET/{id}/receipt
- Recharges → POST, GET
- Access → GET /v1/me/access
- Health → /health/live, /health/ready

### PARCIAL (estructura lista, persistencia Spanner pendiente)
- Profile (csproj + Program.cs listo, controllers pendientes)
- Backoffice estructura de controladores lista (responden con TO-BE)

### TO-BE (respaldo arquitectónico, sin implementación productiva)
- Support Management (SupportCasesController — 6 endpoints)
- Support Investigation (SupportInvestigationController — 5 endpoints)
- Financial Operations (FinancialOperationsController — 8 endpoints)
- Reconciliation (ReconciliationController — 3 endpoints)
- Admin (AdminController — 9 endpoints)
- Finance (Movements, Cash, Categories, Budgets, Goals, Analytics, Sync)
- Assistant + Voice
- Beneficiaries

### EVIDENCIA FALTANTE / PERSISTENCIA PENDIENTE DE VALIDACIÓN
- DDL Spanner: wallets, transfers, recharges, ledger_entries, idempotency_records, outbox_events
- DDL Spanner: business_users, user_role_assignments, support_cases, reversals, financial_adjustments
- Colecciones Firestore: financial_movements, categories (seeds pendientes de verificar)
- DDL SQLite: offline schema

## 5. Reutilización de Nequi.Shared — Verificado

| Capacidad | Clase/Método | Usado en Nequi.Wallet |
|---|---|---|
| Autenticación JWT | `AddNequiAuth()` | ✅ via AddNequiCommon() |
| Autorización RBAC | `Policies.Client` | ✅ en todos los controllers |
| Problem Details RFC 9457 | `AddNequiProblemDetails()` | ✅ via AddNequiCommon() |
| Exception Handler | `UseNequiExceptionHandler()` | ✅ via UseNequiCommon() |
| Health Checks | `MapNequiHealth()` | ✅ via UseNequiCommon() |
| Access Endpoint | `MapAccessEndpoint()` | ✅ via UseNequiCommon() |
| Observabilidad | `CorrelationMiddleware` | ✅ via UseNequiCommon() |
| GCP Logs | `GcpJsonConsoleFormatter` | ✅ via AddNequiCommon() |
| CurrentUser | `CurrentUser.From(User)` | ✅ en los 3 controllers |
| IdempotencyStore | `IIdempotencyStore` (InMemory) | ✅ via AddNequiCommon() |

## 6. Reglas financieras — Verificadas en código

| Regla | Implementación | Estado |
|---|---|---|
| Monto máximo $2.000.000 COP | `CreateTransferRequestDto` [Range] + MockTransferService | ✅ |
| Límite diario $5.000.000 COP | Documentado en DTOs; mock no simula estado diario | ⚠️ PARCIAL |
| Solo COP | `[RegularExpression("^COP$")]` en DTOs | ✅ |
| Idempotency-Key obligatorio en POST | Validación en TransfersController + RechargesController | ✅ |
| No float/double para dinero | `decimal` en todos los DTOs | ✅ |
| Destino inactivo → 422 | `InactiveDestinationException` + mock | ✅ |
| Resource-based auth | `GetTransferByIdAsync` verifica OriginClientId/DestinationClientId | ✅ |
| No DELETE de transferencias | No existe endpoint DELETE | ✅ |
| No PATCH directo de balance | No existe endpoint de ese tipo | ✅ |

## 7. Build y Tests

- **BUILD: PRUEBA PENDIENTE** — dotnet CLI no disponible en el entorno del agente
- **TESTS: PRUEBA PENDIENTE** — requiere dotnet disponible
- Para compilar: `dotnet build src/Nequi.Wallet/Nequi.Wallet.csproj`
- Para correr: `dotnet run --project src/Nequi.Wallet` (abre Swagger en localhost:5200)

## 8. Código legado

- `src/backend/wallet-api/` — NO eliminado (pendiente verificación de build exitoso de Nequi.Wallet)
- Una vez verificado el build, puede eliminarse o archivarse
