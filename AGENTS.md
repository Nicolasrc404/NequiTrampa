# AGENTS.md — NequiTrampa

Monorepo: backend .NET 10 (`src/`, `tests/`) + app Expo/React Native (`frontend/`). El backend es la autoridad financiera: no modificar controladores, servicios, modelos, migraciones, BD ni infra sin autorización explícita. Antes de escribir código Expo, lee `frontend/AGENTS.md`.

## Mapa del repo

- `Nequi.slnx` — solución XML: 9 proyectos en `src/` (Gateway = única entrada pública; Wallet, Finance, Profile, Backoffice, Assistant, Workers, Realtime, Shared) + `tests/Nequi.Tests`.
- `src/backend/wallet-api/` — legado, **no** está en la solución; no usarlo como referencia.
- `tests/Nequi.Tests` — xUnit con `Data:Backend=memory`; no requiere GCP. `tests/bruno/` — suite HTTP fuente de verdad; la colección Postman se genera con `tests/postman/generate_from_bruno.py`.
- `database/spanner`, `database/firestore` — DDL/índices. `infra/` — `setup.sh`, `deploy.sh`, `smoke-test.sh`.
- `docs/` — documentación profunda; `docs/agent-evidence/` y `docs/research/` son históricos: **no modificar**.

## Comandos

Frontend (desde `frontend/`):

- `npm run typecheck` — `tsc --noEmit`; debe pasar.
- `npm run test:unit` — compila solo `src/config`, `src/services`, `src/utils` y `tests/unit` (`tsconfig.test.json`) y ejecuta `node --test`; no hay Jest. Para probar lógica nueva, mantenla pura en esas carpetas y añade `tests/unit/*.test.ts`. Un archivo: `npx tsc -p tsconfig.test.json && node --test .test-build/tests/unit/<archivo>.test.js`.
- `npx expo start` / `npx expo start --web` / `npx expo start --android`.
- Dependencias: `npx expo install <paquete>` (fija versión compatible con SDK 58), no `npm install`.
- No hay ESLint/lint; no agregar tooling sin autorización.
- CI (`.github/workflows/ci.yml`): backend `dotnet restore/build/test Nequi.slnx`; frontend Node 22 `npm ci` → `typecheck` → `test:unit`. No hay paso de lint.

Backend (requiere .NET 10 SDK):

- `dotnet build Nequi.slnx`; `dotnet test Nequi.slnx` (en memoria). Un solo test: `dotnet test tests/Nequi.Tests/Nequi.Tests.csproj --filter "FullyQualifiedName~WalletTests"`.
- `.\scripts\run-local.ps1` (PowerShell/Windows) usa **`gcp` por defecto** y requiere `gcloud auth application-default login`; `-Backend memory` no requiere credenciales. Levanta 7 servicios en 8080–8086 con Swagger, pero **no** el Gateway: los tests `gateway/` de Bruno esperan uno local en `:8087` con `Gateway__IdentityTokens=false`.
- Bruno: `cd tests/bruno && bru run --env local` con los servicios arriba. `--env gcp` escribe en producción y exige secretos: solo con intención explícita.

## Frontend: arquitectura que no se ve en los nombres

- Stack: Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6. Las APIs cambian por SDK; verifica docs versionadas y `frontend/AGENTS.md` en vez de confiar en memoria.
- `index.ts` → `registerRootComponent(App)`. No hay Expo Router ni React Navigation; no agregarlos.
- `App.tsx` (~3.300 líneas) es el router de la app de clientes: unión `AppState` + `DevStateBarMulti`; también cablea servicios/hooks y enruta estados loading/empty/error. Las pantallas nuevas se enganchan ahí.
- `EXPO_PUBLIC_APP_MODE=backoffice` renderiza `src/navigation/BackofficeApp.tsx`, con stack propio (`NavContext`) y rutas filtradas por rol.
- Datos de cliente: `src/services/*` (clientes de dominio puros sobre `HttpClient`, validan contrato) → `src/hooks/*` → pantallas. `src/api/*` es la capa antigua que usa el backoffice (y `useAsync`); no agregar código nuevo ahí.
- `src/services/api.ts` es el cliente autenticado único; un 401 invalida la sesión. Núcleo de sesión en `src/services/session/*`; el cableado de plataforma está en `session/platform.ts` (SecureStore en nativo, memoria en web).
- Login de cliente: `SessionGate` captura correo/contraseña y llama `sessionManager.signIn`; sin sesión válida no se muestran datos ni se permiten operaciones. No crear otra pantalla de login ni simular autenticación. El backoffice tiene `screens/auth/LoginScreen.tsx`.
- DEMO: `EXPO_PUBLIC_DEMO_MODE` (por defecto en `__DEV__`, nunca en producción) cambia `App.tsx` a `src/data/demo*.ts` + `DevStateBarMulti`; `SimulationBanner` marca éxitos simulados. Nunca simules éxito/error para un endpoint no conectado: muestra "no disponible" (ver `TROUBLESHOOTING.md`, Fase 7).
- Tokens: solo `src/theme/colors.ts`; no crear `theme.ts`. Tipos en `src/types/`, componentes por módulo en `src/components/<módulo>/`.

## Backend: invariantes

- Dinero en centavos enteros, solo COP; ledger de partida doble (`Σ delta = 0`); no hay DELETE financiero (corrección = REVERSAL/ADMIN_ADJUSTMENT).
- `Idempotency-Key` obligatoria en POST financieros; misma llave + cuerpo distinto → 409.
- Spanner es la autoridad del saldo; Firestore guarda read models/proyecciones; el Gateway es el único servicio público (nunca exponer `/internal/**`).
- `Data__Backend=gcp|memory` (env) / `Data:Backend` (config) elige Spanner o memoria; `src/Nequi.Wallet/appsettings.json` trae `memory`.

## Contratos y diseño

- `docs/guia-frontend-api.md` — rutas verificadas del gateway, claims, errores RFC 9457 e idempotencia. Leerlo antes de conectar un endpoint.
- `frontend/UX_MAPPING.md` y `frontend/DESIGN.md` cubren solo Movimientos (DESIGN verificado 2026-10-25). No asumir que describen otros módulos: consultar Stitch.
- Stitch MCP está configurado en `opencode.json`; Movimientos vive en `projects/7595452808345490745` y el Módulo 1 en `projects/1004678761300449208`. No inventar diseños sustitutos. Skills en `.opencode/skills/` (`design-md`, `react-native`).
- Si el UX Mapping nombra un endpoint inexistente en el backend, registra la discrepancia; nunca inventes contratos.

## Entorno y trampas

- Config del frontend: copiar `frontend/.env.example` a `frontend/.env` (ignorado). Solo `EXPO_PUBLIC_*`, que queda embebido en el bundle: nunca secretos. Claves: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_IDENTITY_API_KEY` (web key pública), `EXPO_PUBLIC_APP_MODE`, `EXPO_PUBLIC_DEMO_MODE`, `EXPO_PUBLIC_API_TIMEOUT_MS` (3000–60000, por defecto 15000).
- En web, `expo-secure-store` es no-op: los tokens viven en memoria; nunca `localStorage`.
- No iniciar Metro con `CI=1` para verificación visual (desactiva la recarga).
- `frontend/dist/` y `.test-build/` son artefactos ignorados; no editarlos.
- Registrar incidentes en `TROUBLESHOOTING.md` con fecha, capa, problema, causa y solución.
- Git: comprobar rama/estado antes de tocar código. Sin push/reset/clean/merge/commit sin autorización (`opencode.json` ya bloquea push/reset/clean).
