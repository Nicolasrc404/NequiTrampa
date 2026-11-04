# AUDITORÍA

> **AVISO DE TRAZABILIDAD:** Las secciones originales documentan la auditoría histórica del commit `2179203`. El seguimiento posterior de la Fase 1 corresponde a la rama `fix/auditoria-fase-1-idempotencia`, HEAD `7785151`, y se encuentra en la adenda de actualización. Para consultar el estado más reciente de los hallazgos relacionados con la Fase 1, debe leerse dicha adenda junto con el historial original.

- **Proyecto:** NequiTrampa
- **Repositorio:** https://github.com/Nicolasrc404/NequiTrampa
- **Fecha de auditoría:** 2026-10-28 (actualización diferencial)
- **Rama auditada:** main
- **Commit SHA auditado:** 2179203662e46ce82eef50e12114e11258c0c5bd
- **Commit anterior auditado:** c194f2f1fd2ed861528e69d7f565cce373443a6f
- **Alcance:** Auditoría técnica, funcional, arquitectónica y de seguridad exhaustiva del repositorio completo (backend .NET 10, frontend React Native/Expo, infraestructura GCP, BD Spanner/Firestore, pruebas y documentación). Modo estrictamente solo lectura.
- **Metodología:** Inspección estática contra archivos reales (rutas, líneas), conteo verificado, comparación entre commits (c194f2f → 74c4296 → f0deffd → 2179203), revisión de diffs, controladores/servicios/DTOs, cliente HTTP/sesión, esquema Spanner, infra y evidencias de GitHub Actions.
- **Limitaciones de verificación:** Sin acceso activo a GCP, sin credenciales para pruebas E2E desplegadas, sin emulador/dispositivo para validación móvil completa. No se ejecutaron builds/tests en este entorno. La ejecución de Actions `40769269917` se conserva como evidencia reportada por el proyecto, pero no fue recuperable desde este entorno. Solo lectura; único archivo modificado: `AUDITORIA.md`. Cambios locales preexistentes ignorados.

## 1. Resumen ejecutivo

- **Arquitectura:** Bien definida con separación autoridad (Spanner + ledger doble partida) / proyecciones (Firestore). `infra/deploy.sh` define ocho destinos Cloud Run: siete servicios privados detrás del Gateway (`wallet`, `workers`, `realtime`, `finance`, `profile`, `backoffice`, `assistant`) y el propio `gateway`. Principios contables y seguridad documentados.
- **Backend:** Extenso y mayoritariamente implementado (Wallet, Finance, Backoffice, Workers, Realtime, Profile, Assistant). Se incorporaron mecanismos de reconciliación de idempotencia huérfana, mejoras en paginación y fixes críticos.
- **Frontend:** 170 archivos `.tsx` en `frontend/src/screens/` (164 `*Screen.tsx`, 6 auxiliares), 21 carpetas principales y la subcarpeta adicional `operations/tabs`. Navegación por estado en `App.tsx` (sin Expo Router/React Navigation). `configureHttp()` está inicializado desde `services/api.ts`. El generador prioriza CSPRNG, pero conserva un fallback a `Math.random()` cuando `globalThis.crypto.getRandomValues` no está disponible.
- **CI/CD:** **Nuevo** `.github/workflows/ci.yml` (backend build+test, frontend typecheck+unit tests). La ejecución del commit `2179203` (`40769269917`) se documenta como exitosa según la evidencia proporcionada; el workflow también es consistente con esos jobs, pero el resultado no pudo recuperarse independientemente desde este entorno.
- **Críticos:** AUD-002 y AUD-003 están verificados en código. AUD-006 queda **PARCIALMENTE RESUELTO**: prioriza CSPRNG, pero activa `Math.random()` si no existe `crypto.getRandomValues`. Persiste **AUD-001** (commit gap idempotencia financiera) con mitigaciones parciales y nuevos mecanismos de detección/reconciliación manual; queda riesgo residual y requiere verificación.
- **Paginación:** Movements y Cash admiten cursor keyset en backend y contrato HTTP. Los servicios `movementsService.ts` y `cashService.ts`, `useApiData.ts` y las pantallas revisadas siguen enviando únicamente `limit`; no consumen `nextCursor`/`X-Next-Cursor`. La integración frontend queda pendiente.

## 2. Inventario técnico

### Tecnologías
| Componente | Tecnologías |
|---|---|
| Backend | .NET 10, ASP.NET Core, C# |
| Frontend | React Native 0.88, React 19.3, Expo SDK ~58.0.19, TypeScript 6 |
| Persistencia | Cloud Spanner (GoogleSQL), Firestore (Nativo), SQLite (previsto) |
| Auth | Google Cloud Identity Platform, JWT (RS256) |
| Mensajería | Pub/Sub, WebSockets (`Nequi.Realtime`) |
| IA/Voz | Vertex AI/Gemini, Speech-to-Text (`Nequi.Assistant`) |
| Infra | Docker, Cloud Run, API Gateway/BFF, Secret Manager, Artifact Registry, Cloud Build |
| Pruebas | xUnit, TypeScript, Bruno, Postman |
| CI/CD | GitHub Actions (nuevo) |

### Proyectos .NET (Nequi.slnx)
| Proyecto | Estado | Evidencia |
|---|---|---|
| Nequi.Shared | Presente (mejorado) | Idempotency (filtros MVC/minimal), Data/SpannerStores con `FindStaleInProgressAsync`, reconciliación |
| Nequi.Profile | Presente | Estructura |
| Nequi.Finance | Implementado (mejorado) | Movements con cursor, Cash con cursor |
| Nequi.Wallet | Implementado | Transfers, Recharges, Beneficiaries |
| Nequi.Backoffice | Implementado (ampliado) | `IdempotencyAdminController` añadido (stale/release) |
| Nequi.Assistant | Presente | Estructura |
| Nequi.Workers | Presente (ampliado) | `IdempotencyReconciliationWorker`/`IdempotencyReconciler` periódico + endpoint interno |
| Nequi.Realtime | Presente | WebSockets |
| Nequi.Gateway | Presente (corregido) | `/health/ready` con verificación upstream real |

### Frontend
| Aspecto | Valor/Evidencia |
|---|---|
| Pantallas `.tsx` | 170 (164 `*Screen.tsx`, 6 auxiliares) |
| Carpetas principales | 21 + subcarpeta `operations/tabs` |
| HTTP/Session | `frontend/src/services/http/*`, `frontend/src/services/session/*`, `frontend/src/services/api.ts` |
| api/http.ts | Ahora inicializado vía `configureHttp()` desde `services/api.ts`; usa `generateIdempotencyKey()` (CSPRNG con fallback no seguro) |
| Navegación | `App.tsx` estado-based, `BackofficeApp.tsx` |
| Tokens | `frontend/src/theme/colors.ts` único |

### Commits nuevos analizados
| Commit | Mensaje | Archivos relevantes |
|---|---|---|
| 74c4296 | fix: cerrar hallazgos críticos de la auditoría (auth backoffice, idempotencia, readiness del gateway, paginación) | `.github/workflows/ci.yml`, `ARCHITECTURE.md`, `frontend/src/services/api.ts`, `frontend/src/api/http.ts`, `frontend/src/utils/idempotency.ts`, `src/Nequi.Gateway/Program.cs`, `src/Nequi.Finance/Movements/*`, `src/Nequi.Shared/Idempotency/*` |
| f0deffd | feat: paginación por cursor en /v1/cash/movements y limpieza del helper de cursor | `src/Nequi.Finance/Cash/*`, `frontend/src/services/cashService.ts`, `src/Nequi.Finance/Common/KeysetCursor.cs`, `database/firestore/firestore.indexes.json` |
| 2179203 | feat: reconciliación de idempotencia huérfana + fixes de code review en paginación | `ARCHITECTURE.md`, `src/Nequi.Backoffice/Controllers/Financial/IdempotencyAdminController.cs`, `src/Nequi.Workers/Idempotency/IdempotencyReconciliationWorker.cs`, `src/Nequi.Shared/Idempotency/*`, `src/Nequi.Shared/Data/SpannerStores.cs`, `tests/Nequi.Tests/IdempotencyTests.cs` |

## 3. Estado real de implementación por módulo

| Módulo | Backend | Frontend | Estado | Evidencia |
|---|---|---|---|---|
| Access/Auth | Parcial/Presente | `auth/LoginScreen.tsx`, `access/Access01-03` | Implementado sin verificación completa | SessionManager OK |
| Profile | Presente | `profile/*` | Implementado sin verificación completa | Estructura + pantallas |
| Wallet | Implementado | Pantallas relacionadas | Implementado sin verificación completa | Transfers/Recharges/Beneficiaries |
| Transfers | Implementado | `transfers/*` | Implementado sin verificación completa | Wallet module |
| Recharges | Implementado | `recharges/*` | Implementado sin verificación completa | Wallet module |
| Beneficiaries | Implementado | `beneficiaries/*` | Implementado sin verificación completa | Wallet module |
| Movements | Implementado con cursor | `movements/Movements01-08` | **Parcialmente integrado** - backend admite cursor; frontend no lo consume | `MovementsEndpoints.cs`, `src/Nequi.Finance/Common/KeysetCursor.cs`, `movementsService.ts`, `useApiData.ts` |
| Cash | Implementado con cursor | `cash/*` | **Parcialmente integrado** - backend emite `X-Next-Cursor`; frontend no lo consume | `CashController/Service/Store`, `src/Nequi.Finance/Common/KeysetCursor.cs`, `cashService.ts`, `useApiData.ts` |
| Categories/Budgets/Goals/Analytics | Implementado | `categories/*`, `budgets/*`, `goals/*`, `analytics/*` | Implementado sin verificación completa | Finance module |
| Assistant/Voice | Presente | Parcial | No verificado | Estructura |
| Notifications/Projection Status | Presente | Parcial | Parcial/No verificado | Workers/Realtime |
| Sync/Offline | Definido | Parcial | Incompleto/No verificado | SQLite previsto |
| Backoffice Admin/Support/Investigation/FinancialOps/Reversals/Reconciliation/Audit | Implementado (ampliado) | `operations/*`, `cases/*`, `customers/*`, `reversals/*` | Implementado con **nuevo Idempotency Admin** | `IdempotencyAdminController` añadido |
| Idempotencia (reconciliación) | Implementado (nuevo) | N/A | **Nuevo** - detección stale + reconciliación manual + tests | `IdempotencyReconciler`, `IdempotencyAdminController`, tests |

## 4. Errores críticos

### AUD-001 — Commit gap en idempotencia financiera
- **Categoría:** Seguridad / Base de datos / Backend | **Severidad:** Crítica | **Estado anterior:** Riesgo arquitectónico - no reproducido | **Estado nuevo:** **PARCIALMENTE RESUELTO** (mitigado, riesgo residual)
- **Módulo:** Wallet/Backoffice/Idempotency | **Archivos:** `src/Nequi.Shared/Idempotency/*`, `src/Nequi.Shared/Data/SpannerStores.cs`, `src/Nequi.Wallet/*`, `src/Nequi.Backoffice/*`, `tests/Nequi.Tests/IdempotencyTests.cs`, `database/spanner/01_schema.sql`
- **Evidencia actual:**
  - Filtros MVC/minimal ya **no llaman `AbandonAsync`** cuando `CompleteAsync` falla tras acción exitosa (status < 500) — comentarios explicativos añadidos en ambos filtros. Si `CompleteAsync` lanza excepción tras commit financiero, la clave permanece `IN_PROGRESS` y reintentos reciben **409** (test `CompleteAsyncFailureAfterSuccess_DoesNotAbandonKey_AndBlocksRetryInsteadOfReExecuting` verifica comportamiento).
  - Se agregó `FindStaleInProgressAsync` (InMemory + Spanner) en `src/Nequi.Shared/Data/SpannerStores.cs:103-122`. Busca `WHERE status='IN_PROGRESS' AND created_at < @cutoff` ordenado por `created_at` con límite; si `created_at` es NULL, la fila no satisface la comparación.
  - `IdempotencyReconciliationWorker` en `src/Nequi.Workers/Idempotency/IdempotencyReconciliationWorker.cs` ejecuta el escaneo periódico y `IdempotencyReconciler.ScanOnceAsync` solo informa/loguea; no libera automáticamente.
  - Nuevo `IdempotencyAdminController` (Backoffice): `GET /v1/admin/idempotency/stale`, `POST /v1/admin/idempotency/release` (solo `OPERADOR_FINANCIERO`, `motivo` obligatorio, auditado como `IDEMPOTENCY_KEY_RELEASED`). **Deliberadamente manual**; el código primero ejecuta `AbandonAsync` y después `audit.WriteAsync`, por lo que un fallo de auditoría posterior puede dejar la liberación sin registro.
  - Tests añadidos: test de regresión para fallo post-éxito + tests de reconciliador.
- **Descripción:** Ventana entre commit transacción financiera y registro de idempotencia mitigada; se detectan registros huérfanos y requieren liberación manual con verificación.
- **Escenarios revisados:** (1) si el movimiento confirma y falla `CompleteAsync`, la clave permanece `IN_PROGRESS` y el reintento recibe 409; (2) si el movimiento confirma y luego lanza una excepción observada por el filtro, el filtro puede llamar `AbandonAsync`, por lo que la protección depende de que la excepción no ocurra después de un efecto ya confirmado; (3) un HTTP 5xx provoca `AbandonAsync` y deja reintentable la misma clave, sin prueba que demuestre si el 5xx ocurrió antes o después del efecto; (4) una terminación del proceso deja `IN_PROGRESS`, sujeto a `created_at` y al reconciliador; (5) una liberación manual puede duplicar el movimiento si el ledger ya lo registró; (6) la liberación se elimina antes de registrar la auditoría; (7) un registro `IN_PROGRESS` con `created_at` NULL no aparece en la consulta de stale. Estos son resultados de inspección estática, no errores reproducidos en producción.
- **Protecciones verificadas:** hash de cuerpo, clave por actor/scope, replay/conflict/in-progress, no abandono tras fallo de `CompleteAsync` posterior a un resultado menor que 500, rol y motivo para release, auditoría intentada y tests unitarios para el caso de fallo de `CompleteAsync` y stale en memoria.
- **Garantías no verificadas:** atomicidad entre ledger y registro de idempotencia, semántica real de Spanner para `created_at`, comportamiento ante muerte de proceso, clasificación causal de 5xx posteriores al efecto, atomicidad release+auditoría y reconciliación en despliegue real.
- **Causa:** Diseño transaccional no atómico (persistente).
- **Impacto:** Riesgo residual - liberación manual ciega puede reintroducir doble ejecución si efecto ya aplicado.
- **Cambios encontrados:** Mitigación significativa (no más abandono tras éxito, detección + reconciliación + controles admin). Persisten garantías incompletas.
- **Solución recomendada (sin implementar):** Evaluar atomicidad efecto+idempotencia, mecanismo transaccional unificado o reconciliación automática con verificación de ledger antes de liberar.
- **Pruebas existentes:** `tests/Nequi.Tests/IdempotencyTests.cs` cubre fallo de `CompleteAsync` después de éxito, reintento bloqueado, 5xx reintentable y reconciliador en memoria. Faltan: Spanner real, muerte de proceso entre pasos, escenarios con 5xx después del commit financiero, release con ledger ya aplicado, fallo de auditoría posterior y `created_at` NULL.
- **Prioridad:** Crítica | **Dificultad:** Difícil

### AUD-002 — Gateway readiness sin verificación upstreams
- **Categoría:** Infraestructura / Disponibilidad | **Severidad:** Crítica | **Estado anterior:** Confirmado | **Estado nuevo:** **RESUELTO — Verificado**
- **Módulo:** Nequi.Gateway | **Archivo/Líneas:** `src/Nequi.Gateway/Program.cs:103-167`
- **Evidencia actual:**
  - HttpClient dedicado `gateway-health` con timeout 3s (`AddHttpClient("gateway-health", c => c.Timeout = TimeSpan.FromSeconds(3))`).
  - `/health/ready` llama `Task.WhenAll` a todos los servicios, hace GET a `{baseUrl}/health/live` con identity token si habilitado.
  - Cuenta checks por servicio, devuelve 200 si todos Healthy, 503 con detalle si alguno Unhealthy. Diferencia correctamente liveness (`/health/live`) vs readiness.
  - Manejo de excepciones marca como Unhealthy.
