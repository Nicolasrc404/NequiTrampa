# Resultado de Ejecución — Iteración 1: Fundamento y Esqueleto de Wallet-API

## Estado: ✅ COMPLETADO Y APROBADO

### 1. Decisiones Técnicas Tomadas
* Adopción de ASP.NET Core 8 con C# 12 sobre contenedores Cloud Run.
* Mapeo estricto de dinero simulado a moneda COP, utilizando tipos enteros en centavos (`long AmountCents`) y `decimal` de precisión fija en C#, descartando `float` y `double`.
* Configuración de JWT Bearer contra Google Cloud Identity Platform validando `iss`, `aud`, expiración y algoritmo `RS256` (rechazo explícito de `none`).
* Configuración de `FallbackPolicy` para exigir autenticación por defecto (Deny-by-Default).
* Middleware global de Problem Details conforme a RFC 9457 para códigos 400, 401, 403, 404, 409 y 422.

### 2. Archivos Creados
* `ARCHITECTURE.md`: Documento de diseño arquitectónico y justificación de persistencias.
* `src/backend/wallet-api/wallet-api.csproj`
* `src/backend/wallet-api/Program.cs`
* `src/backend/wallet-api/appsettings.json`
* `src/backend/wallet-api/Security/AuthorizationRoles.cs`
* `src/backend/wallet-api/Security/AuthorizationPolicies.cs`
* `src/backend/wallet-api/Security/SecurityExtensions.cs`
* `src/backend/wallet-api/Errors/BusinessException.cs`
* `src/backend/wallet-api/Errors/ProblemDetailsExtensions.cs`
* `src/backend/wallet-api/DTOs/WalletDto.cs`
* `src/backend/wallet-api/DTOs/TransferDto.cs`
* `src/backend/wallet-api/DTOs/RechargeDto.cs`
* `src/backend/wallet-api/Interfaces/IWalletService.cs`
* `src/backend/wallet-api/Interfaces/ITransferService.cs`
* `src/backend/wallet-api/Interfaces/IRechargeService.cs`
* `src/backend/wallet-api/Services/MockWalletService.cs`
* `src/backend/wallet-api/Services/MockTransferService.cs`
* `src/backend/wallet-api/Services/MockRechargeService.cs`
* `src/backend/wallet-api/Controllers/WalletController.cs`
* `src/backend/wallet-api/Controllers/TransfersController.cs`
* `src/backend/wallet-api/Controllers/RechargesController.cs`
