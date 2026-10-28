# Walkthrough — Iteración 03: Consolidación Funcional del Backend NequiTrampa

## Resumen ejecutivo

Esta iteración consolidó físicamente `Nequi.Wallet` como proyecto compilable independiente,
eliminó las duplicaciones de Security/ProblemDetails/Health respecto al legado `wallet-api`,
registró todos los proyectos `Nequi.*` en la solución, y creó la estructura de controladores
para Backoffice con todos los contratos arquitectónicos de SOPORTE, OPERADOR_FINANCIERO y ADMIN.

---

## Cambios físicos realizados

### src/Nequi.Wallet/ — NUEVO contenido (proyecto consolidado)

```
Nequi.Wallet.csproj              ← net10.0, ref Nequi.Shared
Program.cs                       ← AddNequiCommon() / UseNequiCommon()
appsettings.json
appsettings.Development.json     ← Auth:DemoHeaders=true (local)
Properties/launchSettings.json   ← puerto 5200/7200
Dockerfile                       ← puerto 8080 (Cloud Run)
Controllers/
  WalletController.cs            ← GET /v1/wallet, GET /v1/wallet/balance
  TransfersController.cs         ← POST/GET/GET{id}/GET{id}/receipt /v1/transfers
  RechargesController.cs         ← POST/GET /v1/recharges
Services/
  MockWalletService.cs           ← PARCIAL (Spanner pendiente)
  MockTransferService.cs         ← PARCIAL (Spanner pendiente)
  MockRechargeService.cs         ← PARCIAL (Spanner pendiente)
Exceptions/
  WalletDomainException.cs       ← InsufficientFunds, LimitExceeded, InactiveDest, NotFound
```

### src/Nequi.Backoffice/ — NUEVO contenido

```
Nequi.Backoffice.csproj
Program.cs
appsettings.json / appsettings.Development.json
Controllers/
  Support/
    SupportCasesController.cs        ← 6 endpoints SOPORTE (TO-BE)
    SupportInvestigationController.cs ← 5 endpoints SOPORTE (TO-BE)
  Financial/
    FinancialOperationsController.cs  ← 8 endpoints OPERADOR_FINANCIERO (TO-BE)
    ReconciliationController.cs       ← 3 endpoints OPERADOR_FINANCIERO (TO-BE)
  Admin/
    AdminController.cs                ← 9 endpoints ADMIN (TO-BE)
```

### src/Nequi.Profile/ — NUEVO csproj + Program.cs

### src/Nequi.Finance/ — NUEVO csproj

### src/Nequi.Assistant/ — NUEVO csproj

### Nequi.slnx — ACTUALIZADO

Agregados: Nequi.Profile, Nequi.Finance, Nequi.Wallet, Nequi.Backoffice, Nequi.Assistant

---

## Principios aplicados

### Reutilización de Nequi.Shared

Los controllers de Nequi.Wallet reemplazan el patrón legado:

```csharp
// ANTES (legado wallet-api)
private string GetCurrentClientId() {
    var clientId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? User.FindFirst("user_id")?.Value;
    // ...
}

// DESPUÉS (Nequi.Wallet)
var user = CurrentUser.From(User);   // Nequi.Shared.Security
if (user is null) return Unauthorized();
// user.Uid, user.Roles, user.IsStaff disponibles
```

```csharp
// ANTES (legado wallet-api Program.cs)
builder.Services.AddAppSecurity(builder.Configuration);  // duplicado
builder.Services.AddAppProblemDetails();                  // duplicado
app.UseAppExceptionHandler();                             // duplicado
app.MapGet("/health/live", ...);                          // duplicado
app.MapGet("/health/ready", ...);                         // duplicado

// DESPUÉS (Nequi.Wallet Program.cs)
builder.AddNequiCommon();   // todo en uno: auth, problems, health, stores, logging
app.UseNequiCommon();       // correlation, exception handler, auth, health, /v1/me/access
```

### Separación de responsabilidades por rol

```
Policies.Client          → [Authorize] en WalletController, TransfersController, RechargesController
Policies.CanViewSupport  → [Authorize] en SupportCasesController, SupportInvestigationController
Policies.CanReverseOperation → [Authorize] en FinancialOperationsController, ReconciliationController
Policies.CanManageRoles  → [Authorize] en AdminController
```

### Reglas financieras en DTOs

```csharp
// TransferDto.cs (ya existía, conservado)
[Range(1, 2000000)] decimal Amount   // $2.000.000 COP máximo

// RechargeDto.cs (ya existía, conservado)
[Range(1000, 5000000)] decimal Amount // $1.000 mín — $5.000.000 máx
[RegularExpression("^COP$")]          // moneda única
```

---

## No implementado / pendiente

| Item | Razón |
|---|---|
| SpannerWalletService | DDL físico no existe en el repo |
| Límite diario $5M en mock | Estado compartido entre requests — pendiente de Spanner |
| Beneficiaries | No tiene DDL ni colección definida |
| Nequi.Finance controllers | Solo csproj — Firestore categories/movements necesita inspección |
| Nequi.Assistant controllers | Solo csproj — IA/Voice sin definición de contrato completa |
| Eliminación de wallet-api legado | Pendiente de build exitoso verificable |

---

## Próximos pasos sugeridos

1. **Verificar build**: `dotnet build Nequi.slnx` en un entorno con dotnet disponible
2. **Ejecutar Swagger**: `dotnet run --project src/Nequi.Wallet` → localhost:5200
3. **Pruebas Bruno/Postman**: usar X-Demo-User + X-Demo-Role headers (DemoHeaders=true en dev)
4. **Crear DDL Spanner**: `database/spanner/01_schema.sql` con wallets, transfers, recharges, ledger
5. **Activar SpannerTransferService**: reemplazar Mock cuando DDL esté disponible
6. **Despliegue Cloud Run**: usar `src/Nequi.Wallet/Dockerfile`