- **Descripción:** Ahora verifica cada upstream realmente.
- **Impacto:** Elimina falso positivo de readiness.
- **Cambios encontrados:** Implementación completa según lo solicitado.
- **Pruebas necesarias:** Caídas upstream, timeouts - cubierto conceptualmente.
- **Prioridad:** Crítica | **Dificultad:** Media

### AUD-003 — JWT backoffice/http.ts sin inicialización demostrada
- **Categoría:** Seguridad / Frontend | **Severidad:** Crítica | **Estado anterior:** Confirmado (evidencia negativa) | **Estado nuevo:** **RESUELTO — Verificado**
- **Módulo:** Frontend auth/http | **Archivos/Líneas:** `frontend/src/services/api.ts:11,27-32`, `frontend/src/api/http.ts:12,23-33,43-73`
- **Evidencia actual:**
  - `services/api.ts` importa `configureHttp` y lo llama en inicialización con `getToken: () => sessionManager.getAccessToken()` y `onUnauthorized` que llama `sessionManager.handleUnauthorized()`. Comentario explica que adapta http.ts heredado usado por Backoffice.
  - `api/http.ts` usa `createHttpClient` con `getAccessToken: tokenProvider` y pasa a `client.request`. Token provider inicializado correctamente.
  - `newIdempotencyKey` ahora asignado desde `generateIdempotencyKey` importado desde `utils/idempotency.ts`.
- **Descripción:** Inicialización añadida; dos caminos HTTP aún existen pero adaptador heredado queda inicializado.
- **Impacto:** Backoffice ahora envía Authorization via tokenProvider configurado.
- **Cambios encontrados:** Se resolvió el punto crítico. Queda arquitectura dual (AUD-012) como riesgo potencial menor.
- **Pruebas necesarias:** Auth backoffice, 401/refresh/logout.
- **Prioridad:** Crítica | **Dificultad:** Media

## 5. Errores de prioridad alta

### AUD-004 — Movements sin paginación por cursor
- **Categoría:** Backend/Rendimiento | **Severidad:** Alta | **Estado anterior:** Confirmado | **Estado nuevo:** **PARCIALMENTE RESUELTO**
- **Módulo:** Nequi.Finance/Movements | **Archivos:** `src/Nequi.Finance/Movements/MovementsEndpoints.cs`, `src/Nequi.Finance/Common/KeysetCursor.cs`, `frontend/src/services/movementsService.ts`, `frontend/src/hooks/useApiData.ts`
- **Evidencia actual:** Backend acepta `cursor`, devuelve `nextCursor` y tiene pruebas de múltiples páginas, empates y cursor inválido. El servicio frontend tipa/parsea solo `clientId`, `count`, `limit` e `items`; envía únicamente `{ limit }`, y `useApiData.ts` llama `movements.list({ limit, signal })`.
- **Descripción:** Paginación implementada en backend y compatible en el contrato HTTP, pero no integrada en el servicio ni utilizada por las pantallas.
- **Cambios encontrados:** Backend verificado; consumo frontend pendiente. No se declara funcionalidad completa.
- **Pruebas necesarias:** Vacío, múltiples páginas, mismo timestamp, cursor inválido, sin duplicados/saltos y prueba del servicio/pantalla consumiendo `nextCursor`.
- **Prioridad:** Alta | **Dificultad:** Media

### AUD-005 — Sin CI/CD
- **Categoría:** DevOps/Calidad | **Severidad:** Alta | **Estado anterior:** Confirmado | **Estado nuevo:** **RESUELTO — Verificado**
- **Evidencia actual:** `.github/workflows/ci.yml` creado. Jobs: `backend` (restore/build/test con dotnet 10.0.x en ubuntu-latest) y `frontend` (npm ci, typecheck `tsc --noEmit`, unit tests `node scripts/run-unit-tests.mjs` con cache npm). Trigger push/main y PR. La ejecución `40769269917` se considera exitosa por el registro proporcionado, no por una ejecución local ni una recuperación independiente.
- **Descripción:** CI básico implementado.
- **Cambios encontrados:** Resuelto. Falta cobertura móvil/integración/E2E/GCP.
- **Prioridad:** Alta | **Dificultad:** Media

### AUD-006 — Generador idempotencia con Math.random()
- **Categoría:** Seguridad/Confiabilidad | **Severidad:** Alta | **Estado anterior:** Confirmado | **Estado nuevo:** **PARCIALMENTE RESUELTO**
- **Archivos/Líneas:** `frontend/src/api/http.ts:4,32`, `frontend/src/utils/idempotency.ts:13-27,30-43`
- **Evidencia actual:** `api/http.ts` importa `generateIdempotencyKey` y lo asigna a `newIdempotencyKey`. `idempotency.ts:13-27` usa `crypto.getRandomValues()` cuando `globalThis.crypto` existe y expone esa función; si no, entra en el bucle que genera bytes con `Math.random()`.
- **Descripción:** El fallback existe realmente y se activa en runtimes React Native/Expo o entornos de prueba donde `globalThis.crypto.getRandomValues` no esté disponible o no sea una función. `Math.random()` no es criptográficamente seguro: reduce impredecibilidad y confiabilidad de unicidad, aunque la clave no se trate como secreto.
- **Cambios encontrados:** Se priorizó CSPRNG, pero el hallazgo no está completamente resuelto. Recomendación: exigir una fuente criptográfica disponible en las plataformas soportadas y fallar explícitamente si falta, o usar el generador seguro oficial del runtime; no sustituirlo por `Math.random()`.
- **Prioridad:** Alta | **Dificultad:** Fácil

### AUD-007 — Implementado sin verificación de pruebas integradas
- **Categoría:** Testing/Calidad | **Severidad:** Alta | **Estado anterior:** Implementado sin verificación completa | **Estado nuevo:** **PARCIALMENTE RESUELTO**
- **Evidencia actual:** Tests añadidos (`IdempotencyTests.cs` con 3 casos nuevos/relevantes). CI ejecuta backend tests y frontend unit tests. Commits indican 109/109 y 117/117 tests pasando en entorno del autor. No se ejecutaron localmente en esta auditoría.
- **Descripción:** Mejor cobertura, pero aún sin verificación local/build exitosa.
- **Cambios encontrados:** Progreso significativo.
- **Pruebas necesarias:** Ejecutar localmente o verificar CI completo.
- **Prioridad:** Alta | **Dificultad:** Media

### AUD-012 — Dos caminos HTTP en frontend
- **Categoría:** Arquitectura/Seguridad | **Severidad:** Alta | **Estado anterior:** Riesgo potencial | **Estado nuevo:** **PARCIALMENTE RESUELTO**
- **Archivos:** `frontend/src/services/api.ts`, `frontend/src/api/http.ts`
- **Evidencia actual:** Ambos inicializados/configurados; adaptador heredado ahora recibe token via `configureHttp`. Aún existen dos caminos.
- **Descripción:** Riesgo reducido pero no eliminado.
- **Prioridad:** Alta | **Dificultad:** Media

### AUD-013 — Dependencias build en entorno
- **Categoría:** Entorno/Build | **Severidad:** Alta | **Estado anterior:** Problema del entorno | **Estado nuevo:** **NO VERIFICADO**
- **Evidencia:** Sin builds ejecutados localmente. CI existe ahora.
- **Prioridad:** Alta | **Dificultad:** Media

## 6. Errores de prioridad media y baja

### AUD-004b — Paginación Cash
- **Categoría:** Backend/Rendimiento | **Severidad:** Alta/Media | **Estado anterior:** Confirmado | **Estado nuevo:** **PARCIALMENTE RESUELTO**
- **Archivos:** `src/Nequi.Finance/Cash/CashController.cs`, `src/Nequi.Finance/Cash/CashService.cs`, `src/Nequi.Finance/Cash/CashStore.cs`, `frontend/src/services/cashService.ts`, `src/Nequi.Finance/Common/KeysetCursor.cs`, `frontend/src/hooks/useApiData.ts`
- **Evidencia actual (commit f0deffd, 2179203):**
  - Cursor keyset sobre movimientos/cash. `KeysetCursor` usa **Base64 URL-safe** (`System.Buffers.Text.Base64Url`) para evitar '+' rompiendo query strings.
  - `FirestoreCashStore` ya **no reclampa** el limit (eliminado reclamp que impedía detectar página siguiente al pedir `limit+1` en el límite máximo 500). `CashService` mantiene `MaxMovementLimit = 500`.
  - Se lee `limit + 1` para determinar `nextCursor`. Headers/CORS: `X-Next-Cursor` expuesto.
  - `CashController` admite `cursor` y devuelve `X-Next-Cursor`, pero `frontend/src/services/cashService.ts` solo declara/usa `limit`, descarta headers y devuelve el array plano; `useApiData.ts` tampoco mantiene cursor.
- **Descripción:** Paginación correctamente implementada en backend, con contrato compatible, pero pendiente de integración efectiva en el servicio y las pantallas frontend.
- **Pruebas necesarias:** Límites, empates, páginas sucesivas, cursor inválido, lectura de `X-Next-Cursor` y carga sucesiva desde la pantalla.
- **Prioridad:** Alta | **Dificultad:** Media

### NUEVO-AUD-028 — created_at en idempotency_records puede ser NULL
- **Categoría:** Base de datos / Idempotencia / Reconciliación | **Severidad:** Alta | **Estado:** **RIESGO POTENCIAL — No verificado en Spanner real**
- **Módulo:** Spanner/Idempotency | **Archivos/Líneas:** `database/spanner/01_schema.sql:96-106`, `src/Nequi.Shared/Data/SpannerStores.cs:17-62,103-122`
- **Evidencia actual:**
  - Esquema: `created_at TIMESTAMP OPTIONS (allow_commit_timestamp = true)` **sin DEFAULT** y sin NOT NULL.
  - `SpannerIdempotencyStore.BeginAsync()` usa transacción y hace INSERT/UPDATE/SELECT; no se ve asignación explícita de `created_at` en el código revisado. Spanner con `allow_commit_timestamp = true` puede asignar commit timestamp si se usa `SpannerParameter` con commit timestamp o DML con `PENDING_COMMIT_TIMESTAMP()`, pero esto no es evidente en el código actual.
  - `FindStaleInProgressAsync` filtra `WHERE status='IN_PROGRESS' AND created_at < @cutoff`. Si `created_at` es NULL, la comparación típicamente excluye la fila (en SQL) y **quedaría fuera del reconciliador**.
- **Descripción:** Inconsistencia estática potencial. Registros IN_PROGRESS insertados sin timestamp quedarían excluidos de detección de huérfanos.
- **Impacto:** Reconciliador podría no detectar registros atascados antiguos.
- **Solución recomendada (sin implementar):** Verificar esquema desplegado en GCP, asegurar NOT NULL + DEFAULT/PENDING_COMMIT_TIMESTAMP o asignación explícita en INSERT, añadir validación/migración, pruebas con Spanner real/emulador.
- **Pruebas necesarias:** Verificar valores NULL, comportamiento reconciliador.
- **Prioridad:** Alta | **Dificultad:** Media

### NUEVO-AUD-029 — Liberación manual de claves huérfanas
- **Categoría:** Seguridad / Operaciones / Integridad financiera | **Severidad:** Alta | **Estado:** **RIESGO POTENCIAL — Diseñado intencionalmente**
- **Módulo:** Backoffice/Idempotency | **Archivos:** `src/Nequi.Backoffice/Controllers/Financial/IdempotencyAdminController.cs`, `tests/Nequi.Tests/IdempotencyTests.cs`, `ARCHITECTURE.md`
- **Evidencia actual:** Endpoint `POST /v1/admin/idempotency/release` requiere `OPERADOR_FINANCIERO`, motivo obligatorio, auditado como `IDEMPOTENCY_KEY_RELEASED`. Documentado como deliberadamente manual - no se puede saber si efecto financiero ya aplicado.
- **Descripción:** Control correcto pero riesgo operativo si liberado incorrectamente.
- **Impacto:** Doble ejecución si se libera clave cuyo movimiento ya se aplicó.
- **Mitigantes:** Autorización, motivo obligatorio, auditoría, documentación clara.
- **Pruebas necesarias:** Proceso operacional, verificación ledger antes de liberar.
- **Prioridad:** Alta | **Dificultad:** Media

### NUEVO-AUD-030 — Liberación de clave antes de registrar auditoría
- **Categoría:** Seguridad / Auditoría / Integridad financiera | **Severidad:** Alta | **Estado:** **RIESGO POTENCIAL**
- **Módulo:** Backoffice/Idempotency | **Archivos:** `src/Nequi.Backoffice/Controllers/Financial/IdempotencyAdminController.cs`
- **Evidencia actual:** `Release` ejecuta `store.AbandonAsync(...)` y después `audit.WriteAsync(...)`. Si la segunda operación falla, la clave ya fue liberada pero no existe garantía en este flujo de que quede evento de auditoría.
- **Impacto:** Pérdida de trazabilidad de una acción operativa que puede habilitar una repetición financiera.
- **Solución recomendada:** Diseñar una operación durable/atómica o un outbox de auditoría que registre la intención y el resultado de la liberación; añadir prueba de fallo de auditoría. No implementado en esta auditoría.
- **Pruebas necesarias:** Falla controlada de `AuditLog`, verificación de estado de la clave y existencia del evento.
- **Prioridad:** Alta | **Dificultad:** Media

### NUEVO-AUD-031 — Cursor backend no consumido por frontend
- **Categoría:** Integración / Rendimiento | **Severidad:** Alta | **Estado:** **PENDIENTE**
- **Módulo:** Frontend Movements/Cash | **Archivos:** `frontend/src/services/movementsService.ts`, `frontend/src/services/cashService.ts`, `frontend/src/hooks/useApiData.ts`
- **Evidencia actual:** No hay referencias frontend a `nextCursor`, `X-Next-Cursor` ni `cursor`; los servicios y el hook envían únicamente `limit`. El backend sí implementa ambos cursores.
- **Impacto:** Las pantallas solo pueden cargar la primera página aunque el backend soporte historial paginado; puede haber truncamiento silencioso del historial.
- **Solución recomendada:** Extender el contrato de servicio y los consumidores para conservar/enviar cursores y añadir estados de carga/error para páginas sucesivas. No implementado en esta auditoría.
- **Pruebas necesarias:** Unitarias de servicios, integración de varias páginas y prueba de pantalla sin duplicados ni saltos.
- **Prioridad:** Alta | **Dificultad:** Media

### AUD-008 — Inventario pantallas
- **Categoría:** Documentación | **Severidad:** Media | **Estado:** Información verificada

### AUD-009 — SQLite offline
- **Categoría:** Funcional | **Severidad:** Media | **Estado:** Funcionalidad incompleta/No verificado

### AUD-010 — WebSockets/reconexión
- **Categoría:** Funcional | **Severidad:** Media | **Estado:** Parcial/No verificado

### AUD-011 — Colecciones Firestore
- **Categoría:** Base de datos | **Severidad:** Media | **Estado:** Parcial/No verificado

### AUD-014 — Rutas auth/recuperación
- **Categoría:** UX/Funcional | **Severidad:** Media | **Estado:** No verificado

### AUD-015 — Navegación centralizada App.tsx
- **Categoría:** Arquitectura | **Severidad:** Media | **Estado:** Riesgo potencial

### AUD-016 — Config Android/iOS
- **Categoría:** Build móvil | **Severidad:** Media | **Estado:** No verificado

### AUD-017 — Paginación otros endpoints
- **Categoría:** Backend | **Severidad:** Media | **Estado:** Parcial/No verificado

### AUD-018 — Logs sensibles
- **Categoría:** Seguridad | **Severidad:** Media | **Estado:** No verificado

