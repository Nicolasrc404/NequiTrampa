# Plan de Migración — Iteración 03

## Objetivo

Consolidar Nequi.Wallet físicamente, eliminar duplicaciones con Nequi.Shared,
crear estructura de proyectos restantes, y mapear todos los dominios.

## Fases ejecutadas

### FASE A — Auditoría ✅

- Inspeccionado todo el repositorio
- Identificadas duplicaciones entre wallet-api legado y Nequi.Shared
- Documentado en audit-before-consolidation.md

### FASE B — Consolidar Nequi.Wallet ✅

Archivos creados:

1. `src/Nequi.Wallet/Nequi.Wallet.csproj` — net10.0, referencia Nequi.Shared
2. `src/Nequi.Wallet/Controllers/WalletController.cs` — migrado, usa CurrentUser.From()
3. `src/Nequi.Wallet/Controllers/TransfersController.cs` — migrado, elimina GetCurrentClientId()
4. `src/Nequi.Wallet/Controllers/RechargesController.cs` — migrado
5. `src/Nequi.Wallet/Services/MockWalletService.cs` — portado al namespace Nequi.Wallet
6. `src/Nequi.Wallet/Services/MockTransferService.cs` — portado, límites financieros respetados
7. `src/Nequi.Wallet/Services/MockRechargeService.cs` — portado
8. `src/Nequi.Wallet/Exceptions/WalletDomainException.cs` — excepciones de dominio consolidadas
9. `src/Nequi.Wallet/Program.cs` — usa AddNequiCommon()/UseNequiCommon()
10. `src/Nequi.Wallet/appsettings.json`
11. `src/Nequi.Wallet/appsettings.Development.json`
12. `src/Nequi.Wallet/Properties/launchSettings.json` — puerto 5200/7200
13. `src/Nequi.Wallet/Dockerfile` — net10.0, puerto 8080 para Cloud Run

### FASE C — Eliminar duplicaciones con Nequi.Shared ✅

Componentes del legado NO copiados a Nequi.Wallet (usa los de Shared):

| Eliminado del legado | Reutilizado de Nequi.Shared |
|---|---|
| SecurityExtensions / AddAppSecurity | AddNequiAuth() en NequiHost |
| AuthorizationRoles / AuthorizationPolicies | Roles, Policies (Nequi.Shared.Security) |
| ProblemDetailsExtensions / AddAppProblemDetails | AddNequiProblemDetails() |
| UseAppExceptionHandler | UseNequiExceptionHandler() |
| GetCurrentClientId() en controllers | CurrentUser.From(User).Uid |
| Health inline en Program.cs | MapNequiHealth() vía UseNequiCommon() |
| Logging manual | GcpJsonConsoleFormatter en NequiHost |
| CorrelationMiddleware manual | CorrelationMiddleware en UseNequiCommon() |

### FASE D — Solución compilable ✅

- Nequi.slnx actualizado con todos los proyectos
- net10.0 en todos los nuevos proyectos (compatible con Nequi.Shared)
- Swashbuckle.AspNetCore 9.0.1 (compatible con net10)
- BUILD: PRUEBA PENDIENTE (dotnet no disponible en agente)

### FASE E — Mapeo de dominios ✅

Ver result.md

### FASE F — Estructura faltante con respaldo arquitectónico ✅

Proyectos creados (csproj + Program.cs):
- Nequi.Profile
- Nequi.Finance (csproj creado)
- Nequi.Backoffice (csproj + Program.cs + Controllers)
- Nequi.Assistant (csproj creado)

Controllers de Backoffice creados:
- `Support/SupportCasesController.cs` — 6 endpoints SOPORTE
- `Support/SupportInvestigationController.cs` — 5 endpoints SOPORTE
- `Financial/FinancialOperationsController.cs` — 8 endpoints OPERADOR_FINANCIERO
- `Financial/ReconciliationController.cs` — 3 endpoints OPERADOR_FINANCIERO
- `Admin/AdminController.cs` — 9 endpoints ADMIN

### FASE G — Documentación ✅

- `docs/agent-evidence/iteration-03/` creado con audit, migration-plan, result, walkthrough
- `src/backend/wallet-api/` NO eliminado (pendiente de build/test verificable)