### AUD-019 — Demo headers
- **Categoría:** Seguridad | **Severidad:** Media | **Estado:** Riesgo potencial

### AUD-020 — Errores navegación frontend
- **Categoría:** UX | **Severidad:** Media | **Estado:** No verificado

### AUD-021 — Código duplicado
- **Categoría:** Mantenimiento | **Severidad:** Baja | **Estado:** Riesgo potencial

### AUD-022 — Documentación desactualizada
- **Categoría:** Documentación | **Severidad:** Baja | **Estado:** **PARCIALMENTE RESUELTO** (ARCHITECTURE.md actualizado en commits)

### AUD-023 — Pantallas incompletas
- **Categoría:** Funcional | **Severidad:** Baja | **Estado:** No verificado

### AUD-024 — Dependencias no usadas
- **Categoría:** Mantenimiento | **Severidad:** Baja | **Estado:** No verificado

### AUD-025 — Tests existentes no ejecutados
- **Categoría:** Testing | **Severidad:** Media | **Estado:** **PARCIALMENTE RESUELTO**

### AUD-026 — Web/compatibilidad
- **Categoría:** Plataforma | **Severidad:** Baja | **Estado:** No verificado

### AUD-027 — Secretos/config
- **Categoría:** Seguridad | **Severidad:** Media | **Estado:** No verificado

### Matriz diferencial de hallazgos

| ID | Severidad | Estado anterior | Estado actual | Evidencia | Pendiente |
|---|---|---|---|---|---|
| AUD-001 | Crítica | Riesgo arquitectónico, no reproducido | PARCIALMENTE RESUELTO | Filtros de idempotencia, `SpannerStores.cs`, tests de fallo post-éxito | Atomicidad ledger/idempotencia, muerte de proceso, `created_at`, release seguro |
| AUD-002 | Crítica | Confirmado | RESUELTO — Verificado en código | `src/Nequi.Gateway/Program.cs:103-167` | Pruebas con upstream caído/timeout |
| AUD-003 | Crítica | Confirmado | RESUELTO — Verificado en código | `frontend/src/services/api.ts`, `frontend/src/api/http.ts` | Validación móvil de 401/refresh/logout |
| AUD-004 | Alta | Confirmado | PARCIALMENTE RESUELTO | `MovementsEndpoints.cs` admite cursor; `movementsService.ts` solo envía `limit` | Integración de cursor en servicio/pantallas |
| AUD-004b | Alta/Media | Confirmado | PARCIALMENTE RESUELTO | `CashController/Service/Store` admite cursor; `cashService.ts` no lee header | Integración de cursor en servicio/pantallas |
| AUD-005 | Alta | Confirmado | RESUELTO — Verificado en código | `.github/workflows/ci.yml` | Integración/E2E, móvil y GCP |
| AUD-006 | Alta | Confirmado | PARCIALMENTE RESUELTO | `frontend/src/utils/idempotency.ts:13-27` | Eliminar fallback a `Math.random()` o fallar sin CSPRNG |
| AUD-007 | Alta | Implementado sin verificación completa | PARCIALMENTE RESUELTO | Tests añadidos y CI configurada | Ejecución local, Spanner, E2E y móvil |
| AUD-008 | Media | Inventario pendiente | RESUELTO — Verificado en código | 170 TSX, 164 Screen, 6 auxiliares, 21 carpetas + `operations/tabs` | Mantener conteo ante cambios |
| AUD-009 | Media | Incompleto | PENDIENTE | SQLite/offline no completo | Implementación y pruebas de sincronización |
| AUD-010 | Media | Parcial | NO VERIFICADO | `Nequi.Realtime` presente | Reconexión y pruebas móviles |
| AUD-011 | Media | Parcial | NO VERIFICADO | Colecciones Firestore y configuración | Validar esquema/índices desplegados |
| AUD-012 | Alta | Riesgo potencial | PARCIALMENTE RESUELTO | `services/api.ts` y `api/http.ts` coexisten | Unificar caminos HTTP |
| AUD-013 | Alta | Problema de entorno | NO VERIFICADO | No se ejecutó build local | Reproducir entorno y validar dependencias |
| AUD-014 | Media | No verificado | NO VERIFICADO | Rutas/pantallas auth | Pruebas de recuperación |
| AUD-015 | Media | Riesgo potencial | RIESGO POTENCIAL | Navegación state-based en `App.tsx` | Validar crecimiento y rutas |
| AUD-016 | Media | No verificado | NO VERIFICADO | Configuración móvil no ejecutada | Build Android/iOS |
| AUD-017 | Media | Parcial | NO VERIFICADO | Otros endpoints no auditados completamente | Revisar contratos y consumidores |
| AUD-018 | Media | No verificado | NO VERIFICADO | Logs revisados solo parcialmente | Revisión de secretos/JWT/datos financieros |
| AUD-019 | Media | Riesgo potencial | RIESGO POTENCIAL | `Auth__DemoHeaders` configurable en deploy | Verificar bloqueo efectivo en producción |
| AUD-020 | Media | No verificado | NO VERIFICADO | Navegación frontend extensa | Pruebas de errores y estados |
| AUD-021 | Baja | Riesgo potencial | NO VERIFICADO | Duplicación no cuantificada | Medición y refactor selectivo |
| AUD-022 | Baja | Desactualizada | PARCIALMENTE RESUELTO | `ARCHITECTURE.md` actualizado; otros docs pendientes | Revisar README/UX Mapping |
| AUD-023 | Baja | No verificado | NO VERIFICADO | Pantallas inventariadas, comportamiento no completo | Revisión Stitch/UX y flujos |
| AUD-024 | Baja | No verificado | NO VERIFICADO | Dependencias no auditadas con build | Analizar package/project files |
| AUD-025 | Media | No ejecutados | PARCIALMENTE RESUELTO | CI configurada; local no ejecutado | Confirmar run y cobertura |
| AUD-026 | Baja | No verificado | NO VERIFICADO | Expo web no validado | Build/prueba web si aplica |
| AUD-027 | Media | No verificado | NO VERIFICADO | Secretos/config no comprobados en GCP | Revisión de despliegue y Secret Manager |
| NUEVO-AUD-028 | Alta | No existente | RIESGO POTENCIAL | `01_schema.sql:96-106`; `SpannerStores.cs:41-48,103-122` | Verificar NULL y timestamp en Spanner/emulador |
| NUEVO-AUD-029 | Alta | No existente | RIESGO POTENCIAL | `IdempotencyAdminController.cs` release manual | Procedimiento ledger y doble control |
| NUEVO-AUD-030 | Alta | No existente | RIESGO POTENCIAL | `AbandonAsync` precede a `audit.WriteAsync` | Hacer durable/atómica la auditoría |
| NUEVO-AUD-031 | Alta | No existente | PENDIENTE | Servicios/hooks frontend no usan cursor | Implementar consumo y pruebas |

## 7. Auditoría del backend

| Servicio | Estado | Archivos clave | Observaciones |
|---|---|---|---|
| Nequi.Gateway | **Corregido** | `src/Nequi.Gateway/Program.cs:103-167` | Ready verifica upstreams con timeout e identity tokens |
| Nequi.Wallet | Implementado | `src/Nequi.Wallet/*` | Transaccional, outbox, idempotencia con mitigaciones |
| Nequi.Finance | **Mejorado** | `src/Nequi.Finance/Movements/*`, `src/Nequi.Finance/Cash/*` | Cursor pagination añadido/corregido |
| Nequi.Backoffice | **Ampliado** | `src/Nequi.Backoffice/Controllers/Financial/IdempotencyAdminController.cs` | Nuevo admin de idempotencia huérfana |
| Nequi.Workers | **Ampliado** | `src/Nequi.Workers/Idempotency/IdempotencyReconciliationWorker.cs` | Reconciliación periódica añadida |
| Nequi.Realtime | Presente | `src/Nequi.Realtime/*` | WebSocket |
| Nequi.Profile | Presente | `src/Nequi.Profile/*` | Estructura |
| Nequi.Assistant | Presente | `src/Nequi.Assistant/*` | Solo lectura según diseño |
| Nequi.Shared | **Mejorado** | `src/Nequi.Shared/Idempotency/*`, `src/Nequi.Shared/Data/SpannerStores.cs` | Filtros corregidos y reconciliación; el cursor está en `src/Nequi.Finance/Common/KeysetCursor.cs` |

## 8. Auditoría del frontend

| Área | Estado | Evidencia |
|---|---|---|
| Pantallas | 170 archivos (164 Screen + 6 auxiliares), 21 carpetas principales + `operations/tabs` | Conteo verificado |
| Navegación | Estado-based (`App.tsx`, `BackofficeApp.tsx`) | Sin Router/Navigation |
| HTTP | `services/http/client.ts` robusto; `api/http.ts` **inicializado** | JWT, RFC9457, timeout, idempotencia con CSPRNG y fallback no seguro |
| Sesión | `services/session/sessionManager.ts` correcto | Restore/refresh, 401, single-flight |
| Integración API | **Parcial** | Servicio central + adaptador heredado inicializado; Movements/Cash no consumen cursores |
| Datos DEMO | Presente | `src/data/demoMovements.ts` |
| Tokens/estilos | `src/theme/colors.ts` único | OK |
| Tests | `frontend/tests/` presente, CI ejecuta unit tests | No ejecutados localmente |

## 9. Auditoría de seguridad

| Área | Estado | Notas |
|---|---|---|
| Autenticación JWT | **Mejorado** | Backoffice inicializado vía configureHttp |
| Autorización RBAC | Implementado | Políticas en controladores, IdempotencyAdmin requiere OPERADOR_FINANCIERO |
| Idempotencia keys | **Parcialmente resuelto** | Prioriza CSPRNG, pero el fallback es `Math.random()` y no es criptográficamente seguro |
| Gateway readiness | **Corregido** | Verificación real upstream |
| Idempotencia financiera | **Mitigado** | No abandona tras éxito; reconciliación + release manual; riesgo residual |
| Demo headers | Riesgo potencial | Requiere bloqueo prod |
| Ownership checks | Implementado | Visto en controladores |
| Logs sensibles | No verificado | Revisar |
| Admin endpoints | **Nuevo con controles** | Motivo obligatorio, auditoría, rol restringido |

## 10. Auditoría de bases de datos

| BD | Estado | Notas |
|---|---|---|
| Spanner | Esquema completo, **mejorado** | `01_schema.sql` idempotency_records con `created_at` allow_commit_timestamp (sin NOT NULL/DEFAULT evidente). Añadido soporte reconciliación. |
| Firestore | Usado (mejorado) | Cash/Movements projections, índices actualizados |
| SQLite | Previsto | No implementado completamente |

## 11. Auditoría de infraestructura GCP

| Servicio | Estado | Notas |
|---|---|---|
| Gateway | **Corregido** | Health checks reales |
| Cloud Run | Definido | Scripts/infra |
| Pub/Sub | Definido | Workers |
| Secret Manager | Previsto | Config |
| Identity Platform | Presente/previsto | Integrado vía SessionManager |
| Artifact Registry/Cloud Build | Presente en docs/scripts | No verificado |
| CI/CD GitHub Actions | **Nuevo** | `.github/workflows/ci.yml` presente, ejecución exitosa reportada |

`infra/deploy.sh` define ocho destinos de despliegue independientes: siete servicios detrás del Gateway (`nequi-wallet`, `nequi-workers`, `nequi-realtime`, `nequi-finance`, `nequi-profile`, `nequi-backoffice`, `nequi-assistant`) y `nequi-gateway`, que es el único público de Cloud Run. Las suscripciones Pub/Sub complementan el despliegue de Workers y Realtime; no son destinos Cloud Run adicionales.

## 12. Auditoría de UX y navegación

| Aspecto | Estado | Notas |
|---|---|---|
| Stitch/UX Mapping | Presente | `frontend/UX_MAPPING.md`, PDF |
| Pantallas | 170 archivos | Extenso, mayoría implementadas |
| Navegación | Estado-based | Sin Router/Navigation |
| Estados UI | Parcial/No verificado | Por módulo |
| Accesibilidad | No verificado | |

## 13. Auditoría de pruebas

| Tipo | Estado | Evidencia |
|---|---|---|
| xUnit | Presente (`tests/Nequi.Tests/`) **ampliado** | IdempotencyTests con nuevos casos; 117/117 se conserva como resultado reportado, no ejecutado localmente ni recuperado independientemente |
| Bruno | Presente (`tests/bruno/`) | No ejecutados |
| Postman | Presente | No verificado |
| Frontend tests | Presente (`frontend/tests/`) | CI ejecuta unit tests |
| CI backend | **Configurado y reportado exitoso** | build+test |
| CI frontend | **Configurado** | typecheck+unit tests |
| Integración/E2E | No verificado | AUD-007 parcialmente mitigado |
| dotnet build/tsc local | No ejecutados en auditoría | Entorno no verificado |

## 14. Código que sería necesario modificar

| Archivo | Líneas | Problema | Cambio propuesto (sin implementar) | Prioridad | Dificultad |
|---|---|---|---|---|---|
| `database/spanner/01_schema.sql` | 96-106 | `created_at` sin NOT NULL/DEFAULT evidente | Asegurar NOT NULL + `PENDING_COMMIT_TIMESTAMP()` o default; migración validada | Alta | Media |
| `src/Nequi.Shared/Data/SpannerStores.cs` | 17-62, 103-122 | Verificar asignación created_at en INSERT | Asegurar timestamp en BeginAsync o confiar explícitamente en commit timestamp | Alta | Media |
| `src/Nequi.Backoffice/Controllers/Financial/IdempotencyAdminController.cs` | N/A | Release manual requiere verificación ledger | Añadir validación opcional/recordatorio, logs más detallados, consider soft-confirmación | Alta | Media |
| `src/Nequi.Shared/Idempotency/IdempotencyActionFilter.cs` | ~99-112 | Completar sin retry seguro tras fallo CompleteAsync | Ya corregido (no abandona). Considerar backpressure/retry controlado | Media | Media |
| `src/Nequi.Shared/Idempotency/IdempotencyFilter.cs` | ~73-83 | Idéntico al anterior | Ya corregido | Media | Media |

## 15. Componentes que convendría refactorizar

| Componente | Justificación | Propuesta |
|---|---|---|
| Gateway health | **Resuelto** | Ya implementado correctamente |
| Frontend HTTP dual | Aún existe dualidad | Unificar a cliente central completamente |
| http.ts idempotencia | **Parcial** | Usa CSPRNG cuando existe, pero conserva `Math.random()` |
| Movements/Cash pagination | **Parcial** | Backend implementado; frontend no consume cursores |
| App.tsx | Centralizado | Modularizar sin forzar Router |
| Idempotency reconciliación | Funcional pero manual | Evaluar automatización con salvaguardas |

## 16. Funcionalidades pendientes

| Funcionalidad | Estado | Notas |
|---|---|---|
| SQLite offline completo | Pendiente/No verificado | Cola efectivo, sync batch |
| Paginación cursor backend movimientos/cash | **Completado** | Implementado y corregido en endpoints/stores |
| Consumo frontend de cursores | **Pendiente** | Servicios/hooks/pantallas solo usan `limit` |
| Health checks Gateway | **Completado** | Implementado |
| Inicialización http.ts/backoffice auth | **Completado** | Implementado |
| CI/CD workflows | **Completado** | Implementado |
| Reconciliación idempotencia huérfana | **Implementado** | Detección + admin manual (intencional) |
| Integración frontend-backend completa | Parcial/No verificado | Por módulo |
| Tests integrados ejecutados localmente | Pendiente | CI reporta éxito remoto |

## 17. Documentación desactualizada

| Documento | Observación |
|---|---|
| `README.md` | Estado vs código real - muchos módulos implementados (parcialmente actualizado implícitamente) |
| `ARCHITECTURE.md` | **Actualizado** en commits 74c4296 y 2179203 (idempotencia, reconciliación) |
| `frontend/UX_MAPPING.md` | Verificar correspondencia con pantallas |
| `AUDITORIA.md` | **Actualizado** con evidencia diferencial |

## 18. Mejoras recomendadas

| Mejora | Tipo | Prioridad |
|---|---|---|
| Verificar created_at en idempotency_records (Spanner real/esquema desplegado) | Seguridad/Integridad | Crítica |
| Evaluar automatización reconciliación con verificación ledger | Integridad financiera | Crítica |
| Unificar caminos HTTP frontend completamente | Arquitectura/Seguridad | Alta |
| Validar builds/tests localmente | Calidad | Alta |
| Añadir pruebas Spanner/emulador para idempotencia | Testing | Alta |
| Completar cobertura CI (móvil/integración) | DevOps | Media |
| Revisar logs sensibles | Seguridad | Media |

## 19. Plan de corrección por fases (solo recomendaciones)

| Fase | Objetivo | Prioridad | Riesgo | Impacto | Dificultad | Archivos implicados | Dependencias | Pruebas/validación | Tipo |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Verificar `created_at` NULL y semántica de commit timestamp | Crítica | Reconciliador puede omitir huérfanos | Integridad financiera | Media | `database/spanner/01_schema.sql`, `src/Nequi.Shared/Data/SpannerStores.cs` | Acceso controlado al esquema desplegado o emulador; no producción desde esta auditoría | Consulta de NULL, inserción real, `FindStaleInProgressAsync`; validación GCP | Investigación + prueba + validación GCP |
| 2 | Auditar liberación manual contra ledger | Crítica | Reejecución de movimiento ya aplicado | Doble movimiento y pérdida de confianza | Media | `IdempotencyAdminController.cs`, `ARCHITECTURE.md` | Procedimiento operativo, ledger y doble control | Simulación de clave huérfana aplicada/no aplicada | Investigación + prueba |
| 3 | Hacer durable la auditoría de release | Alta | Liberación sin evento si `AuditLog` falla | Trazabilidad y control financiero | Media | `IdempotencyAdminController.cs`, servicio de auditoría | Outbox/transacción o política de compensación | Falla controlada de auditoría y verificación de evento | Corrección futura + prueba |
| 4 | Eliminar fallback `Math.random()` | Alta | Claves menos impredecibles/únicas en runtimes sin Web Crypto | Confiabilidad de reintentos financieros | Fácil | `frontend/src/utils/idempotency.ts` | CSPRNG disponible en Expo/React Native | Unit test con crypto ausente: debe fallar o usar fuente segura | Corrección futura + prueba |
| 5 | Integrar cursores en Movements y Cash frontend | Alta | Historial truncado en primera página | UX y rendimiento | Media | `frontend/src/services/movementsService.ts`, `cashService.ts`, `frontend/src/hooks/useApiData.ts`, pantallas consumidoras | Contratos de headers/body y diseño UX | Unitarias de cursor, integración multi-página, pantalla sin saltos | Corrección futura + prueba |
| 6 | Validar builds y suites automatizadas | Alta | Regresiones no detectadas localmente | Calidad de entrega | Media | `.github/workflows/ci.yml`, proyectos backend/frontend | SDK .NET, Node/npm | Repetir CI; ejecutar localmente sin afirmar resultado remoto | Prueba + validación CI |
| 7 | Unificar caminos HTTP frontend | Alta | Configuración/auth divergente | Mantenibilidad y seguridad | Media | `frontend/src/services/api.ts`, `frontend/src/api/http.ts` | Inventario de consumidores | Tests 401, refresh, backoffice y regresión de headers | Corrección futura + prueba |
| 8 | Añadir cobertura de integración/GCP y móvil | Media | Contratos no verificados en despliegue | Disponibilidad y UX | Difícil | Tests backend/frontend, Bruno, Expo | Credenciales/entornos aislados, emulador/dispositivo | E2E, Spanner/Firestore, Android/iOS | Validación GCP + mejora opcional |
| 9 | Completar SQLite/offline si sigue en alcance | Media | Datos locales inconsistentes | Continuidad offline | Difícil | Módulos SQLite/sync previstos | Decisión de producto y contrato de sincronización | Cola, reintentos, conflictos y recuperación | Mejora opcional |

## 20. Checklist final

- [x] Git inspeccionado (main, 2179203; comparado con c194f2f)
- [x] 22 secciones desarrolladas individualmente
- [x] Sin expresiones "ver evidencias arriba"/agrupaciones
- [x] Backend auditado servicio por servicio (incluyendo nuevos componentes)
- [x] Frontend módulo por módulo revisado
- [x] Seguridad, BD, GCP, UX, pruebas auditados
- [x] Matriz diferencial completa incluida (AUD-001 a AUD-027 y NUEVO-AUD-028 a NUEVO-AUD-031)
- [x] Hallazgos con evidencia/rutas/líneas actualizadas
- [x] Estados diferenciados (RESUELTO/PARCIALMENTE RESUELTO/PENDIENTE/RIESGO POTENCIAL)
- [x] Plan de fases documentado (sin ejecutar)
- [x] Únicamente `AUDITORIA.md` modificado
- [x] Nuevos hallazgos (NUEVO-AUD-028 a NUEVO-AUD-031) documentados
- [x] Commits nuevos analizados

## 21. Criterios para considerar terminado NequiTrampa

- [x] Riesgos críticos AUD-002 y AUD-003 abordados; AUD-006 permanece parcialmente resuelto por el fallback no seguro
- [ ] AUD-001 completamente mitigado (parcialmente resuelto - riesgo residual)
- [ ] created_at NULL verificado/corregido
- [x] Autenticación unificada inicializada
- [x] Gateway con health checks reales
- [ ] Paginación cursor consumida por frontend (backend sí implementado)
- [ ] Idempotencia completamente robustecida (CSPRNG sin fallback, atomicidad y reconciliación aún pendientes)
- [ ] Builds/tests validados localmente
- [x] CI/CD básico
- [ ] Integración frontend-backend completamente verificada
- [x] Sin falsos positivos de salud/readiness

## 22. Conclusión final

- **Commit auditado:** `2179203662e46ce82eef50e12114e11258c0c5bd` (vs anterior `c194f2f1fd2ed861528e69d7f565cce373443a6f`). Todos los commits nuevos analizados (74c4296, f0deffd, 2179203).
- **Hallazgos resueltos:** AUD-002 (Gateway readiness), AUD-003 (JWT/backoffice init), AUD-005 (workflow CI configurado) y AUD-008 (inventario verificado).
- **Hallazgos parcialmente resueltos:** AUD-001 (commit gap idempotencia), AUD-004/AUD-004b (cursor solo backend), AUD-006 (CSPRNG con fallback), AUD-007 (tests ampliados/CI), AUD-012 (dual HTTP paths), AUD-022/AUD-025.
- **Pendientes/Riesgo potencial:** NUEVO-AUD-028 (`created_at` NULL), NUEVO-AUD-029 (release manual), NUEVO-AUD-030 (release antes de auditoría), NUEVO-AUD-031 (cursor no consumido frontend), AUD-013, AUD-009/AUD-010/AUD-018/AUD-027 y varios sin verificar.
- **Nuevos hallazgos:** 4 (`NUEVO-AUD-028` a `NUEVO-AUD-031`). Son riesgos estáticos o pendientes; no se declaran errores reproducidos en producción.
- **CI:** Workflow presente; la ejecución `40769269917` para el commit auditado se conserva como resultado reportado, pero no fue recuperada independientemente desde este entorno.
- **Estado general:** Progreso significativo cerrando críticos. Persisten riesgos residuales en idempotencia (ventana transaccional + NULL timestamp + liberación manual) que requieren verificación antes de considerar resuelto AUD-001 completamente.
- **Git:** Solo `AUDITORIA.md` modificado en esta tarea. Sin pulls/fetch/checkouts/resets/pushes/commits.

---

## Seguimiento posterior de Fase 1 — no sustituye la auditoría histórica

**Fecha de actualización:** 2026-10-29
**Documento histórico:** esta auditoría conserva su inspección original sobre `main`, commit `2179203662e46ce82eef50e12114e11258c0c5bd`, fechada el 2026-10-28.
**Seguimiento:** rama `fix/auditoria-fase-1-idempotencia`, HEAD `7785151564d89f39c7f3ba44baa025095220a136`.
**Alcance:** evolución de la Fase 1, pruebas locales y revisión integral posterior. No se accedió a GCP ni se alteraron datos reales.

### Estado de la Fase 1

La Fase 1 queda **CERRADA SEGÚN EL ALCANCE PLANIFICADO — PARCIALMENTE VALIDADA EN ENTORNO LOCAL — NO AUTORIZADA PARA PRODUCCIÓN**.

Este estado no convierte las pruebas del emulador en autorización de despliegue. Las pruebas omitidas permanecen omitidas y no se contabilizan como aprobadas.

### Historial de implementación y trazabilidad

Los commits citados existen en el repositorio local y fueron comprobados mediante Git.

| Fecha comprobada | Incremento | Commit | Cambios principales | Evidencia documentada |
|---|---|---|---|---|
| 2026-10-29 20:16:25 -05:00 | 7D — correlación financiera | `1d3abfab19f2c5491d0a92776655592170cf9047` | Correlación de reserva HTTP, `FinancialIntent` y ledger; actor, clave y hash; recuperación confirmada. | `ConfirmedTransferRecoveryService`, filtros y pruebas de recuperación. |
| 2026-10-29 20:24:03 -05:00 | 7E — transferencias | `1ed7782c3ce7f7880bee0b8d19d82c6edd90b7ef` | `CreateTransferWithFinancialIntentAsync`; intención, ledger, asientos, balances y outbox en transacción compartida. | 4/4 pruebas del emulador reportadas; controlador HTTP real no conectado. |
| 2026-10-29 20:32:43 -05:00 | 7F — recargas | `0fad825c11127459f79df2db1efd49406990d714` | `CreateRechargeWithFinancialIntentAsync`; coordinación atómica, rollback, replay y unidades monetarias. | 4/4 pruebas reportadas; integración HTTP productiva no activada. |
| 2026-10-29 20:38:39 -05:00 | 7G — recuperación HTTP | `0b2cf5137dc247cd6ef4bec72ed434973dd2df53` | `IIdempotencyRecoveryHandler`, handler de transferencias y activación condicionada. | Transferencias; recargas inciertas siguen bloqueadas. |
| 2026-10-29 21:03:16 -05:00 | Cierre 7G | `e31df67e866df6f54b35b10ed9a011ce670a84ae` | TestServer, fallo controlado de `CompleteAsync`, replay y corrección de `created_at`. | 2/2 pruebas HTTP reportadas. |
| 2026-10-29 21:08:18 -05:00 | 1A — esquema/TTL | `ce884c011231e2b46387e02dc23e5b416ff7102d2` | `created_at` explícito e inmutable; stale read-only; bloqueo financiero `FAILED`; análisis TTL/DDL. | 5/5 pruebas de política reportadas. |
| 2026-10-29 21:20:35 -05:00 | 1C — reconciliación histórica | `7785151564d89f39c7f3ba44baa025095220a136` | Clasificador read-only, endpoint Backoffice y pruebas fail-closed. | 7/7 pruebas del emulador reportadas. |

Las fechas anteriores son fechas de commit comprobadas; no representan necesariamente la hora de ejecución de cada prueba.

### Actualización de hallazgos existentes

#### AUD-001 — Commit gap en idempotencia financiera

**Estado:** mitigación local importante; riesgo productivo no resuelto completamente.

Seguimiento:

- Se añadió identidad durable mediante `FinancialIntent`.
- Transferencias y recargas tienen métodos aislados que coordinan intención, ledger, asientos, balances y outbox en la misma transacción Spanner.
- Se añadió recuperación read-only de transferencias confirmadas.
- Se añadió clasificación histórica fail-closed.
- Se probaron replay, hash incompatible, concurrencia y rollback en el emulador.
- Permanecen los riesgos de commit con resultado desconocido, expiración TTL, históricos sin evidencia y controladores HTTP reales no integrados.

No se declara resuelto el riesgo productivo.

#### NUEVO-AUD-028 — `created_at` en `idempotency_records`

La afirmación histórica sobre `BeginAsync` omitiendo `created_at` queda corregida en el código posterior. `BeginAsync` escribe `created_at` explícitamente; las pruebas locales verificaron persistencia e inmutabilidad durante replay y `CompleteAsync`.

Persisten diferencias entre `00_live_schema.sql` y `01_schema.sql`, y el esquema desplegado real no fue verificado. El hallazgo no debe describirse como defecto actual demostrado del `INSERT` sin conservar su contexto histórico.

#### NUEVO-AUD-029 — Liberación manual de claves huérfanas

- La liberación administrativa continúa bloqueada con `idempotency_release_disabled`.
- La reconciliación histórica clasifica evidencia sin liberar claves financieras.
- No existe liberación automática de reservas ambiguas.
- El proceso seguro de liberación administrativa todavía no está implementado.

**Estado:** mitigación por contención; pendiente.

#### NUEVO-AUD-030 — Liberación antes de auditoría

El riesgo estructural permanece. No existe una transacción común demostrada entre decisión administrativa, CAS y auditoría durable. La liberación permanece deshabilitada como mitigación. No debe declararse resuelto.

#### AUD-007 y AUD-025 — pruebas y validación

Se incorporaron pruebas de emulador, TestServer, concurrencia, rollback, transferencias, recargas, recuperación y reconciliación histórica. La cobertura backend reportada no equivale a cobertura frontend, móvil, E2E, despliegue ni Cloud Spanner real.

La última suite habitual reportada fue 208 total, 165 aprobadas, 43 omitidas y 0 fallidas. Codex no pudo repetirla durante la auditoría integral por `MSB3491` al escribir en `obj`; ese bloqueo no se interpreta como fallo funcional ni como nueva ejecución.

#### AUD-019 — Demo headers

El riesgo permanece. `AuthExtensions.cs` registra el esquema demo cuando `Auth:DemoHeaders=true`, y `infra/deploy.sh` permite propagar esa configuración a Cloud Run. La configuración base deja el valor en `false`, pero no existe una protección codificada que rechace el valor en `Production`.

**Estado:** no corregido; requiere hardening fail-closed y validación de despliegue.

#### AUD-022 — documentación

Esta adenda actualiza `PLAN_TRABAJO_NEQUITRAMPA.md` y `AUDITORIA.md` sin sustituir las secciones históricas. La documentación local continúa siendo distinta de una autorización de commit, publicación o despliegue.

### Riesgos residuales de la auditoría integral

| ID | Severidad | Evidencia | Estado/mitigación | Consecuencia | Corrección futura | Condición de resolución |
|---|---|---|---|---|---|---|
| RES-F1-001 | Crítica | `00_live_schema.sql` y `01_schema.sql` no contienen `financial_intents`; fixtures sí. | No se ejecutaron migraciones. | El store financiero puede no ser desplegable o correlacionable. | Migración aditiva versionada y backfill solo con evidencia exacta. | DDL único aprobado, migración probada y esquema real verificado. |
| RES-F1-002 | Alta | Diferencias de longitudes, `created_at`, TTL y `operation_id` entre DDLs. | Comparación documental local. | Truncamiento, fallos de escritura o expiración de evidencia. | Unificar contrato de esquema. | Tests contra esquema versionado final y revisión autorizada. |
| RES-F1-003 | Alta | El coordinador devuelve `Uncertain` tras ciertos errores, pero no persiste necesariamente un marcador durable después de un commit desconocido. | Bloqueo inmediato y reserva HTTP pendiente. | Reejecución después de TTL o pérdida de reserva. | Persistir intención/estado en diseño transaccional durable. | Prueba determinista de recuperación tras commit desconocido. |
| RES-F1-004 | Alta | No existe recuperación HTTP equivalente para recargas. | Recargas inciertas permanecen bloqueadas. | Falta de recuperación segura o intervención manual. | Servicio read-only de recuperación de recargas. | Pruebas completas de replay y correlación. |
| RES-F1-005 | Alta | Métodos financieros nuevos no están conectados a `TransfersController`/`RechargesController`. | Rutas productivas conservan comportamiento anterior. | La atomicidad local no se aplica al flujo productivo. | Integración controlada con feature gate fail-closed. | TestServer productivo-equivalente y revisión de despliegue. |
| RES-F1-006 | Alta | `Auth:DemoHeaders=true` puede habilitar autenticación demo por configuración. | `appsettings.json` usa `false`; no hay rechazo por entorno. | Suplantación en Backoffice si se despliega mal configurado. | Rechazar demo auth en Production. | Prueba de arranque con configuración insegura. |
| RES-F1-007 | Media/Alta | No se ejecutaron pruebas HTTP específicas 401/403 ni aislamiento del endpoint Backoffice. | Revisión estática de `[Authorize]` y `CanReverseOperation`. | Regresión de autorización no detectada. | Añadir pruebas HTTP aisladas. | Resultados dinámicos 401, 403 y actor aislado. |
| RES-F1-008 | Alta | El clasificador administrativo no verifica importe, moneda y destinatario; el hash llega como parámetro de consulta. | No ejecuta replay ni mutaciones. | Una futura reutilización como autorización podría aceptar correlación incompleta. | Requerir representación canónica y atributos económicos verificables. | Pruebas de correlación económica completa. |
| RES-F1-009 | Alta | Operaciones históricas sin `FinancialIntent` o correlación única no pueden probarse como nuevas. | Clasificación bloqueada y revisión manual. | Duplicación o falsa liberación si se interpreta ausencia como fracaso. | Reconciliación histórica autorizada, sin asociaciones inventadas. | Evidencia durable suficiente para cada caso o bloqueo explícito. |
| RES-F1-010 | Alta | No existe CAS más auditoría durable para liberar reservas financieras. | Endpoint de release bloqueado. | Decisiones obsoletas o no trazables. | Diseño transaccional de decisión administrativa. | CAS, auditoría durable y pruebas de concurrencia aprobadas. |

### Validación integral final

Se revisaron conjuntamente el coordinador financiero, stores, filtros HTTP, recuperación, Backoffice, DDLs y fixtures. La evidencia reportada de pruebas locales cubre transferencias, recargas, `FinancialIntent`, ledger, outbox, rollback, replay, recuperación HTTP y clasificación histórica.

No se reejecutaron pruebas en esta actualización documental. La compilación Release reportada como correcta tenía cuatro advertencias `CS1573`; Codex no pudo repetirla por `MSB3491` en el sandbox. Las 43 pruebas omitidas de la suite reportada no se consideran aprobadas.

### Capacidades administrativas todavía no implementadas

- Liberación financiera segura con CAS.
- Auditoría durable transaccional de decisiones de release.
- Reconciliación automática de históricos ambiguos.
- Recuperación HTTP read-only equivalente para recargas.
- Consulta administrativa económica completa con importe, moneda y destinatario verificables.

### Matriz resumida de trazabilidad

| Hallazgo | Incremento | Commit | Código | Prueba | Resultado | Riesgo residual |
|---|---|---|---|---|---|---|
| AUD-001 | 7D/7E/7F/7G/1A/1C | `1d3abfa`, `1ed7782`, `0fad825`, `0b2cf51`, `e31df67`, `ce884c0`, `7785151` | Coordinador, filtros, stores y clasificador | Emulador + HTTP local reportados | Mitigación local | Integración productiva, TTL, incertidumbre e históricos |
| NUEVO-AUD-028 | 1A | `e31df67` (corrección), `ce884c0` (pruebas) | `SpannerStores.cs` | 5/5 políticas, 2/2 HTTP | `BeginAsync` corregido; persistencia e inmutabilidad probadas localmente | DDL real no verificado |
| NUEVO-AUD-029 | 1C | `7785151` | Backoffice/classifier | 7/7 emulador | Contención activa | Release segura pendiente |
| NUEVO-AUD-030 | 1C | `7785151` | Admin/audit path | No se habilitó mutación | No resuelto | CAS/auditoría durable |
| RES-F1-001/002 | 1A/1C | `ce884c0`, `7785151` | DDLs y store | Comparación documental | Bloqueante | Migración y esquema único |
| RES-F1-003/004/005 | 7E/7F/7G | `1ed7782`, `0fad825`, `0b2cf51` | Coordinador, servicios y controllers | Local aislado | Cobertura insuficiente | Commit incierto, recargas y rutas reales |
| RES-F1-006/007/008 | 1C/auditoría final | `7785151` | Auth, Backoffice, classifier | Revisión estática | Pendiente | Hardening y pruebas HTTP/económicas |

### Conclusión de seguimiento

La Fase 1 se considera cerrada únicamente según el alcance planificado y la evidencia local reportada. El estado productivo permanece **NO AUTORIZADO PARA DESPLIEGUE**. Las condiciones críticas de esquema, integración de controladores, autenticación demo, commit desconocido, recuperación de recargas, correlación económica completa y liberación administrativa segura deben resolverse o aceptarse formalmente antes de cualquier activación.

No se realizaron commits, pushes, migraciones, despliegues ni accesos a Google Cloud. `AUDITORIA.md` continúa siendo documentación local y no debe agregarse a Git sin autorización expresa.

### Prioridades históricas identificadas en la auditoría inicial — estado anterior a la implementación de Fase 1

La lista siguiente conserva el contexto histórico de la auditoría inicial. El estado vigente debe consultarse en la adenda de seguimiento de Fase 1 y no en esta lista original.

- **Próximo orden prioritario:** 1) Verificar `created_at`/NULL en idempotency_records sin tocar producción, 2) revisar release manual, ledger y auditoría durable, 3) integrar cursores frontend, 4) eliminar fallback `Math.random()`, 5) validar builds/tests/CI, 6) fortalecer reconciliación con salvaguardas.

---

# AUDITORÍA DE ACTUALIZACIÓN — ESTADO ACTUAL DEL REPOSITORIO

**Fecha:** 2026-11-01. **Rama:** `main`. **SHA local:** `d6612b5a38b080fde2210557a7d10a4bf30eb309`. La consulta fresca de `refs/heads/main` falló por bloqueo de red hacia GitHub; el ref remoto local observado coincide, pero no sustituye verificación remota.

La auditoría aislada creó y extrajo correctamente `git archive HEAD` en `C:\Users\NICOLA~1\AppData\Local\Temp\NequiTrampa-audit-20261101-181809-d3262374f08241e2a152453be36e79b8`. Los cambios locales sin commit no fueron incluidos. El repositorio original mantuvo exactamente su estado previo: `.gitignore` modificado y `.test-build/` no rastreado.

## Resumen ejecutivo actualizado

- Preflight efectivo: `Data__Backend=memory`, `Spanner__Database=__DISABLED__`, ADC inexistente, rutas `APPDATA`/`CLOUDSDK_CONFIG`/NuGet/npm temporales y sin `SPANNER_EMULATOR_HOST`.
- No se accedió a GCP, Spanner, Firestore, Pub/Sub, Bruno, Newman, emulator ni E2E.
- `dotnet restore` falló con `NU1301` al acceder a NuGet; build Release y tests backend quedaron bloqueados.
- `npm ci --ignore-scripts` falló con `EACCES` al descargar `zod`; typecheck y unit frontend quedaron bloqueados.
- La ejecución histórica `--no-build` con DLL fechadas el 2026-10-29 no valida este HEAD del 2026-11-01.
- Se confirma estáticamente una discrepancia entre la colección escrita por Workers y la leída por Finance: `NUEVO-AUD-032`.
- Estado general: **NO VALIDADO DINÁMICAMENTE EN EL HEAD** y **NO LISTO PARA PRODUCCIÓN**.

## Historial diferencial de PR y commits

| Cambio | Resultado | Evidencia funcional | Riesgo |
|---|---|---|---|
| PR #20: `4de1783`, `7785151` y commits financieros | FinancialIntent aislado; no gobierna controllers productivos | Restore bloqueado; emulator no autorizado | RES-F1-003/004/005/010 |
| PR #21: `921bba2`, `bf49557`, `bed8feb` | Auth, idempotencia, Gateway y cursores parcialmente cableados | No validado en HEAD | AUD-004, AUD-006, AUD-012 |
| PR #22: `d6612b5`, `1d8d6d5` | Gateway 8087 agregado; arranque y proyección presentan riesgos | `run-local` no ejecutado | AUD-013, NUEVO-AUD-032/033 |

## Matriz actualizada de hallazgos

| ID | Estado actual | Evidencia y pendiente |
|---|---|---|
| AUD-001 | PARCIALMENTE RESUELTO | FinancialIntent aislado; falta integración y validación de incertidumbre/TTL. |
| AUD-002 | IMPLEMENTADO, SIN VALIDACIÓN FUNCIONAL | Readiness verificado solo estáticamente. |
| AUD-003 | IMPLEMENTADO, SIN VALIDACIÓN FUNCIONAL | `configureHttp` conecta sesión; faltan pruebas 401/refresh. |
| AUD-004/AUD-004b | PARCIALMENTE RESUELTO | Cursor existe en backend/frontend; falta runtime. |
| AUD-005 | IMPLEMENTADO, SIN VALIDACIÓN FUNCIONAL | Workflow existe; CI remoto no consultable. |
| AUD-006 | PARCIALMENTE RESUELTO | `Math.random()` permanece en `frontend/src/utils/idempotency.ts:20-26`. |
| AUD-007/AUD-025 | BLOQUEADO | Restore actual no permite ejecutar suite. |
| AUD-008 | RESUELTO SEGÚN ALCANCE | Inventario histórico preservado. |
| AUD-009 | PENDIENTE | Offline/sync no implementado ni probado. |
| AUD-010/AUD-011 | NO VERIFICADO | Realtime/Firestore no ejecutados. |
| AUD-012 | PARCIALMENTE RESUELTO | Coexisten dos clientes HTTP. |
| AUD-013 | ERROR CONFIRMADO | Profile, Backoffice y Assistant exigen `Spanner:Database` aun en memory. |
| AUD-014/AUD-016/AUD-017/AUD-020/AUD-023/AUD-026 | NO VERIFICADO | Faltan runtime, device y contrato real. |
| AUD-015/AUD-021 | RIESGO POTENCIAL | Navegación y duplicación no validadas. |
| AUD-018/AUD-027 | BLOQUEADO | GCP/IAM/Secret Manager no consultados. |
| AUD-019 | IMPLEMENTADO, SIN VALIDACIÓN FUNCIONAL | Production rechaza demo estáticamente; falta startup test. |
| AUD-022 | PARCIALMENTE RESUELTO | Esta adenda actualiza documentación local. |
| AUD-024 | BLOQUEADO | Restore impidió revisar dependencias dinámicamente. |
| NUEVO-AUD-028 | PENDIENTE | `created_at` corregido en código; DDL productivo no verificado. |
| NUEVO-AUD-029 | PARCIALMENTE RESUELTO | Release permanece contenido; falta CAS/evidencia ledger. |
| NUEVO-AUD-030 | PENDIENTE | Auditoría durable de release no atómica. |
| NUEVO-AUD-031 | IMPLEMENTADO, SIN VALIDACIÓN FUNCIONAL | Cursor frontend no probado contra Gateway. |
| NUEVO-AUD-032 | ERROR CONFIRMADO ESTÁTICAMENTE | Workers escribe `financial_movements_mvp_test`; Finance/Budgets/Analytics leen `financial_movements`. |
| NUEVO-AUD-033 | RIESGO POTENCIAL | Workers appsettings usa `Data:Spanner:Database`, código consume `Spanner:Database`. |

## Errores nuevos

### NUEVO-AUD-032 — Colección de proyección desconectada

- **Gravedad:** Alta. **Commit:** `1d8d6d5`.
- **Evidencia:** `src/Nequi.Workers/Projection/ProjectionService.cs:11,42` usa `financial_movements_mvp_test`; `src/Nequi.Finance/Common/MovementReader.cs:29,36` y lectores de Finance usan `financial_movements`.
- **Causa:** Confirmada estáticamente.
- **Impacto:** movimientos proyectados pueden no alimentar Movements, Budgets ni Analytics; coincide con la hipótesis histórica de fallos de categorías, sin reproducción dinámica actual.
- **Corrección recomendada:** constante de colección única y prueba outbox → projection → readers.
- **Estado:** ERROR CONFIRMADO estáticamente; runtime BLOQUEADO.

### NUEVO-AUD-033 — Configuración Spanner inconsistente en Workers

- **Gravedad:** Media. **Archivos:** `src/Nequi.Workers/appsettings.json:9-13`, `Program.cs:52-54`, `Outbox/SpannerOutbox.cs:6-10`.
- **Descripción:** JSON declara `Data:Spanner:Database`, pero `SpannerOutbox` consume `Spanner:Database`; deploy inyecta la clave root.
- **Impacto:** comportamiento local divergente y posible selección silenciosa de outbox memory.
- **Estado:** RIESGO POTENCIAL; requiere unificar clave y probar startup.

## Evidencia de pruebas

| Suite | Ejecutadas | Aprobadas | Fallidas | Omitidas | Bloqueadas | Resultado |
|---|---:|---:|---:|---:|---:|---|
| Archive/extracción | 1 | 1 | 0 | 0 | 0 | PASS |
| Remote `refs/heads/main` | 1 | 0 | 0 | 0 | 1 | Red bloqueada |
| Backend restore | 1 | 0 | 1 (`NU1301`) | 0 | 0 | FAIL de entorno |
| Backend build/tests | 0 | 0 | 0 | 0 | Todas | Restore falló |
| Frontend npm ci | 1 | 0 | 1 (`EACCES`, `zod`) | 0 | 0 | FAIL de entorno |
| Frontend typecheck/unit | 0 | 0 | 0 | 0 | 2 | npm ci falló |
| Bruno/Newman/emulator/E2E | 0 | 0 | 0 | 0 | Todas | No autorizadas |

Los fallos históricos `BudgetsTests.ProjectedCategory_CountsTowardsBudget_WhileLegacyExpenseIsIgnored` y `AnalyticsTests.ProjectedCategory_FlowsIntoCategoryBuckets_WhileLegacyExpenseStaysUncategorized` permanecen reportados, pero no se declaran reproducidos sobre este SHA.

## Reevaluación RES-F1-001 a RES-F1-010

| Riesgo | Estado |
|---|---|
| RES-F1-001/002 | Vigentes: DDL y `financial_intents` no verificados contra despliegue. |
| RES-F1-003 | Vigente: commit incierto no probado. |
| RES-F1-004 | Vigente: recargas sin recuperación HTTP equivalente. |
| RES-F1-005 | Confirmado vigente: métodos FinancialIntent fuera de controllers productivos. |
| RES-F1-006 | Mitigado en código, sin startup test Production. |
| RES-F1-007 | Vigente: 401/403 aislados no ejecutados. |
| RES-F1-008/009 | Vigentes: correlación económica e históricos no verificados. |
| RES-F1-010 | Vigente: CAS y auditoría durable no demostrados. |

## Conclusión actualizada

No hay build Release ni pruebas actuales aprobadas para el HEAD porque restore NuGet y npm fallaron. FinancialIntent no gobierna aún las rutas HTTP productivas y la proyección Workers/Finance está desconectada por nombre de colección. El sistema no está listo para integración ni producción.

## Estado Git final

No se ejecutaron fetch, pull, checkout, merge, rebase, reset, add, commit o push. El repositorio original conserva sus cambios preexistentes. Esta adenda es documental y no modifica código, pruebas, configuración ni infraestructura.

## Matriz independiente de funcionalidad real

| Módulo | Backend | Frontend | API real | Persistencia | Auth | Unit | Integración | E2E | Estado | Defectos |
|---|---|---|---|---|---|---|---|---|---|---|
| Access | Sí | Sí | Parcial | Memory/Identity | JWT | Histórica | Bloqueada | No | Parcial | AUD-014 |
| Profile | Sí | Sí | Sí | Spanner | JWT | Histórica | Bloqueada | No | Parcial | AUD-013 |
| Wallet | Sí | Sí | Sí | Spanner/memory | JWT | Histórica | Bloqueada | No | Parcial | AUD-001 |
| Transfers | Sí | Sí | Ruta antigua | Spanner aislado/mock | JWT | Histórica | Bloqueada | No | Incompleta | RES-F1-005 |
| Recharges | Sí | Sí | Ruta antigua | Spanner aislado/mock | JWT | Histórica | Bloqueada | No | Incompleta | RES-F1-004/005 |
| Beneficiaries | Sí | Sí | Sí | Memory/Spanner | JWT | Histórica | Bloqueada | No | Parcial | Sin validación actual |
| Movements | Sí | Sí | Sí parcial | Firestore | JWT | Histórica | Bloqueada | No | Parcial | AUD-004, NUEVO-AUD-032 |
| Cash | Sí | Sí | Sí parcial | Firestore | JWT | Histórica | Bloqueada | No | Parcial | AUD-004b |
| Categories | Sí | Sí | Sí | Firestore | JWT | Histórica | Bloqueada | No | Parcial | NUEVO-AUD-032 |
| Budgets | Sí | Sí | Sí | Firestore | JWT | Histórica | Bloqueada | No | Riesgo de datos | NUEVO-AUD-032 |
| Goals | Sí | Sí | Sí | Firestore | JWT | Histórica | Bloqueada | No | Parcial | Sin validación actual |
| Analytics | Sí | Sí | Sí | Lee `financial_movements` | JWT | Histórica | Bloqueada | No | Riesgo de datos | NUEVO-AUD-032 |
| Support | Sí | Sí | Parcial | Firestore/Spanner | RBAC | Histórica | Bloqueada | No | Parcial | AUD-017 |
| Backoffice | Sí | Sí | Parcial | Firestore/Spanner | RBAC | Histórica | Bloqueada | No | Parcial | RES-F1-007/010 |
| Reversals | Sí | Sí | Parcial | Spanner | RBAC | Histórica | Bloqueada | No | Parcial | RES-F1-010 |
| Reconciliation | Sí | Sí | Parcial | Spanner | RBAC | Histórica | Bloqueada | No | Parcial | NUEVO-AUD-029/030 |
| Audit | Sí | Sí | Parcial | Firestore | RBAC | Histórica | Bloqueada | No | Parcial | AUD-018 |
| Workers | Sí | No | Interna | Memory/Spanner | IAM esperado | Histórica | Bloqueada | No | Desconectado | NUEVO-AUD-032/033 |
| Outbox | Sí | No | Interna | Memory/Spanner | IAM esperado | Histórica | Bloqueada | No | No validado | RES-F1-003 |
| Realtime | Sí | Parcial | Parcial | Memory/Firestore | JWT | Histórica | Bloqueada | No | No verificado | AUD-010 |
| Notifications | Sí | Parcial | Parcial | Firestore | JWT | Histórica | Bloqueada | No | No verificado | AUD-011 |
| Assistant | Sí | Parcial | Parcial | Spanner/Firestore | JWT | Histórica | Bloqueada | No | Parcial | AUD-017 |
| Voice | Parcial | Parcial | No demostrado | N/A | JWT | No | No | No | Interfaz/parcial | AUD-023 |
| Gateway | Sí | Consumidor | Sí | N/A | JWT/identity token | Histórica | Bloqueada | No | Implementado sin runtime | AUD-002 |
| Sync/Offline | No completo | Incompleto | No | Prevista | N/A | No | No | No | No implementado | AUD-009 |

# RECLASIFICACIÓN DE AUDITORÍA — ALCANCE MVP ACADÉMICO

**Fecha:** 2026-11-01. Esta adenda cambia la prioridad operativa, no reescribe los hallazgos históricos ni autoriza cambios de código, GCP o dinero real.

## Objetivo académico

NequiTrampa se tratará como una aplicación académica con operaciones monetarias ficticias. El objetivo es demostrar backend .NET, frontend Expo/React Native, APIs, persistencia, autenticación/autorización, operaciones simuladas y pruebas reproducibles. No existe en el repositorio una rúbrica académica ni un documento del profesor que defina requisitos adicionales; si aparece uno, tendrá prioridad sobre esta clasificación.

Todas las demostraciones deberán usar datos de prueba, métodos simulados y configuración que no pueda operar dinero real ni acceder a recursos productivos de GCP.

## Alcance funcional mínimo

1. Login y sesión de usuario.
2. Perfil básico.
3. Consulta de saldo.
4. Transferencia ficticia entre usuarios de prueba.
5. Recarga simulada.
6. Persistencia consistente de saldo y operación.
7. Historial de movimientos actualizado.
8. Autorización básica y aislamiento entre usuarios.
9. Idempotencia suficiente para que un reintento no duplique la operación ficticia.
10. Frontend Android conectado a la API.
11. Pruebas del flujo principal y manejo comprensible de errores.

El MVP no requiere garantías de banca comercial, liquidación real, conciliación histórica avanzada ni disponibilidad productiva.

## Funcionalidades recomendables si ya funcionan

Beneficiarios, categorías, presupuestos, metas, analítica básica, notificaciones sencillas, Gateway y consultas básicas de Backoffice pueden conservarse cuando reutilicen código existente y no amplíen de forma desproporcionada el plan. No se consideran bloqueantes hasta que el flujo principal esté demostrado.

## Fuera del alcance inicial

Dinero real, bancos o pagos reales, despliegue productivo GCP, alta disponibilidad, escalamiento comercial, conciliación avanzada, release administrativo con CAS, recuperación exhaustiva de commits inciertos, Backoffice empresarial, Assistant/Voice avanzados, SQLite offline/sync compleja, soporte obligatorio iOS, múltiples entornos productivos y observabilidad empresarial. Se conservan como evolución futura, no se eliminan del historial.

## Matriz de prioridad académica de hallazgos

| ID | Estado técnico histórico/actual | Prioridad académica | Acción para el MVP |
|---|---|---|---|
| AUD-001 | Integridad financiera avanzada parcial; métodos FinancialIntent no conectados a controllers | MVP-IMPORTANTE | Mantener una operación ficticia consistente e idempotente; no exigir arquitectura comercial completa |
| AUD-002 | Readiness upstream implementado estáticamente | POST-MVP | Conservar; no bloquea demo local simple |
| AUD-003 | Adaptador HTTP conectado estáticamente | MVP-IMPORTANTE | Verificar que el login/sesión del flujo principal use un único token |
| AUD-004 | Cursor backend/frontend parcialmente integrado | POST-MVP | El historial inicial es suficiente si no se promete historial ilimitado |
| AUD-004b | Cursor Cash implementado parcialmente | POST-MVP | Excluir Cash del flujo mínimo o dejarlo como mejora |
| AUD-005 | CI básico existente | MVP-IMPORTANTE | Recuperar una ejecución reproducible de CI/local |
| AUD-006 | Fallback `Math.random()` vigente | MVP-IMPORTANTE | Corregir si las claves se usan en transferencias/recargas del MVP |
| AUD-007 | Cobertura amplia, validación actual bloqueada | MVP-IMPORTANTE | Ejecutar solo pruebas esenciales del flujo principal |
| AUD-008 | Inventario histórico resuelto | POST-MVP | Mantener documentación |
| AUD-009 | Offline/sync incompleto | POST-MVP | No implementar para la entrega inicial |
| AUD-010 | Realtime no verificado | POST-MVP | No bloquear la presentación |
| AUD-011 | Firestore/índices no verificados | MVP-IMPORTANTE | Usar persistencia aislada mínima y documentar límites |
| AUD-012 | Dos transportes HTTP | MVP-IMPORTANTE | Reducir ambigüedad en los consumidores del flujo principal |
| AUD-013 | Arranque local exige Spanner en servicios auxiliares | MVP-BLOQUEANTE | Crear procedimiento local reproducible sin GCP para el subconjunto elegido |
| AUD-014 | Recuperación de auth no validada | MVP-IMPORTANTE | Login, logout, 401 y sesión válida |
| AUD-015 | Navegación state-based | POST-MVP | Conservar mientras permita demo clara |
| AUD-016 | Plataformas no verificadas | MVP-BLOQUEANTE para Android | Validar Android; iOS/Web quedan fuera salvo requisito |
| AUD-017 | Contratos de dominios adicionales incompletos | POST-MVP | No ampliar módulos no esenciales |
| AUD-018 | Logs sensibles no verificados completamente | MVP-IMPORTANTE | No imprimir credenciales ni secretos en la demo |
| AUD-019 | Demo auth bloqueada en Production estáticamente | MVP-IMPORTANTE | Usar solo configuración académica local y documentar que no es productiva |
| AUD-020 | Estados de error frontend no verificados | MVP-IMPORTANTE | Cubrir errores de login, saldo y operación |
| AUD-021 | Duplicación de código no cuantificada | POST-MVP | No refactorizar sin impacto en el flujo |
| AUD-022 | Documentación histórica desactualizada parcialmente | MVP-IMPORTANTE | Mantener esta adenda coherente con el plan vigente |
| AUD-023 | Pantallas adicionales no verificadas | POST-MVP | No bloquear por pantallas fuera del flujo principal |
| AUD-024 | Dependencias no auditadas dinámicamente | POST-MVP | Revisar solo si afecta build del MVP |
| AUD-025 | Pruebas actuales bloqueadas por entorno | MVP-BLOQUEANTE | Recuperar pruebas mínimas reproducibles |
| AUD-026 | Expo Web no verificado | NO APLICA al MVP Android | Reabrir solo si el profesor lo exige |
| AUD-027 | GCP/Secret Manager no verificados | POST-MVP | Prohibido depender de GCP productivo |
| NUEVO-AUD-028 | `created_at`/DDL productivo no verificados | POST-MVP | No usar como requisito de producción; conservar riesgo histórico |
| NUEVO-AUD-029 | Release administrativo contenido | POST-MVP | No implementar release complejo |
| NUEVO-AUD-030 | Auditoría durable de release pendiente | POST-MVP | No necesaria para dinero ficticio; no reactivar release inseguro |
| NUEVO-AUD-031 | Cursor frontend sin validación runtime histórica | POST-MVP | No bloquear si el MVP limita el historial a una página explícita |
| NUEVO-AUD-032 | Workers y Finance usan colecciones distintas | MVP-BLOQUEANTE | Corregir o evitar ese flujo; es necesario para historial/proyecciones |
| NUEVO-AUD-033 | Claves Spanner inconsistentes | MVP-BLOQUEANTE para el entorno elegido | Unificar configuración o seleccionar explícitamente un backend memory aislado |

La clasificación académica no convierte un riesgo técnico abierto en resuelto. Solo indica si debe corregirse antes de la demostración ficticia.

## Estado real aprovechable

- Existe una base de autenticación, sesión, cliente HTTP y pantallas de cliente.
- Existen Wallet, Transfers y Recharges con implementaciones mock y servicios Spanner separados.
- Existen contratos y pruebas históricas para saldo, transferencias, recargas, idempotencia y movimientos.
- Existe frontend para movimientos, operaciones y módulos adicionales.
- Existe Gateway y configuración local documentada, aunque el arranque completo requiere simplificación o corrección.
- La evidencia dinámica del HEAD actual sigue pendiente; código existente no equivale a funcionalidad comprobada.

## Limitaciones y pruebas aplazadas

No se ejecutaron pruebas durante esta reclasificación. Los resultados dinámicos documentados previamente siguen siendo los únicos disponibles: restore NuGet/npm bloqueado, emulator/Bruno/E2E no ejecutados y sin acceso a GCP. La entrega académica deberá producir evidencia del mismo SHA para login, saldo, operación ficticia, historial, persistencia y reintento idempotente.

No existe autorización para utilizar recursos productivos de GCP ni para operar dinero real.

# SEGUIMIENTO DE IMPLEMENTACIÓN MVP ACADÉMICO — 2026-11-01

## Alcance y evidencia

Se implementó únicamente el camino local de dinero ficticio en `feature/mvp-academico`, partiendo de `d6612b5a38b080fde2210557a7d10a4bf30eb309`. No se hicieron commits, push, pull, merge, reset, rebase, despliegues ni conexiones a GCP. Las verificaciones se ejecutaron en copias temporales aisladas.

El alcance académico no convierte la implementación en una plataforma financiera real: el backend usa `Data:Backend=memory`, la recarga es simulada y la persistencia es un archivo JSON local opcional.

## Cambios implementados

| Cambio | Archivos principales | Resultado |
|---|---|---|
| Colección canónica | `src/Nequi.Workers/Projection/ProjectionService.cs` | Workers escribe `financial_movements`, igual que Finance/Budgets/Analytics. |
| Saldo académico atómico | `AcademicWalletStore.cs` y mocks Wallet | Transferencias descuentan origen, abonan destino y recargas aumentan saldo bajo un lock. |
| Persistencia local | `AcademicWalletStore.cs`, `Nequi.Wallet/Program.cs`, `scripts/run-local.ps1` | `-Backend memory` usa `.local-run/academic-wallet.json`; no usa GCP. |
| Arranque memory | Profile, Assistant, Backoffice y Gateway | Spanner solo es obligatorio para GCP; Backoffice conserva compatibilidad con tests que suministran una configuración ficticia. |
| Idempotencia frontend | `frontend/src/utils/idempotency.ts` | Se eliminó `Math.random()`; sin `crypto.getRandomValues` se produce error explícito. |
| Sesión académica | `academicIdentityPlatform.ts`, `appConfig.ts`, `platform.ts`, HTTP client | `EXPO_PUBLIC_ACADEMIC_MODE=true` en desarrollo genera identidad local y headers demo. |
| Gateway académico | `src/Nequi.Gateway/Program.cs`, `run-local.ps1` | Conserva `X-Demo-*` solo con opt-in no productivo. |

## Pruebas ejecutadas

| Suite | Resultado |
|---|---|
| `dotnet restore Nequi.slnx` aislado | Aprobado, código 0. |
| `dotnet build Nequi.slnx -c Release --no-restore` | Aprobado, código 0; 4 warnings XML preexistentes, 0 errores. |
| Backend seguro: filtro sin Emulator ni `ConfirmedTransferRecoveryHttpIntegrationTests` | 171 aprobadas, 4 omitidas opt-in Spanner, 0 fallidas, 175 total. |
| Wallet focalizada | 7 aprobadas, incluyendo saldo mutable, recarga y HTTP. |
| `npm.cmd ci --ignore-scripts` | Aprobado en caché temporal; 13 vulnerabilidades reportadas por npm audit, sin `audit fix`. |
| `npm run typecheck` | Aprobado. |
| `npm run test:unit` | 255 aprobadas, 0 fallidas. |
| `run-local.ps1 -Backend memory` | 7 servicios + Gateway 8087 levantaron en copia temporal; health live/ready Healthy. |

Las cuatro pruebas omitidas son `SpannerIdempotencyFinancialPolicyTests` opt-in. No se ejecutaron Spanner Emulator, Bruno, Newman, E2E Android, iOS, Expo Web ni recursos GCP. El recorrido manual Android y el historial cross-service aún no tienen evidencia dinámica.

## Hallazgos actualizados

| ID | Estado actual | Evidencia |
|---|---|---|
| AUD-006 | MITIGADO Y PROBADO LOCALMENTE | Frontend 255/255; fallback inseguro eliminado. Android real no probado. |
| AUD-013 | PARCIALMENTE RESUELTO Y PROBADO | Los servicios arrancan en memory en copia temporal. |
| NUEVO-AUD-032 | RESUELTO Y PROBADO EN SU ALCANCE | Colección unificada y suite segura pasa; falta emulador/Firestore. |
| NUEVO-AUD-033 | PARCIALMENTE RESUELTO | Memory no exige Spanner; GCP conserva validación; GCP no probado. |
| AUD-016 | BLOQUEADO | Sin emulador/dispositivo Android. |
| AUD-025 | PARCIALMENTE RESUELTO | Restore/build/backend memory/frontend pasan; emulador y E2E siguen bloqueados. |

No se añadió un identificador nuevo para el primer fallo de Backoffice: estaba cubierto por AUD-013/NUEVO-AUD-033 y quedó corregido con registro condicional de servicios Spanner.

## Estado real del MVP

El backend memory tiene operaciones coherentes dentro del proceso y persistencia JSON opcional entre reinicios. La idempotencia HTTP continúa siendo responsabilidad del filtro existente; las pruebas HTTP de replay/conflicto pasan. El login académico es local y sintético, está limitado a desarrollo y no valida contra Identity Platform.

El MVP queda **parcialmente funcional y validado localmente**, no validado E2E ni listo para producción. Falta demostrar en Android que la app consume el Gateway sin DEMO, conserva sesión, actualiza saldos e historial, y que los movimientos atraviesan correctamente Finance en procesos separados.

## Riesgos residuales

- `RES-F1-001` a `RES-F1-010` se conservan: el slice memory no prueba las garantías Spanner/FinancialIntent históricas.
- `npm audit` reportó 13 vulnerabilidades conocidas; deben revisarse antes de distribuir.
- No se verificó persistencia Firestore, Spanner Emulator ni Pub/Sub.
- No se verificó manualmente Android, `10.0.2.2`, dispositivo físico ni bundle.
- La persistencia JSON es para una instancia local académica, no para concurrencia multiinstancia.

## Conclusión

Las regresiones principales de proyección y saldo fijo del backend memory fueron corregidas y probadas. El entorno local seguro es reproducible con `run-local.ps1 -Backend memory`, sin GCP. El siguiente bloqueo real es la validación manual/integración Android y del historial vía Gateway/Finance.
# VALIDACION FINAL MVP ACADEMICO - 2026-11-01

## Evidencia dinamica nueva

Validacion ejecutada en copia temporal aislada del working tree actual, rama `feature/mvp-academico`, SHA `d6612b5a38b080fde2210557a7d10a4bf30eb309`. No se uso GCP real ni se modifico el repositorio original.

El flujo HTTP por Gateway (`http://localhost:8087`) en `memory` fue comprobado: saldo inicial `125000000` centavos; transferencia 201; saldo emisor `124900000`; saldo receptor `125100000`; historial de transferencias 1; recarga simulada 201; saldo final `125100000`; historial de recargas 1. El replay devolvio 201 con `Idempotent-Replayed=true`, el mismo Idempotency-Key con cuerpo distinto devolvio 409 y sin autenticacion devolvio 401.

## Persistencia y pruebas finales

Con el mismo `Academic__StorePath`, se detuvieron y reiniciaron los servicios. Se recuperaron saldo `125100000`, 1 transferencia y 1 recarga, sin duplicados. El JSON tenia 690 bytes, no contenia coincidencias de `password`, `token`, `secret` o `credential`, y quedo dentro de la copia temporal.

Resultados actuales:

| Suite | Aprobadas | Fallidas | Omitidas | Resultado |
|---|---:|---:|---:|---|
| Backend seguro completo | 171 | 0 | 4 | Correcto; las omitidas requieren Spanner. |
| Backend MVP focalizado | 24 | 0 | 0 | Correcto. |
| Frontend typecheck | - | 0 | - | Correcto. |
| Frontend unitarias | 255 | 0 | 0 | Correcto. |
| API local MVP | Flujo completo | 0 | 0 | Correcto en dinero ficticio. |
| Android/iOS/Web visual | 0 | 0 | 1 | Bloqueado/no ejecutado. |

No se ejecutaron Bruno, Newman, Spanner Emulator, Firestore Emulator, E2E Android, iOS, Expo Web ni recursos GCP.

## npm audit de solo lectura

El lockfile reporto 13 vulnerabilidades: 3 altas, 9 moderadas y 1 baja; criticas 0. Son principalmente transitivas por Expo CLI, `node-forge`, `zod`, `glob`, `minimatch` y `deepmerge`; `expo` es dependencia directa. `npm audit --omit=dev` mantuvo el mismo conteo porque el arbol instalado las clasifica como runtime.

Npm propone Expo 53/51 como correccion automatica, incompatible sin migracion coordinada con Expo SDK 58. No se ejecuto `npm audit fix`, `--force` ni una actualizacion masiva. El riesgo queda pendiente en una tarea independiente.

## Autenticacion y limitaciones

El modo academico es sintetico y solo se habilita con opt-in en Development. `Gateway:AllowDemoHeaders` y `Auth:DemoHeaders` se bloquean en Production; las pruebas frontend validan el bloqueo. No se valido Identity Platform real ni sesion academica desde Android.

El arranque aislado mostro errores de Data Protection al intentar leer el key ring global del usuario. No afecto el flujo ni uso GCP, pero el script no aisla completamente ese key ring; queda como deuda de reproducibilidad local.

## Estado MVP-01 a MVP-15

| IDs | Estado actual | Evidencia |
|---|---|---|
| MVP-01, MVP-04, MVP-05, MVP-06, MVP-08, MVP-10 | VALIDADO LOCALMENTE | Startup memory, API, saldos, historial, JSON y replay. |
| MVP-02, MVP-09, MVP-11, MVP-13 | PARCIALMENTE VALIDADO | Configuracion, backend y unitarias; Android pendiente. |
| MVP-03 | NO VERIFICADO DINAMICAMENTE | Profile no participo en el recorrido HTTP. |
| MVP-07 | PARCIALMENTE VALIDADO | Historial Wallet store; Finance/Workers/Firestore no ejecutados. |
| MVP-12 | BLOQUEADO | Sin emulador ni dispositivo Android. |
| MVP-14 | EN PROGRESO | Documentacion actualizada. |
| MVP-15 | PENDIENTE | Falta prueba manual y guion de presentacion. |

El MVP queda funcional en API local memory con persistencia JSON y pruebas automatizadas, pero no 100 por ciento completado: Android, perfil y recorrido cross-service siguen sin evidencia dinamica.
## Correccion de login academico - 2026-11-01

La pantalla observada era `SessionGate` en estado `signed-out`. El formulario ya existia, pero el texto decia incorrectamente que la aplicacion todavia no incluia login. Se actualizo el mensaje para explicar el modo academico y se agregaron pruebas del proveedor local: credenciales no vacias, token compatible con `SessionManager`, rol `CLIENTE` y refresh de identidad.

La autenticacion academica no crea cuentas en GCP ni requiere usuarios preexistentes. En Development, cualquier correo ficticio no vacio junto con cualquier contrasena no vacia genera una identidad determinista `academic-...`; el backend local autoriza la identidad mediante `X-Demo-User` y `X-Demo-Role=CLIENTE`. Esta ruta queda bloqueada fuera de Development.

La prueba frontend posterior a esta correccion queda en 258/258 (antes 255/255): se agregaron tres casos directos del proveedor academico. El archivo efectivo verificado en la maquina es `frontend/.env.local`; como Expo Go cachea el bundle, debe reiniciarse Metro con `npx expo start --clear` despues de cambiar esas variables.

# VALIDACION DE MOVIMIENTOS ACADEMICOS - 2026-11-01

## Causa confirmada

La pantalla `Movements_08` recibia el error del hook `useMovements`, que llamaba a `GET /v1/movements`. El Gateway enruta esa ruta a Finance y Finance consulta la proyeccion Firestore `financial_movements` mediante `MovementReader`; no consulta `AcademicWalletStore`. Las transferencias y recargas del modo `memory` se guardan en Wallet y se exponen por `GET /v1/transfers` y `GET /v1/recharges`. En la prueba HTTP aislada, `/v1/movements` devolvio pagina vacia mientras ambos historiales Wallet contenian las operaciones.

## Correccion implementada

En `frontend/src/hooks/useApiData.ts`, solo cuando `appConfig.academicModeEnabled` es efectivo, Movimientos carga los listados autenticados de transferencias y recargas, los combina mediante `buildAcademicMovementDtos` y conserva el orden cronologico. El modo no academico mantiene sin cambios `GET /v1/movements` y la proyeccion Finance/Firestore. `frontend/App.tsx` espera el `clientId` del saldo para filtrar ownership. `frontend/src/services/mappers/academicMovementMapper.ts` asigna signos, tipos e identificadores estables sin inventar saldos posteriores.

Tambien se corrigio `frontend/src/screens/movements/Movements08Screen.tsx`: cuando existe un error, `ErrorState` es el unico componente que renderiza `Reintentar`; se elimino el boton inferior duplicado.

## Evidencia actual

| Prueba | Resultado |
|---|---|
| Frontend typecheck | 0 errores |
| Frontend unitarias | 260 aprobadas, 0 fallidas |
| Backend build en copia temporal | Correcto, 4 warnings XML preexistentes |
| Backend Wallet focalizado | 7 aprobadas, 0 fallidas |
| API Gateway memory | Saldo, recarga 201, transferencia 201, listados y persistencia comprobados |
| Reinicio JSON | Saldo `125075000`, 1 transferencia y 1 recarga recuperados sin duplicados |
| Android visual | Pendiente de comprobacion manual en el emulador |

La copia de prueba fue `C:\Users\Nicolas Rubiano\AppData\Local\Temp\NequiTrampa-movements-20261101-195649`; se uso `Data__Backend=memory`, Gateway local `8087` y no se accedio a GCP. El intento equivalente sobre el repositorio original fue bloqueado antes de arrancar por permisos del artefacto preexistente `tests/Nequi.Tests/obj/Debug/net10.0/MvcTestingAppManifest.json`; no se elimino ni modifico ese archivo.

## Estado del MVP

La ruta academica de Movimientos queda integrada con los mismos endpoints Wallet que producen transferencias y recargas. Android aun requiere confirmacion manual con `http://10.0.2.2:8087`; no se declara validacion visual hasta observarla en Expo Go.

# CORRECCION DE CARGA INFINITA EN MOVIMIENTOS - 2026-11-02

## Causa confirmada

En el commit `600b20b`, `useMovements` dejaba `active=false` en modo academico mientras `ownClientId` fuera nulo. La pantalla de la aplicacion interpretaba el estado `idle` como `Movements_03`, por lo que mostraba skeletons indefinidamente cuando el saldo aun no habia completado su primera carga. No habia un problema de transformacion: las solicitudes Wallet terminaban correctamente.

## Correccion

Se agrego `frontend/src/services/academicMovementsService.ts`. La carga academica ya no depende de un `clientId` previamente entregado por otra carga: si falta, obtiene el saldo mediante Wallet, espera `/v1/transfers` y `/v1/recharges`, y devuelve el resultado combinado. `useMovements` queda activo cuando la sesion y los servicios estan listos, y conserva las transiciones `loading` -> `success`/`error`; el estado `success` con cero elementos llega correctamente a `Movements_02`.

## Evidencia

- Typecheck frontend: correcto.
- Pruebas frontend: 261 aprobadas, 0 fallidas.
- Regresion nueva: la carga termina sin `ownClientId` inicial y devuelve un movimiento.
- API local memory: usuario sin historial devolvio 0 transferencias y 0 recargas; despues de crear operaciones devolvio 1 transferencia y 1 recarga.
- Gateway utilizado: `http://localhost:8087`; sin GCP.
- Estado Android: pendiente de observacion manual posterior al reinicio de Metro.

# ESTABILIZACION DE SESION, TIMEOUT Y NAVEGACION ANDROID - 2026-11-02

## Hallazgos confirmados

- La entrada directa a Movimientos no implicaba un bypass: `SessionManager` restaura correctamente el refresh token academico persistido en SecureStore. Una sesion valida puede iniciar directamente en la pantalla principal; sin token, el estado es `anonymous` y se muestra `SessionGate`.
- `BottomNav` estaba presente en Movimientos, pero `Movements01Screen`, `Movements02Screen`, `Movements03Screen` y `Movements08Screen` no le pasaban `onTabPress`. Los toques no ejecutaban ninguna transicion.
- El flujo HTTP local no reprodujo un timeout: Wallet, transferencias y recargas respondieron por Gateway `8087` en aproximadamente 260 ms. Se agregaron diagnósticos de desarrollo que registran solo metodo, URL, estado, duracion, cancelacion o tipo de error; nunca tokens, contrasenas ni cuerpos.

## Correcciones

- `useMovements` y `academicMovementsService` conservan la carga academica y su manejo de exito/vacio/error.
- `App.tsx` centraliza la navegacion inferior: Inicio -> `Wallet_01`, Movimientos -> `Movements_01`, Perfil -> `Profile_01`. Asistente muestra un aviso de fuera de alcance y no aparenta una ruta funcional.
- `Module1ScreenRenderer` recibe el callback de tabs y muestra navegacion coherente en Wallet/Perfil. Perfil incluye cierre de sesion mediante `sessionManager.signOut`, que limpia SecureStore y devuelve al gate.

## Evidencia

| Prueba | Resultado |
|---|---|
| Frontend typecheck | Correcto |
| Frontend unitarias | 263 aprobadas, 0 fallidas |
| Regresion carga academica | Correcta sin `ownClientId` inicial |
| Regresion navegacion | Rutas y Asistente fuera de alcance cubiertos por prueba pura |
| Gateway local memory | Servicios saludables; saldo/listados respondieron sin timeout |
| Android visual | Pendiente de observacion en Expo Go |

No se modifico `main`, no hubo commit/push ni acceso a GCP. `.gitignore`, `.idea/` y `.test-build/` se conservaron.

# SEGUIMIENTO ACCESO A TRANSFERENCIAS DESDE ANDROID - 2026-11-02

## Hallazgo

El backend y las pantallas `Transfers_01` y `Transfers_02` ya existian, pero `WalletBalanceCard` no recibia ningun callback para iniciar transferencias. Inicio solo mostraba Ver detalle, Opciones y Actualizar; Opciones era exclusivamente DEMO y no llamaba a la API. Ademas, el flujo real saltaba de seleccion de destinatario a envio automatico sin confirmacion explicita.

## Correccion

- Se agrego el boton visible `Transferir` al card de Wallet y se conecto mediante `Module1ScreenRenderer` a `App.tsx`, que abre `Transfers_01` y limpia el borrador academico.
- `Transfers_03` ahora muestra confirmacion con destinatario, importe y saldo disponible. Solo el boton `Confirmar transferencia` activa el envio; `Cancelar` vuelve al formulario sin modificar saldo.
- El POST conserva `services.transfers.create`, el `Idempotency-Key` criptografico y `FinancialOperation`. El estado de envio bloquea pulsaciones repetidas y las respuestas actualizan saldo, transferencias e historial.

## Evidencia

| Prueba | Resultado |
|---|---|
| Frontend typecheck | Correcto |
| Frontend unitarias | 265 aprobadas, 0 fallidas |
| Backend Wallet focalizado | 7 aprobadas, 0 fallidas |
| Gateway local memory | `DEST0001` aceptado; POST transferencia 201 |
| Saldo | 124.800.000 -> 124.700.000 centavos |
| Historial | 2 transferencias para el usuario de prueba, sin datos de otro actor |
| Android visual | Pendiente de comprobacion manual en Expo Go |

No se accedio a GCP ni se modificaron credenciales, `.env.local` o infraestructura. La validacion HTTP demuestra el contrato, pero no sustituye la observacion manual del boton y la navegacion en Android.

# SEGUIMIENTO OPERACIONES ACADEMICAS Y PERFIL - 2026-11-01

## Causas confirmadas

- Expo Go/Hermes no expone necesariamente `globalThis.crypto`; el generador anterior de idempotencia solo aceptaba ese proveedor y lanzaba `La plataforma no proporciona crypto.getRandomValues...`. La causa no era el backend ni el encabezado financiero.
- `FinancialOperation.run` generaba la clave antes de su bloque de captura. Si el proveedor criptografico fallaba, la promesa quedaba rechazada sin resultado controlado.
- `Nequi.Profile.Controllers.ProfileController` recibia `SpannerDb` siempre. En `Data:Backend=memory` `NequiHost` no registra ese servicio, por lo que la resolucion de DI producia HTTP 500 antes de ejecutar la consulta.
- El bloque `[RAW-FETCH]` de `frontend/index.ts` era diagnostico temporal y fue retirado despues de confirmar conectividad HTTP 200.

## Correcciones

- `frontend/src/utils/idempotency.ts` intenta primero Web Crypto y luego carga perezosamente `expo-crypto`; no usa `Math.random()`, claves constantes ni reutilizacion entre intenciones distintas.
- `frontend/src/services/financialOperation.ts` convierte el fallo de generacion en un resultado `rejected` con `ApiError` y no ejecuta el POST. Esto evita promesas rechazadas sin controlar.
- `frontend/src/screens/transfers/Transfers02Screen.tsx` abre directamente la entrada por codigo en modo academico, sin depender de beneficiarios persistentes.
- `src/Nequi.Profile/ProfileDataStore.cs` agrega `AcademicProfileDataStore` para memoria y conserva `SpannerProfileDataStore` para GCP. `ProfileController` depende de la abstraccion y `Program.cs` selecciona el store segun `Data:Backend`.
- No se modificaron `.gitignore`, `.idea/` ni `.test-build/`; no se realizaron commits, push, reset, merge ni acceso a GCP.

## Evidencia dinamica

| Suite o recorrido | Resultado | Entorno |
|---|---|---|
| Frontend typecheck | 0 errores | `frontend`, Node/npm locales |
| Frontend unitarias | 265 aprobadas, 0 fallidas | `npm run test:unit` |
| Backend Release | Correcto, 4 warnings XML preexistentes | Copia temporal `NequiTrampa-validation-20261101-211111` |
| Backend completo | 193 aprobadas, 1 fallida, 43 omitidas | `dotnet test Nequi.slnx -c Release`; una prueba de Gateway falló por permisos de Windows Event Log |
| Profile directo | HTTP 200 y DTO academico | `Data:Backend=memory`, puerto aislado 8181 |
| Profile por Gateway | HTTP 200 y DTO academico | Gateway aislado 8188, `Gateway:AllowDemoHeaders=true`, sin GCP |
| Wallet/recarga/transferencia | Saldo 1.250.000 -> 1.246.000 COP; recarga 201; transferencia 201; ambos listados con 1 registro | Gateway local 8087, memoria |
| Replay de recarga | Misma respuesta e `Idempotent-Replayed=true`, sin segundo registro | Gateway local 8087, memoria |

La suite backend conserva como omitidas las pruebas que requieren Spanner Emulator. El fallo `GatewayRouteTests.HealthEndpoints_ArePublic` no se clasifico como defecto de produccion: el stack trace muestra `Cannot open log for source '.NET Runtime'` por permisos del entorno Windows.

## Estado del MVP

El flujo backend academico de perfil, saldo, recarga, transferencia, idempotencia y listados queda validado en memoria. La visualizacion Android con Expo Go y la prueba de persistencia JSON tras reinicio siguen requiriendo confirmacion manual en el emulador; no se declara validacion visual ni MVP 100% cerrado. La autenticacion academica continua restringida a Development y no usa usuarios productivos.
# ACTUALIZACIÓN DOCUMENTAL DEL MVP ACADÉMICO — HEAD 39e089f — 2026-11-01

## Base verificada

- Rama: feature/mvp-academico.
- HEAD local y remoto: 39e089f2fdc6582688f48622fff7f9ea191ee0fe.
- Commit anterior: 1420cf2, transferencias académicas desde Android.
- Commit actual: 39e089f, navegación del comprobante académico.
- Estado Git previo a esta adenda: cambios locales preexistentes en .gitignore y elementos no versionados .idea/ y .test-build/. No fueron modificados.
- La aplicación académica utiliza Gateway local, Wallet/Profile en memory, autenticación académica de Development y no necesita GCP.
- El recorrido Android se registra como validado manualmente por el equipo. Las ejecuciones automatizadas se identifican por separado.

## Cronología de estabilización

La siguiente tabla resume los síntomas y causas confirmados durante la implementación. “Resuelto” se refiere al camino académico que se ejecuta con memory; no implica que se haya cerrado la arquitectura GCP histórica.

| # | Problema | Síntoma | Causa raíz comprobada | Archivos principales | Solución | Evidencia | Estado | Riesgo residual |
|---:|---|---|---|---|---|---|---|---|
| 1 | Almacenamientos de movimientos distintos | Wallet guardaba operaciones que Finance/Firestore no mostraba | Wallet memory usa AcademicWalletStore; Finance lee la proyección Firestore | academicMovementsService.ts, academicMovementMapper.ts, ProjectionService.cs | En modo académico se combinan transfers y recharges del Wallet | Unitarias y API local | Resuelto para MVP | Finance/Workers/Firestore GCP sigue separado |
| 2 | Skeleton infinito en Movimientos | Filas grises permanentes | useMovements esperaba ownClientId antes de activar la carga | useApiData.ts, App.tsx | La carga académica obtiene saldo y listados sin depender de clientId inicial | Regresión frontend y respuesta vacía API | Resuelto | Cambios de sesión tardíos aún requieren manejo cuidadoso |
| 3 | Sesión restaurada | La app entra directamente a la pantalla principal | SecureStore conserva refresh token válido y SessionManager lo restaura | sessionManager.ts, storage.ts, platform.ts | Se conserva restauración válida; sesión inválida vuelve a SessionGate | Tests de sesión y validación Android | Resuelto | SecureStore es local; no equivale a Identity Platform real |
| 4 | Navegación inferior sin callbacks | Inicio, Movimientos o Perfil no respondían | Pantallas no recibían onTabPress | App.tsx, Movements*.tsx, Module1ScreenRenderer.tsx | App centraliza callbacks y rutas | Test de navegación y validación Android | Resuelto | Asistente continúa fuera del alcance |
| 5 | Timeout Android hacia 10.0.2.2:8087 | Expo Go mostraba timeout | La ruta vista por Chrome no coincidía con el transporte de Expo Go | frontend/.env.local, api.ts, run-local.ps1 | Se usa adb reverse y 127.0.0.1:8087 | Logs y HTTP local | Resuelto | El reverse debe repetirse tras reiniciar |
| 6 | Chrome distinto de Expo Go | Chrome alcanzaba Gateway pero fetch fallaba | Diferencia de red entre navegador del emulador y proceso Expo Go | frontend/.env.local, configuración Android | Se dejó de usar esa comparación como prueba suficiente | Reproducción de ConnectException | Resuelto | Otros dispositivos pueden requerir otra ruta |
| 7 | Conectividad mediante reverse | Android no alcanzaba el Gateway esperado | Faltaba redirección del puerto al host | adb, run-local.ps1 | adb reverse tcp:8087 tcp:8087 | Android validado por el equipo | Resuelto | No es persistente tras reinicio |
| 8 | crypto.getRandomValues ausente | Fallaba una operación financiera en Expo Go/Hermes | No existía proveedor Web Crypto global en ese runtime | idempotency.ts, package.json | Se incorporó expo-crypto con proveedor seguro | Unitarias de idempotencia y Android | Resuelto | Requiere dependencia compatible con Expo SDK 58 |
| 9 | Idempotencia segura | Riesgo de claves no únicas | El runtime móvil no garantizaba crypto global | idempotency.ts, financialOperation.ts | expo-crypto; no se usa Math.random | Tests de UUID y ráfagas | Resuelto para MVP | Garantías GCP de FinancialIntent permanecen históricas |
| 10 | Promesa rechazada sin manejar | El error de crypto aparecía como Uncaught promise | La generación de clave ocurría fuera del manejo de FinancialOperation | financialOperation.ts | Error convertido a resultado controlado sin POST | Tests de proveedor ausente | Resuelto | Otros errores de UI no auditados exhaustivamente |
| 11 | Profile HTTP 500 en memory | GET /v1/profile devolvía 500 | Profile resolvía SpannerDb aunque Data:Backend=memory | ProfileController, Program.cs | Abstracción IProfileDataStore y AcademicProfileDataStore | Profile HTTP 200 por Gateway local | Resuelto para MVP | Profile académico es memoria y no JSON |
| 12 | Profile académico inexistente | Un usuario local no tenía fila Spanner | El modo académico no crea clientes GCP | ProfileDataStore.cs | Perfil determinista local por auth subject | DTO académico HTTP | Resuelto para MVP | No valida Identity Platform real |
| 13 | No había acceso visible a transferencias | Inicio solo mostraba Opciones DEMO | WalletBalanceCard no recibía callback Transferir | WalletBalanceCard.tsx, Module1ScreenRenderer.tsx, App.tsx | Botón visible Transferir conectado a Transfers_01 | Android y API local | Resuelto | La ruta depende del backend académico local |
| 14 | Envío automático sin confirmación | Seleccionar destinatario enviaba inmediatamente | Transfers_03 era solo pantalla de envío | Transfers03Screen.tsx, App.tsx | Confirmación explícita antes del POST | Unitarias, WalletTests y Android | Resuelto | Debe conservarse la prueba de doble envío |
| 15 | Monto no sincronizado | El importe parecía $0 o no se conservaba al navegar | Texto del TextInput era local y el borrador solo guardaba centavos | Transfers01Screen.tsx, App.tsx | Texto controlado en App y conversión COP/centavos | Typecheck, unitarias y Android | Resuelto | Requiere mantener cobertura de COP/centavos |
| 16 | Confirmación con monto cero | Se podía confirmar $0 | No había bloqueo defensivo en Transfers_03 | Transfers03Screen.tsx, transfersService.ts, App.tsx | Botón deshabilitado y guard final antes del POST | Unitarias de validación | Resuelto | Errores 4xx del backend siguen siendo parte del contrato |
| 17 | 422 mostrado como 500 | La pantalla decía Algo salió mal | Error local genérico se clasificaba como resultado inesperado | operationFailure.ts, financialOperation.ts, pantallas Transfers | Validación previa evita el POST inválido; backend responde 422 controlado | Gateway: 0 -> 422; 10000 -> 201 | Resuelto para UI del MVP | Deben conservarse pruebas de errores 4xx |
| 18 | Comprobante con navegación incompleta | Tras éxito no había ruta académica clara | Transfers_22 conservaba Download/Share y volvía a Transfers_19 | Transfers22Screen.tsx, App.tsx | En academic mode: Wallet_01, Movements_01 y back seguro | 268 unitarias y Android reportado | Resuelto | La validación visual depende del entorno Android disponible |
| 19 | Descargar/Compartir no implementados | Botones presentaban acciones no disponibles | Eran placeholders de la pantalla Stitch | Transfers22Screen.tsx | Ocultos solo con academicMode; se conservan otros modos | Typecheck, pruebas de navegación | Resuelto en academic mode | Descarga/compartir siguen sin implementación en otros modos |

## Estado funcional actual

El flujo académico reportado como verificado en Android es:

Login académico -> Wallet/saldo -> recarga simulada o transferencia ficticia -> saldo actualizado -> Movimientos -> comprobante -> Wallet o Movements -> logout.

El historial académico se construye con GET /v1/transfers y GET /v1/recharges a través del Gateway y se filtra por la identidad académica. No debe describirse como una proyección Finance/Firestore E2E.

El commit 39e089f cambia la salida del comprobante: en academic mode, Volver al inicio resuelve Wallet_01, Ver movimientos resuelve Movements_01 y el retroceso físico de Android no vuelve a una confirmación reenviable. El borrador se limpia al salir, mientras selectedTransfer y el comprobante siguen disponibles desde los datos confirmados.

## Evidencia de pruebas y validaciones

| Suite o recorrido | Resultado | Evidencia/entorno |
|---|---:|---|
| Frontend typecheck | 0 errores | npm run typecheck |
| Frontend unitarias | 268 aprobadas, 0 fallidas, 0 omitidas | npm run test:unit después de 39e089f |
| Navegación comprobante | 2 regresiones nuevas aprobadas | transferCompletionNavigation.test.ts |
| Idempotencia/doble envío | Aprobada | FinancialOperation y journeys existentes |
| Wallet focalizado | 7 aprobadas | dotnet test con filtro WalletTests |
| API local transfer 10000 COP | 201 | Gateway local, memory |
| API local monto 0 | 422 VALIDATION_ERROR | Gateway local, memory |
| Android manual | Validado por el equipo | Expo Go, adb reverse, 127.0.0.1:8087 |
| Backend completo | 193 aprobadas, 1 fallida, 43 omitidas | Resultado histórico; fallo ambiental Windows Event Log |
| GCP, Spanner real, Firestore real | No ejecutado | Fuera del MVP y no autorizado |

La compilación completa del backend puede quedar bloqueada en Windows si un proceso local mantiene una DLL en bin/obj. No se debe borrar .test-build ni artefactos preexistentes para ocultar ese bloqueo.

## Pendientes y observaciones separadas

| Observación | Estado real | Tratamiento |
|---|---|---|
| Limpieza visual de componentes Stitch heredados | Pendiente | No bloquea el flujo principal; revisar después |
| Etiquetas STITCH - MODO REAL | Pendiente | Retirar solo cuando exista criterio visual acordado |
| Botones Continuar/Siguiente sin flujo | Parcial | Revisar por pantalla; no marcar como funcional por existir |
| Opciones DEMO | Fuera del flujo académico | No utilizarla para operaciones reales |
| Peticiones concurrentes de módulos secundarios | Pendiente | Reducir ruido solo si afecta la demostración |
| Cancelaciones mientras se resuelve clientId | Mitigado | Se descartan respuestas tardías; conservar logs de desarrollo sin tokens |
| SafeAreaView deprecado | Pendiente no bloqueante | No actualizar Expo solo por warning |
| Avisos de actualización Expo | Pendiente | No usar npm audit fix --force ni migrar SDK sin PR |
| Autenticación académica simplificada | Limitación conocida | Solo Development; cualquier credencial no vacía es local |
| Persistencia de Profile | Limitada | Profile académico vive en memoria |
| Persistencia Wallet JSON | Implementada por run-local | No equivale a Spanner ni a persistencia multiinstancia |
| Fallo Windows Event Log | Ambiental | Reintentar en entorno con permisos o documentar como bloqueado |
| Proyección GCP Finance/Workers/Firestore | No requerida para MVP | Mantener riesgos históricos RES-F1 sin reinterpretarlos |

## Riesgos financieros históricos

Los riesgos RES-F1-001 a RES-F1-010 continúan conservados y no quedan cerrados por el MVP memory. En particular, el MVP no demuestra DDL Spanner, FinancialIntent productivo, recuperación ante commit incierto, reconciliación durable, CAS administrativo ni seguridad GCP. La implementación académica garantiza coherencia local e idempotencia básica para el flujo de demostración, no garantías bancarias de producción.

## Seguimiento 2026-11-03 — cierre MVP académico estable

La rama `feature/mvp-academico-estable` incorpora validación monetaria de precisión, persistencia
JSON fail-closed, idempotencia académica durable, catálogo local de destinatarios, mensajes de
error específicos, historial paginado y comprobantes estables. Los commits son `c235b93`,
`138c0c8`, `9391758`, `c60f2cf` y `c9adb01`. El typecheck y las pruebas unitarias frontend
actuales pasaron (292/292). La compilación backend completa quedó pendiente por bloqueo de permisos
de MSBuild en `obj`; no se debe interpretar como fallo funcional ni como validación productiva.

Estas mejoras solo cubren el backend `memory` y dinero ficticio. No modifican ni certifican la
arquitectura Spanner/GCP; permanecen fuera de alcance la validación Android manual, la durabilidad
multiinstancia y la preparación de producción.

## Historial relevante de la rama

| Commit | Cambio |
|---|---|
| 600b20b | Implementación inicial de billetera académica y autenticación local |
| 4812042 | Estabilización de navegación, operaciones y Profile académico |
| 1420cf2 | Transferencias académicas desde Android |
| 39e089f | Navegación segura desde comprobante académico |

## Conclusión documental

El MVP académico es demostrable localmente con dinero ficticio, backend memory, JSON del Wallet, Expo Go y `adb reverse`. La configuración Android comprobada utiliza `http://127.0.0.1:8087`; las referencias históricas a `10.0.2.2:8087` describen el diagnóstico inicial y no son la configuración recomendada actual. No es una aplicación bancaria real ni está lista para producción. La referencia operativa actual es `docs/GUIA_MVP_ACADEMICO.md`; este documento y el plan se publican ahora junto con ella.
