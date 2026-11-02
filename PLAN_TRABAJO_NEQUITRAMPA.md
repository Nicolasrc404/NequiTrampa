# PLAN DE TRABAJO INTEGRAL — NEQUITRAMPA

**Base documental:** `AUDITORIA(20261029-211553).md`, 22 secciones. **Referencia técnica pública:** `Nicolasrc404/NequiTrampa`, commit `2179203662e46ce82eef50e12114e11258c0c5bd` (consultado el 29 de octubre de 2026). **Rama local:** la que ya utiliza el desarrollador; no se presume que sea `main`. **Estado de partida indicado:** código restaurado al último commit; los cambios experimentales previos se descartaron; `AUDITORIA.md` continúa local y fuera de GitHub.

## Reglas del plan

- Trabajar **en la rama existente**. Registrar rama y SHA antes de cambiar nada. No realizar checkout, reset, rebase, push o despliegues sin autorización expresa.
- Conservar `AUDITORIA.md` **solo en local**, sin incorporarlo a commits ni subirlo al remoto.
- Cada fase debe ser un cambio pequeño y verificable: diagnóstico → diseño → implementación → pruebas → revisión del diff → aprobación → integración.
- Ningún proceso automatizado tiene permiso implícito para modificar bases de datos reales, datos financieros, Cloud Run, IAM, secretos, Pub/Sub ni producción. GCP se valida primero con evidencia del repositorio y emuladores; las lecturas reales necesitan aprobación explícita y permisos mínimos. Ningún despliegue forma parte de este plan sin autorización específica.
- No marcar hallazgos como resueltos con solo ver el código. Distinguir: **implementado**, **pruebas unitarias pasadas**, **integración pasada**, **validado en entorno aislado**, **validado en despliegue**, **no verificado**.
- En tareas financieras, si no se puede demostrar que la operación no se aplicó, **no liberar ni abandonar automáticamente la clave idempotente**.
- Separar errores confirmados, riesgos potenciales, deuda técnica, documentación y funcionalidades cuyo alcance debe decidirse.

## FASE 0 — Línea base, alcance y pruebas de referencia

**Objetivo:** establecer un estado reproducible antes de editar el código. **Prioridad:** obligatoria. **Auditoría:** AUD-005, AUD-007, AUD-013, AUD-025.

1. Registrar sin cambiar nada: `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git log -1 --oneline`, versiones de .NET, Node y npm. Si `HEAD` no corresponde al commit auditado, revisar el diff y actualizar el inventario antes de adoptar el plan.
2. Confirmar que el único documento local adicional es `AUDITORIA.md`. Mantenerlo fuera del seguimiento de Git. No modificar automáticamente `.gitignore` ni otras configuraciones.
3. Verificar configuración de pruebas y que ninguna apunte a producción. Obtener aprobación para generar únicamente artefactos locales de `bin/`, `obj/` y `node_modules/`.
4. Tras la aprobación, establecer línea base: `dotnet restore Nequi.slnx`; `dotnet build Nequi.slnx --configuration Release`; `dotnet test Nequi.slnx --configuration Release`; dentro de `frontend/`, `npm ci`, `npm run typecheck`, `npm run test:unit`. Registrar resultados y rutas de logs, sin subir información sensible.
5. Distinguir el CI remoto anterior (ejecución `40769269917`, success para backend y frontend, **sobre el commit auditado**) de los resultados de la rama actual.
6. Clasificar el alcance de cada módulo como obligatorio, opcional o fuera de alcance (especialmente offline, iOS y web). Crear el tablero de tareas de abajo sin considerar todo el inventario como errores.

**Criterio de salida:** entorno reproducible o bloqueos bien identificados; commit y rama registrados; resultado inicial de cada suite conocido; alcance aprobado. Si la ejecución local no es posible, documentar el bloqueo sin pedir elevación de privilegios por defecto.

## FASE 1 — Integridad financiera y recuperación de idempotencia

**Objetivo:** que reintentos, excepciones, cortes y acciones administrativas nunca provoquen un segundo efecto monetario no autorizado. **Prioridad:** crítica. **Auditoría:** AUD-001, NUEVO-AUD-028, 029 y 030.

### 1A. Esquema efectivo y temporalidad (diagnóstico antes de cambios)

- Tomar `database/spanner/00_live_schema.sql` como **exportación de referencia**, no como prueba de que el despliegue actual siga idéntico. El archivo incluye `created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP())` en `idempotency_records` y una política de retención de 30 días. `01_schema.sql` es un borrador inicial distinto.
- Comparar columnas, defaults, índices, tipos, restricciones, claves foráneas y políticas TTL entre esquema exportado, código y documentación. El `INSERT` actual omite `created_at`, lo que es correcto **si el default está efectivamente presente**.
- Verificar en Spanner emulado inserción, estado `IN_PROGRESS`, cálculo de `created_at`, búsqueda `FindStaleInProgressAsync` y reintentos. Después, **solo si se autoriza**, comprobar los metadatos del esquema real en modo lectura (por ejemplo `INFORMATION_SCHEMA.COLUMNS`), sin migraciones ni lectura masiva de datos financieros.
- Decidir explícitamente qué garantía de idempotencia existe **después de la retención TTL de 30 días**. En el DDL de referencia el ledger contiene `idempotency_key`, pero no se ve un índice único sobre ella. Revisar en los flujos de negocio una restricción/dedupe durable que sobreviva a la eliminación de la reserva temporal.
- Si el esquema real ya contiene `NOT NULL DEFAULT`, cerrar el supuesto fallo de `NULL` como **no reproducido para ese esquema** y corregir documentación obsoleta; evitar añadir SQL redundante o desplegar DDL histórico.

**Salida:** matriz de esquemas validada y decisión sobre TTL/retención. No editar DDL real sin necesidad demostrada, plan de migración reversible y aprobación posterior.

### 1B. Garantías de ejecución única

- Dibujar la secuencia real: `BeginAsync` → operación de ledger → `CompleteAsync`/`AbandonAsync` → respuesta. Identificar dónde hay transacciones distintas y ventanas de fallo.
- Establecer invariantes: mismo actor/alcance/clave y mismo cuerpo nunca genera una segunda operación; cuerpo distinto recibe conflicto; efecto ya confirmado se recupera desde evidencia durable; estado incierto bloquea reintento hasta conciliar; concurrencia no crea carreras; expiración de TTL no habilita un segundo efecto financiero indebido.
- Evaluar solución de **atomicidad en Spanner** cuando sea viable (reserva/finalización y efecto financiero en una misma transacción), o vinculación única y durable del ledger a una operación determinística con rehidratación de resultados. Evitar resolverlo con un `catch` superficial que borre una clave tras un 5xx.
- Revisar `src/Nequi.Shared/Idempotency/IdempotencyActionFilter.cs`, `IdempotencyFilter.cs` y flujos de Wallet/Finance/Backoffice: ante excepción o HTTP 5xx posterior al commit no debe ocurrir un `AbandonAsync` que permita doble ejecución.
- Crear pruebas de inyección de fallos en: antes/durante/después del commit, antes/durante `CompleteAsync`, cancelación del cliente, pérdida de conexión, dos solicitudes simultáneas, retry del mismo cuerpo y cuerpo distinto. Asegurar que la respuesta 409/bloqueo es temporal y que hay recuperación controlada.

**Salida:** propuesta aprobada, implementación aislada, pruebas unitarias y de integración con emulador y evidencia de que no hay doble cargo.

### 1C. Conciliación y liberación manual segura

- Mantener **sin liberación automática** las claves huérfanas hasta poder distinguir efecto aplicado de no aplicado con el ledger.
- Revisar `IdempotencyAdminController`: hoy `AbandonAsync` precede a `audit.WriteAsync`. Diseñar un registro durable de intención/resultado, preferentemente ligado transaccionalmente a Spanner y propagado mediante outbox; no presumir atomicidad entre Spanner y Firestore.
- Introducir verificaciones de propiedad, operación/clave/actor/scope, antigüedad, estado y comprobación del ledger, con control de concurrencia y registro de identidad, razón, evidencia y aprobación. Evaluar doble aprobación para operaciones sensibles.
- Si se determina que el efecto ocurrió, la salida correcta es **reconciliar/rehidratar la respuesta o escalar**, no liberar la clave para repetir la operación.
- Verificar el acceso al endpoint de Workers `/v1/idempotency/stale`: no figura en las rutas públicas del Gateway. Decidir si es deliberadamente interno; protegerlo y documentar el camino administrativo autorizado, sin exponerlo por comodidad.
- Probar liberación legítima, intento de liberar operación ya aplicada, carrera con ejecución en curso, fallo del registro de auditoría y pérdida de red tras la liberación.

**Salida:** recuperación documentada, auditada y probada; ninguna liberación sin comprobación de ausencia de efecto.

## FASE 2 — Generación segura de claves en Expo/React Native

**Objetivo:** resolver AUD-006 sin romper Android, iOS o web. **Prioridad:** alta y de bajo alcance.

- Inspeccionar usos de `frontend/src/utils/idempotency.ts`; evitar diferencias entre clientes HTTP. Verificar disponibilidad de entropía segura en los runtimes soportados.
- Seleccionar una única fuente criptográfica respaldada por la plataforma (por ejemplo `expo-crypto` si es compatible y se aprueba incorporarlo, o Web Crypto auténtico). `expo-crypto` **no figura en las dependencias del commit auditado**: no darlo por instalado.
- No permitir sustitución silenciosa por `Math.random()`. Si la entropía segura falta, fallar de forma explícita, controlada y sin crear una solicitud financiera insegura.
- Pruebas: generación correcta, unicidad práctica, reutilización de clave durante retries de la misma operación, distinta clave en operaciones nuevas, ausencia simulada de crypto, Android/iOS/web si forman parte del alcance.

**Salida:** AUD-006 resuelto con pruebas y sin regresiones de sesión o transferencias.

## FASE 3 — Paginación consumida por frontend

**Objetivo:** cerrar AUD-004, AUD-004b y NUEVO-AUD-031 de extremo a extremo. **Prioridad:** alta.

- Movements: extender tipos/parseo de `movementsService.ts` para transportar `nextCursor`, aceptar `cursor` al solicitar páginas y preservar compatibilidad de la primera página.
- Cash: el backend devuelve cuerpo plano más `X-Next-Cursor`. `frontend/src/services/http/client.ts` hoy devuelve el cuerpo, no los metadatos de la respuesta. Diseñar una extensión **retrocompatible** que permita consultar encabezados (sin reescribir todos los consumidores ni perder manejo de autenticación y errores); validar CORS `Access-Control-Expose-Headers`.
- `useApiData.ts` y pantallas: estado acumulado de páginas, `hasMore`, `loadingMore`, error, reintento, cancelación, reinicio por filtros y deduplicación por identificador. Evitar cargas automáticas ilimitadas.
- Pruebas: primera/última página, listas vacías, límites, empates de timestamp, cursor inválido/expirado, orden estable, doble solicitud, navegación atrás, refresh y no repetición ni omisión entre páginas.

**Salida:** un usuario puede recorrer historial completo de Movements y Cash en dispositivos soportados; no se trunca después del primer lote.

## FASE 4 — Unificación del transporte HTTP y autenticación

**Objetivo:** cerrar AUD-012 sin reabrir AUD-003. **Prioridad:** alta.

- Inventariar importaciones y consumidores de `frontend/src/api/http.ts`, `frontend/src/services/http/client.ts`, `frontend/src/services/api.ts` y los servicios de Backoffice.
- Definir una interfaz única para token, 401, expiración/renovación, serialización RFC 9457, tiempo de espera, cancelación, encabezados, idempotencia y observabilidad sin datos sensibles.
- Migrar **por módulo** (empezando por un consumidor de bajo riesgo), manteniendo adaptador de compatibilidad mientras dure la transición. No eliminar `configureHttp()` hasta que ningún consumidor la necesite.
- Pruebas: acceso anónimo/restringido, token vigente/caducado, refresh concurrente, 401, logout, backoffice y conservación de la misma `Idempotency-Key` en reintentos seguros.

**Salida:** un camino HTTP claramente dueño del comportamiento; Backoffice y clientes no pierden autorización ni contratos.

## FASE 5 — Seguridad operativa, configuración y GCP

**Objetivo:** convertir los riesgos de despliegue en garantías verificables. **Prioridad:** alta. **Auditoría:** AUD-018, AUD-019, AUD-027 y endurecimiento de AUD-002.

- Verificar que `Auth:DemoHeaders`/`Auth__DemoHeaders` esté deshabilitado en producción y que mecanismos de demostración no puedan sustituir JWT. Revisar roles, ownership y rutas administrativas.
- Revisar logs sin revelar credenciales ni datos personales, revisar configuración de Secret Manager, privilegios de cuentas de servicio y exposición de endpoints. Documentar evidencias redaccionadas.
- Diferenciar `/health/live` y `/health/ready`: el Gateway comprueba respuestas de liveness de upstreams, no necesariamente la salud de sus bases de datos o dependencias. Agregar comprobaciones de readiness apropiadas sin generar dependencia circular ni sobrecarga.
- Revisar índices y configuración Firestore, Gateway, IAM de servicios privados y Pub/Sub desde código, CI y entorno aislado. Acceso a GCP real, inicialmente **solo lectura y previa aprobación explícita**; despliegue y migraciones requieren su propia aprobación.

**Salida:** matriz de seguridad/configuración con evidencia, riesgos remanentes y plan de despliegue controlado separado.

## FASE 6 — Pruebas de integración, flujos, UX y multiplataforma

**Objetivo:** cerrar verificaciones no ejecutadas. **Prioridad:** alta/media. **Auditoría:** AUD-007, 010, 011, 014–017, 020, 023, 025 y 026 (si web es parte del alcance).

- Validar flujos: Access → Wallet → transferencias/recargas/beneficiarios → movimientos/cash → presupuesto/metas/analítica → soporte/backoffice/reversos/conciliación.
- Probar operaciones financieras y errores de negocio con datos ficticios en entorno aislado. Revisar coherencia entre ledger Spanner y proyecciones Firestore con outbox y reintentos.
- WebSockets: reconexión, duplicados, expiración de sesión, pérdida de red, resuscripción y eventos fuera de orden.
- Android y, si entra en alcance, iOS/web: compilación, navegación, estados vacíos/error/carga, permisos, accesibilidad, contraste, teclado, orientación, comportamiento offline y UX Mapping sin modificar diseños arbitrariamente.
- Pruebas de contratos API/Bruno/Postman y E2E solo en ambiente de pruebas autorizado; nunca utilizar cuentas o saldos reales para simular fallos financieros.

**Salida:** matriz de funcionalidades y plataformas con evidencia de prueba y defectos reproducibles documentados.

## FASE 7 — Funcionalidades pendientes según alcance

**Objetivo:** finalizar lo que el producto exige, sin crear funciones innecesarias. **Prioridad:** según decisión de alcance. **Auditoría:** AUD-009 y apartados funcionales de AUD-014, 017 y 023.

- Decidir expresamente si SQLite offline, cola de operaciones, sincronización y resolución de conflictos son obligatorios. No hacer transacciones financieras offline sin diseño para doble envío, expiración y resolución de conflictos.
- Implementar módulos incompletos **solo tras comparar requisitos, UX Mapping, rutas de navegación, servicios y permisos**. Pantalla existente no equivale a flujo funcional completo.
- Completar y probar recuperación de cuenta, notificaciones, voz/asistente, casos de soporte, investigación, escalamiento, conciliación y analítica solo donde la evaluación funcional determine brechas reales.
- Si iOS/web/SQLite no forman parte de esta entrega, registrar exclusión explícita en vez de mantener «pendiente» indefinidamente.

**Salida:** matriz de requisitos obligatorios completa o exclusiones aprobadas y justificadas.

## FASE 8 — Regresión, documentación y cierre

**Objetivo:** cerrar el proyecto sin falsos positivos. **Prioridad:** obligatoria. **Auditoría:** AUD-005, 007, 008, 013, 021, 022, 024, 025 y el resto.

- Repetir build, typecheck, tests unitarios, integración y E2E aplicables; revisar CI de la **rama/commit actual**, no solo un run anterior.
- Revisar seguridad de dependencias y duplicaciones con evidencia. Refactorizar únicamente si reduce un riesgo o deuda concreta y está cubierto por pruebas.
- Revisar `README.md`, `ARCHITECTURE.md`, documentación de esquema y `frontend/UX_MAPPING.md` según el comportamiento real.
- Actualizar el `AUDITORIA.md` local con un historial por hallazgo: evidencia previa, cambio implementado, prueba y resultado, estado final y limitaciones. No subirlo a GitHub.
- Preparar release checklist, plan de rollback para cada despliegue y verificación post-despliegue **solo cuando se autorice desplegar**.

**Criterio final:** ninguna falla financiera crítica conocida sin mitigación; pruebas de regresión aprobadas; contratos front/back coherentes; controles de acceso verificados; requisitos obligatorios completos; riesgos aceptados explícitamente; documentación y CI actualizados. No declarar «100 % completo» por tener todos los archivos o un CI verde.

## Seguimiento de hallazgos por fase

| Fase | IDs y asuntos |
|---|---|
| 0 | AUD-005, AUD-007, AUD-013, AUD-025: línea base y suites |
| 1 | AUD-001, NUEVO-AUD-028, 029 y 030: idempotencia, Spanner, release y auditabilidad |
| 2 | AUD-006: CSPRNG sin fallback inseguro |
| 3 | AUD-004, AUD-004b, NUEVO-AUD-031: consumo de cursores end-to-end |
| 4 | AUD-003 (regresión), AUD-012: HTTP y sesión |
| 5 | AUD-002 (hardening), AUD-018, AUD-019, AUD-027: operaciones y seguridad |
| 6 | AUD-007, 010, 011, 014–017, 020, 023, 025 y 026 (según alcance): pruebas de flujos y plataformas |
| 7 | AUD-009 y brechas funcionales: offline/sync y faltantes reales |
| 8 | AUD-005, 008, 013, 021, 022, 024, 025 y cierre de toda la matriz |

**Estado inicial de los resueltos:** AUD-002, AUD-003, AUD-005 y AUD-008 se mantienen cerrados por inspección/CI; sus regresiones se siguen vigilando, no se reescriben por defecto.

## Control de cambios por incrementos

Cada incremento debe producir **un reporte breve antes del código**: objetivo, archivos afectados, riesgo financiero, pruebas que se agregarán, impacto esperado en GCP y aprobación necesaria. La ejecución entrega diff, pruebas ejecutadas, fallos/limitaciones, cambios locales y estado de los hallazgos. No acumular varias fases en una sola modificación masiva. No realizar commit/push/deploy sin aprobación del propietario del repositorio.

### Secuencia de aprobación sugerida

1. **Autorizar únicamente Fase 0**: verificación de entorno y pruebas locales aisladas, sin producción.
2. **Autorizar diseño de Fase 1** (solo lectura); revisar las invariantes y la decisión sobre TTL.
3. **Autorizar cambios de código de Fase 1 por incrementos independientes**, en emulador y pruebas ficticias.
4. Continuar con fases 2–4, un módulo a la vez, siempre con pruebas de regresión.
5. Autorizar por separado cualquier acceso de lectura a GCP, eventual migración y eventual despliegue.

## Fuentes de contraste

- Auditoría local suministrada por el propietario: `AUDITORIA(20261029-211553).md`.
- GitHub: `https://github.com/Nicolasrc404/NequiTrampa` (commit auditado `2179203`).
- CI del commit base: `https://github.com/Nicolasrc404/NequiTrampa/actions/runs/40769269917` (backend y frontend `success`; no valida cambios futuros de la rama).
- Spanner DML y defaults: `https://docs.cloud.google.com/spanner/docs/reference/standard-sql/dml-syntax`.
- Spanner TTL: `https://docs.cloud.google.com/spanner/docs/ttl/working-with-ttl`.
- Emulador: `https://docs.cloud.google.com/spanner/docs/emulator`.
- Expo Crypto: `https://docs.expo.dev/versions/v55.0.0/sdk/crypto/` (verificar versión compatible con SDK 58 antes de introducir dependencia).

---

## Adenda de seguimiento — Fase 1 de idempotencia financiera

**Fecha de actualización:** 2026-10-29
**Rama:** `fix/auditoria-fase-1-idempotencia`
**HEAD:** `7785151564d89f39c7f3ba44baa025095220a136` (`7785151`)
**Procedencia:** esta adenda no sustituye la línea base ni las decisiones históricas del plan.

### Estado de cierre de la Fase 1

La Fase 1 queda **CERRADA SEGÚN ALCANCE — VALIDACIÓN LOCAL PARCIAL — NO LISTA PARA PRODUCCIÓN**.

El cierre representa la finalización del trabajo planificado y la entrega de la auditoría integral. No significa que estén resueltos todos los requisitos de esquema productivo, despliegue, integración HTTP o reconciliación administrativa.

Se completó el ciclo de implementación y auditoría acordado, y los incrementos previstos quedaron implementados según sus alcances individuales. Se realizaron pruebas locales de los componentes desarrollados; algunas garantías solo están demostradas en composiciones aisladas con Spanner Emulator. No se completaron todos los criterios operativos originales, especialmente la liberación administrativa segura. Los requisitos pendientes para producción siguen documentados y no se consideran resueltos.

Se conservaron las fases 2 a 8 y sus objetivos originales. La Fase 2 permanece como siguiente fase planificada.

### 1A — Esquema efectivo y temporalidad

- `SpannerIdempotencyStore.BeginAsync` escribe `created_at` explícitamente.
- `created_at` permanece inmutable durante replay, `CompleteAsync` y reinicios permitidos.
- `FindStaleInProgressAsync` solo consulta; no libera ni elimina reservas.
- Las reservas financieras `FAILED` no se reinician automáticamente.
- El DDL de referencia `00_live_schema.sql` conserva TTL de 30 días para `idempotency_records`.
- `00_live_schema.sql` y `01_schema.sql` siguen siendo incompatibles en longitudes, timestamps, TTL y columnas.
- Ninguno de los DDL versionados contiene `financial_intents`; las fixtures del emulador sí la crean.

### 1B — Garantías de ejecución única

Se implementaron y probaron en composiciones aisladas del Spanner Emulator:

- Identidad durable `domain_actor_id + operation_type + scope + idempotency_key`.
- Correlación con `FinancialIntent` y `ledger_operations`.
- Transacción compartida para intención, ledger, asientos, balances y outbox en los métodos aislados de transferencias y recargas.
- `OperationId` estable fuera de callbacks reintentables.
- Replay sin segundo efecto financiero.
- Conflicto por hash incompatible.
- Bloqueo de actores desconocidos, reservas financieras `FAILED`, estados `IN_PROGRESS` y resultados inciertos.

Los métodos `CreateTransferWithFinancialIntentAsync` y `CreateRechargeWithFinancialIntentAsync` no están conectados a los controladores HTTP productivos ni registrados como rutas financieras activas.

### 1C — Conciliación y liberación manual segura

La sección 1C original conserva el objetivo histórico; esta adenda registra lo ejecutado y sus limitaciones. Por tanto, la liberación manual segura con CAS y auditoría durable no se marca como implementada.

- Se incorporó `FinancialReconciliationClassifier` como consulta de solo lectura.
- Se incorporó `GET /v1/reconciliation/financial`, protegido por `CanReverseOperation` y el rol `OPERADOR_FINANCIERO`.
- Las clasificaciones incluyen confirmación correlacionada, histórico no correlacionable, incierto, inconsistente, reserva ausente/expirada y no verificable.
- No se fabrican `FinancialIntent` históricos.
- No se modifican balances, ledger, outbox ni reservas durante la clasificación.
- La liberación administrativa continúa bloqueada con `idempotency_release_disabled`.
- No existe todavía una liberación administrativa segura con CAS y auditoría durable transaccional.
- Las respuestas HTTP 401/403 del endpoint de Backoffice no se comprobaron dinámicamente en una prueba específica.

### Secuencia de incrementos implementados

| Incremento | Commit | Alcance y evidencia | Resultado documentado |
|---|---|---|---|
| 7D | `1d3abfa` | Correlación de reserva HTTP, `FinancialIntent` y `ledger_operations`; validación de actor, clave y hash. | Pruebas incorporadas; ejecución independiente no consolidada en esta adenda. |
| 7E | `1ed7782` | `CreateTransferWithFinancialIntentAsync`, transacción compartida, ledger, asientos, balances y outbox; replay sin segundo efecto. Integración HTTP productiva no activada. | 4/4 pruebas del emulador aprobadas. |
| 7F | `0fad825` | `CreateRechargeWithFinancialIntentAsync`, coordinación atómica, rollback y replay; importes COP frente a unidades menores. | 4/4 pruebas aprobadas. |
| 7G | `0b2cf51` | `IIdempotencyRecoveryHandler` y recuperación condicionada de transferencias confirmadas; recargas inciertas permanecen bloqueadas. | Recuperación condicionada y deshabilitada en Production. |
| Cierre 7G | `e31df67` | Pruebas TestServer de fallo de `CompleteAsync`, recuperación sin duplicación, conflicto por hash y corrección de `created_at`. | 2/2 pruebas HTTP aprobadas. |
| 1A | `ce884c0` | Política de `created_at`, stale read-only, bloqueo de `FAILED` financiero y análisis de TTL/DDL. | 5/5 pruebas de políticas aprobadas. |
| 1C | `7785151` | Clasificación histórica fail-closed, endpoint de inspección read-only y pruebas del emulador. | 7/7 pruebas del emulador aprobadas. |

### Validación integral y límites

La última suite habitual reportada fue:

- Total: 208.
- Aprobadas: 165.
- Omitidas: 43.
- Fallidas: 0.

Las pruebas omitidas no se contabilizan como aprobadas. La compilación Release reportada fue correcta con cuatro advertencias `CS1573` de documentación XML. Codex no pudo repetir la compilación durante la auditoría integral por errores de permisos `MSB3491` en el sandbox; esto no se interpreta como fallo del código ni como una nueva ejecución de la suite.

La validación local no autoriza despliegue productivo. Siguen pendientes, como mínimo:

- Migración/versionado real de `financial_intents`.
- Resolución de las diferencias entre `00_live_schema.sql` y `01_schema.sql`.
- Marcador durable para commits con resultado desconocido.
- Recuperación HTTP equivalente para recargas.
- Integración segura de transferencias y recargas con sus controladores reales.
- Bloqueo fail-closed de `Auth:DemoHeaders` en Production.
- Pruebas HTTP 401/403 y aislamiento de actor para Backoffice.
- Verificación económica completa del clasificador: importe, moneda y destinatario.
- CAS y auditoría durable antes de reactivar cualquier liberación administrativa.

### Matriz de trazabilidad de Fase 1

| Hallazgo/asunto | Incremento | Commit | Código relevante | Prueba/evidencia | Resultado | Riesgo residual |
|---|---|---|---|---|---|---|
| AUD-001 — ventana de idempotencia financiera | 7D, 7E, 7F, 7G, 1A, 1C | `1d3abfa`, `1ed7782`, `0fad825`, `0b2cf51`, `e31df67`, `ce884c0`, `7785151` | Coordinador, filtros, stores, recuperación, clasificador | Emulador y HTTP local reportados | Mitigación local importante | Controladores reales, commit desconocido, TTL e históricos |
| NUEVO-AUD-028 — `created_at` | 1A | `e31df67` (corrección), `ce884c0` (pruebas) | `SpannerStores.cs` | 5/5 políticas; 2/2 HTTP | Corrección en `BeginAsync` y pruebas posteriores aprobadas localmente | DDL productivo no verificado y DDLs incompatibles |
| NUEVO-AUD-029 — liberación manual | 1C | `7785151` | `IdempotencyAdminController.cs`, clasificador | Endpoint de release bloqueado; clasificación read-only | Mitigado por bloqueo | No existe procedimiento seguro de liberación |
| NUEVO-AUD-030 — auditoría de release | 1C | `7785151` | Backoffice y `AuditLog` | No se habilitó mutación | No resuelto; permanece bloqueado | Falta atomicidad/CAS/auditoría durable |
| Auth:DemoHeaders en Production | Auditoría integral | No verificado | `AuthExtensions.cs`, `infra/deploy.sh` | Revisión estática | Riesgo pendiente | Configuración de despliegue puede habilitar esquema demo |
| DDL `financial_intents` ausente | 1A/1C | `ce884c0`, `7785151` | DDL versionados y fixtures | Comparación local | Bloqueante productivo | Migración aditiva y estrategia histórica pendientes |

### Nota de preservación documental

Las afirmaciones de las secciones originales de este plan describen el estado histórico en que fueron redactadas. Esta adenda es el estado de seguimiento posterior para `fix/auditoria-fase-1-idempotencia`; no reescribe retrospectivamente la Fase 0, las validaciones de frontend/CI ni los objetivos de las fases posteriores.

---

## Adenda cronológica de seguimiento — auditoría del HEAD `d6612b5`

**Fecha:** 2026-11-01. **Rama:** `main`. **SHA:** `d6612b5a38b080fde2210557a7d10a4bf30eb309`. La consulta fresca de `refs/heads/main` falló por bloqueo de red; el ref remoto local observado coincide, pero no sustituye una verificación remota.

La auditoría se ejecutó en una copia temporal creada con `git archive HEAD`. La extracción fue correcta y contenía `Nequi.slnx` y `frontend/package.json`. Los cambios locales sin commit no formaron parte de la copia. El repositorio original permaneció sin cambios adicionales.

### Estado actualizado por fase

| Fase | Objetivo | Cambios/commits | Pruebas ejecutadas | Pendientes | Estado real |
|---|---|---|---|---|---|
| 0 | Línea base reproducible | Auditorías, CI y suites inventariadas | Archive/preflight; restore bloqueado | SHA remoto y dependencias | PARCIALMENTE IMPLEMENTADA |
| 1 | Integridad financiera | PR #20; `1d3abfa`–`7785151` | Ninguna actual; emulator bloqueado | Controllers, DDL, commit incierto, CAS | REQUIERE REAPERTURA POR REGRESIÓN |
| 2 | CSPRNG Expo | `74c4296`, `bf49557` | No ejecutada en HEAD | Eliminar `Math.random()` | EN PROGRESO |
| 3 | Paginación frontend | `f0deffd`, PR #21 | No ejecutada en Gateway | Flujo real, empates, deduplicación | PARCIALMENTE IMPLEMENTADA |
| 4 | HTTP y sesión | PR #21/#22 | No ejecutada | Dos caminos HTTP | PARCIALMENTE IMPLEMENTADA |
| 5 | Seguridad/GCP | PR #21/#22 | Preflight seguro; GCP bloqueado | IAM, Secret Manager, config Workers | PARCIALMENTE IMPLEMENTADA |
| 6 | Integración y plataformas | Frontend/servicios actuales | Bruno, E2E, dispositivos bloqueados | Gateway→Workers→Firestore→Frontend | BLOQUEADA |
| 7 | Offline y funcionalidades pendientes | Diseño parcial | No ejecutada | Decisión de alcance | NO INICIADA |
| 8 | Regresión/documentación | Esta adenda | Restore/npm fallidos; docs actualizados | Build, suites y CI del mismo SHA | EN PROGRESO |

### Checklist verificable por fase

#### Fase 0

- [x] SHA local, rama y estado Git registrados.
- [x] Copia temporal creada desde `git archive HEAD`.
- [x] Extracción comprobada.
- [x] Cambios sin commit excluidos y documentados.
- [ ] SHA remoto fresco: bloqueado por red.
- [ ] Restore/build reproducibles: bloqueado por NuGet.

#### Fase 1

- [x] FinancialIntent y métodos coordinados inspeccionados.
- [x] Controllers productivos confirmados fuera de los métodos FinancialIntent.
- [ ] Emulator/TestServer actual: bloqueado.
- [ ] Integración HTTP y DDL productivo.
- [ ] CAS y auditoría durable.

#### Fase 2

- [x] `Math.random()` localizado en `frontend/src/utils/idempotency.ts:20-26`.
- [ ] Fallback eliminado.
- [ ] Typecheck/unit actual: bloqueados por npm.

#### Fase 3

- [x] Cursor presente en backend, servicios y hooks.
- [ ] Gateway y pantallas probados con varias páginas.
- [ ] Vacíos, empates, errores y deduplicación.

#### Fase 4

- [x] Clientes HTTP y adaptador heredado identificados.
- [x] Sesión conectada estáticamente a `configureHttp`.
- [ ] Unificación completa y pruebas 401/refresh/logout.

#### Fase 5

- [x] ADC, APPDATA, Cloud SDK, Spanner y emulator aislados en preflight.
- [x] No se accedió a GCP real.
- [ ] IAM, Secret Manager, Firestore y Pub/Sub.
- [ ] Unificar `Data:Spanner:Database`/`Spanner:Database` (`NUEVO-AUD-033`).

#### Fase 6

- [x] Bruno, Newman y E2E inventariados.
- [ ] Bruno local: bloqueado.
- [ ] Newman, emulator, Android, iOS, Web y Realtime: bloqueados.
- [ ] Flujo completo de proyección: afectado por `NUEVO-AUD-032`.

#### Fase 7

- [ ] Decisión formal sobre SQLite/offline/sync.
- [ ] Assistant, Voice, Notifications y Realtime.
- [ ] No habilitar finanzas offline sin diseño de conflictos.

#### Fase 8

- [x] PR #20, #21 y #22 contrastados.
- [x] `NUEVO-AUD-032` y `NUEVO-AUD-033` documentados.
- [x] RES-F1-001 a RES-F1-010 reevaluados.
- [x] Fallos de restore/npm y bloqueos registrados.
- [ ] Build Release actual.
- [ ] Suite backend segura actual.
- [ ] Typecheck/unit frontend actual.
- [ ] CI remoto fresco y E2E.

### Resultados de la ejecución aislada

| Suite | Resultado |
|---|---|
| Archive/extracción | PASS |
| Remote `refs/heads/main` | BLOQUEADO por red |
| Backend restore | FALLÓ con `NU1301` |
| Backend build/tests | BLOQUEADOS por restore |
| Frontend `npm ci --ignore-scripts` | FALLÓ con `EACCES` descargando `zod` |
| Frontend typecheck/unit | BLOQUEADOS por npm ci |
| Bruno/Newman/emulator/E2E | BLOQUEADOS por autorización/aislamiento |

### Prioridad operativa actualizada

1. Resolver integridad financiera y conectar rutas HTTP con FinancialIntent.
2. Unificar `financial_movements` y `financial_movements_mvp_test` (`NUEVO-AUD-032`).
3. Hacer reproducible restore/build/npm en entorno aislado.
4. Corregir configuración de arranque local y Workers (`AUD-013`, `NUEVO-AUD-033`).
5. Validar JWT, 401/403, paginación y transporte HTTP.
6. Ejecutar Bruno/E2E/emulator solo con autorizaciones y aislamiento confirmados.
7. Atender offline/sync, multiplataforma y deuda no crítica.

### Condiciones de cierre

- Fase 1 no puede declararse lista para producción mientras RES-F1-003, RES-F1-004, RES-F1-005 y RES-F1-010 sigan vigentes.
- Fase 3 requiere evidencia dinámica de páginas sucesivas, empates y ausencia de duplicados.
- Fase 5 requiere configuración efectiva y pruebas de arranque, no solo JSON.
- Fase 6 requiere el flujo aislado completo; mocks unitarios no equivalen a integración.
- Fase 8 solo puede cerrarse cuando restore, build, suites y documentación correspondan al mismo SHA.

# PLAN DE EJECUCIÓN — MVP ACADÉMICO

**Referencia operativa vigente.** Esta sección no elimina las fases 0–8 ni sus adendas históricas. Reclasifica el trabajo futuro para una entrega académica con operaciones ficticias. No existe una rúbrica del profesor en los archivos revisados; cualquier requisito académico posterior tendrá prioridad.

## Definición de terminado del MVP

El MVP está terminado cuando un usuario de prueba puede iniciar sesión, consultar perfil y saldo, ejecutar una transferencia o recarga ficticia, observar el saldo actualizado y consultar el movimiento persistido, sin duplicación por reintento y sin conexión a recursos productivos. La demostración debe ejecutarse mediante un procedimiento local reproducible y explicar claramente qué es simulado.

## ETAPA 1 — Estabilización del proyecto

**Objetivo:** eliminar los bloqueos que impiden trabajar y demostrar el flujo académico.

### Trabajo

- Corregir la discrepancia `financial_movements`/`financial_movements_mvp_test` o excluir explícitamente del MVP cualquier lector/proyección que no sea necesario; preferir una colección canónica.
- Investigar los fallos históricos de `BudgetsTests.ProjectedCategory_CountsTowardsBudget_WhileLegacyExpenseIsIgnored` y `AnalyticsTests.ProjectedCategory_FlowsIntoCategoryBuckets_WhileLegacyExpenseStaysUncategorized`; no cambiar assertions sin explicar la causa.
- Resolver `AUD-013` y `NUEVO-AUD-033` para que el subconjunto local elegido no exija Spanner ni GCP.
- Recuperar restore, build Release y pruebas locales con dependencias aisladas.
- Confirmar que las variables y archivos de configuración usados por la demo no contienen credenciales ni destinos productivos.
- Elegir el subconjunto mínimo de servicios; no es obligatorio levantar los ocho si el flujo completo del MVP queda conectado y documentado.

### Checklist

- [ ] Colección de movimientos única para el flujo seleccionado.
- [ ] Fallos históricos explicados mediante causa y prueba.
- [ ] Arranque local reproducible en backend memory o persistencia académica aislada.
- [ ] Restore y build del mismo SHA completan correctamente.
- [ ] No existen credenciales, URLs productivas ni operaciones reales en la demo.
- [ ] Servicios fuera del subconjunto están documentados como post-MVP.

### Criterios de cierre

El flujo mínimo puede arrancar desde una instrucción escrita, sin GCP real, y las pruebas esenciales pueden ejecutarse en un entorno aislado. `NUEVO-AUD-032` queda corregido o fuera del camino ejecutado con una justificación verificable.

**Dependencias:** ninguna. **Riesgos:** configuración local, contratos de colección, restore. **Archivos posibles:** Workers projection, Finance readers, appsettings locales, scripts de ejecución y pruebas de regresión. No modificar infraestructura productiva.

## ETAPA 2 — Billetera académica funcional

**Objetivo:** completar una rebanada vertical mínima de billetera con dinero ficticio.

### Trabajo

- Confirmar Login, restauración de sesión y logout.
- Confirmar consulta de perfil y saldo.
- Elegir una implementación de transferencia ficticia y una de recarga simulada; no mantener dos arquitecturas financieras activas para el mismo flujo.
- Persistir la operación y actualizar correctamente el saldo del origen/destino o del usuario recargado.
- Exponer el movimiento en historial usando la misma fuente de datos que escribe la operación.
- Mantener validaciones básicas: usuario existente, saldo suficiente, monto COP ficticio válido, ownership y autorización.
- Mantener idempotencia básica: misma intención/reintento no crea una segunda operación; cuerpo distinto produce conflicto o rechazo.
- Usar `FinancialIntent` solo si su integración reduce complejidad y puede probarse en el entorno académico; no exigir garantías comerciales que no aporten a la demostración.

### Checklist

- [ ] Login exitoso con usuario académico.
- [ ] Sesión inválida o expirada solicita login nuevamente.
- [ ] Perfil y saldo se leen desde una API funcional.
- [ ] Transferencia ficticia persiste y modifica saldos correctamente.
- [ ] Recarga simulada persiste y modifica saldo correctamente.
- [ ] Historial muestra la operación confirmada.
- [ ] Reintento no duplica el movimiento.
- [ ] Errores de validación, autorización y saldo insuficiente son comprensibles.
- [ ] No se habilitan medios de pago reales.

### Criterios de cierre

El flujo Wallet → transferencia/recarga → saldo → historial puede repetirse con datos de prueba y deja estado persistente coherente. La operación está marcada como simulada y no depende de un servicio financiero real.

**Dependencias:** Etapa 1. **Riesgos:** integración de controllers con servicios, contratos de saldo/movimiento, idempotencia. **Archivos posibles:** Wallet controllers/services/DTOs, Shared idempotency, stores, tests y servicios frontend.

## ETAPA 3 — Integración Android y backend

**Objetivo:** demostrar el producto desde el frontend Android, conectado a la API y no a respuestas simuladas en el flujo principal.

### Trabajo

- Configurar `EXPO_PUBLIC_API_URL` hacia el Gateway o endpoint académico aislado.
- Conectar Login, Wallet, transferencia/recarga e historial al cliente HTTP único elegido.
- Eliminar o desactivar respuestas DEMO en esas pantallas cuando exista backend persistente; mantener DEMO solo para módulos explícitamente fuera del flujo y rotularlo.
- Verificar navegación, estados loading/empty/error y sesión.
- Actualizar visualmente saldo e historial después de una operación exitosa.
- Validar que un 401 cierre la sesión y que 403/409/422 no se presenten como éxito.
- Probar en Android con datos académicos ficticios; iOS/Web no son obligatorios salvo requisito posterior.

### Checklist

- [ ] La app Android inicia con la configuración documentada.
- [ ] Login y logout funcionan desde la app.
- [ ] Saldo visible coincide con la respuesta backend.
- [ ] Transferencia/recarga se refleja sin reiniciar la app.
- [ ] Historial actualizado y persistente tras cerrar/abrir.
- [ ] No se muestran éxitos simulados para endpoints desconectados.
- [ ] Errores de red, sesión y validación tienen estado visible.
- [ ] La clave de idempotencia se conserva en el reintento de una misma intención.

### Criterios de cierre

Un estudiante puede ejecutar el flujo completo desde Android contra el backend académico y repetirlo con datos ficticios. La app no requiere servicios productivos ni presenta funciones comerciales como disponibles.

**Dependencias:** Etapa 2. **Riesgos:** dos clientes HTTP, DEMO, navegación state-based, contrato frontend/backend. **Archivos posibles:** `frontend/App.tsx`, SessionManager, cliente HTTP, servicios, hooks y pantallas. No agregar Expo Router ni React Navigation.

## ETAPA 4 — Pruebas, documentación y presentación

**Objetivo:** convertir el flujo implementado en una entrega académica demostrable.

### Trabajo

- Ejecutar build backend, typecheck y pruebas unitarias esenciales del mismo SHA.
- Validar API y flujo integral en el entorno académico aislado.
- Documentar arquitectura sencilla: frontend → Gateway/API → servicios → persistencia simulada/aislada.
- Preparar evidencia de login, saldo inicial, transferencia/recarga, saldo final e historial.
- Documentar limitaciones: dinero ficticio, servicios excluidos, DEMO residual fuera del flujo, ausencia de GCP productivo y módulos post-MVP.
- Crear guion de demostración repetible y datos de prueba conocidos.
- Conservar los hallazgos históricos y marcar cuáles quedan post-MVP.

### Checklist

- [ ] Backend build correcto.
- [ ] Frontend typecheck correcto.
- [ ] Unit tests esenciales correctos.
- [ ] Contratos API principales documentados.
- [ ] Flujo Login → Wallet → operación → saldo → historial ejecutado.
- [ ] Reintento idempotente demostrado.
- [ ] Persistencia tras cerrar/abrir documentada.
- [ ] Capturas/logs/evidencias sin secretos.
- [ ] Guion académico preparado.
- [ ] Limitaciones conocidas explicadas.

### Criterios de cierre

La demostración puede repetirse con datos ficticios, las pruebas principales están asociadas al mismo SHA y la documentación no afirma capacidades comerciales o productivas inexistentes.

**Dependencias:** Etapa 3. **Riesgos:** evidencia incompleta y diferencias entre documentación y código. **Archivos posibles:** únicamente documentos para esta fase de planificación; las futuras implementaciones requerirán autorización separada.

## Matriz de requisitos del MVP

| ID | Funcionalidad | Obligatoria | Estado actual | Trabajo pendiente | Prueba de aceptación | Prioridad |
|---|---|---:|---|---|---|---|
| MVP-01 | Login y sesión | Sí | Implementación existente, no validada en HEAD actual | Ejecutar y documentar login/logout | Usuario entra y un 401 invalida sesión | MVP-BLOQUEANTE |
| MVP-02 | Perfil | Sí | Backend/frontend existentes | Conectar al flujo elegido | Perfil del usuario autenticado se muestra | MVP-IMPORTANTE |
| MVP-03 | Saldo wallet | Sí | Implementado en memory/Spanner | Seleccionar backend aislado y validar | Saldo inicial y final coinciden | MVP-BLOQUEANTE |
| MVP-04 | Transferencia ficticia | Sí | Mock y servicio Spanner existentes; ruta financiera avanzada no integrada | Elegir un único camino académico | Operación cambia saldos correctamente | MVP-BLOQUEANTE |
| MVP-05 | Recarga simulada | Sí | Mock y servicio Spanner existentes | Elegir método simulado y persistencia | Recarga aumenta saldo sin pago real | MVP-BLOQUEANTE |
| MVP-06 | Historial | Sí | Finance/Firestore y pantallas existentes | Usar la misma colección/fuente de escritura | Operación aparece después de confirmarse | MVP-BLOQUEANTE |
| MVP-07 | Persistencia | Sí | Stores memory/Spanner/Firestore existentes | Definir opción aislada reproducible | Datos sobreviven reinicio según backend elegido | MVP-BLOQUEANTE |
| MVP-08 | Autorización/ownership | Sí | Policies y claims existentes | Validar usuario propio y errores | Usuario no accede a datos ajenos | MVP-IMPORTANTE |
| MVP-09 | Idempotencia básica | Sí | Filtros y claves existentes; fallback inseguro | Validar reintento y corregir fallback si afecta flujo | Misma intención produce un movimiento | MVP-IMPORTANTE |
| MVP-10 | Android conectado | Sí | Expo/pantallas existentes | Conectar servicios reales del flujo | App inicia y completa el flujo | MVP-BLOQUEANTE |
| MVP-11 | Beneficiarios | No | Implementado parcialmente | Mantener solo si no amplía alcance | Crear/listar beneficiario de prueba | RECOMENDABLE |
| MVP-12 | Categorías/presupuestos/metas | No | Implementados parcialmente | Posponer salvo tiempo y estabilidad | Datos opcionales no rompen wallet | RECOMENDABLE |
| MVP-13 | Analítica/notificaciones | No | Implementación parcial y proyección inconsistente | Posponer o arreglar colección solo si se incluye | Lectura opcional coherente | RECOMENDABLE |
| MVP-14 | Backoffice/Assistant/Voice/Realtime | No | Parcial/existente | Mantener como trabajo futuro | N/A para MVP | FUERA DE ALCANCE |
| MVP-15 | Offline/iOS/Web/GCP productivo | No | Incompleto/no verificado | No implementar para entrega inicial | N/A | FUERA DE ALCANCE |

## Checklist de presentación académica

- [ ] Android inicia correctamente.
- [ ] Usuario inicia sesión.
- [ ] Wallet muestra saldo.
- [ ] Se ejecuta transferencia ficticia.
- [ ] Saldos correspondientes se actualizan.
- [ ] Transferencia aparece en historial.
- [ ] Se ejecuta recarga simulada.
- [ ] Recarga actualiza saldo.
- [ ] Datos sobreviven cierre/apertura según almacenamiento elegido.
- [ ] Solicitud repetida no duplica el movimiento.
- [ ] Errores principales son comprensibles.
- [ ] Flujo repetible con datos académicos.
- [ ] Pruebas principales documentadas.
- [ ] Arquitectura explicable en pocos pasos.

## Secuencia de trabajos posteriores

### Trabajo MVP-01 — Reparar proyección y pruebas de regresión

**Objetivo:** eliminar `NUEVO-AUD-032` y explicar los dos fallos históricos de Budgets/Analytics. **Archivos posibles:** `ProjectionService.cs`, `MovementReader.cs`, lectores Finance, tests de Workers/Finance. **Riesgo:** cambiar la colección puede afectar consultas existentes. **Pruebas:** evento con y sin categoría, Budgets y Analytics. **Aceptación:** una operación proyectada se lee por todos los consumidores previstos. **No modificar:** DDL productivo ni recursos GCP.

### Trabajo MVP-02 — Estabilizar backend local

**Objetivo:** arrancar solo los servicios necesarios en memory o persistencia aislada. **Archivos posibles:** `Program.cs`, appsettings y `run-local.ps1`. **Dependencias:** MVP-01. **Riesgo:** habilitar accidentalmente Spanner. **Pruebas:** startup, health y API local. **Aceptación:** procedimiento reproducible sin credenciales GCP. **No modificar:** deploy scripts productivos ni IAM.

### Trabajo MVP-03 — Cerrar el slice Wallet

**Objetivo:** escoger y conectar una sola implementación de transferencia/recarga ficticia. **Archivos posibles:** Wallet controllers/services, Shared idempotency, DTOs, tests. **Dependencias:** MVP-02. **Riesgo:** duplicar arquitectura FinancialIntent/mock. **Pruebas:** saldo, operación, replay, conflicto y ownership. **Aceptación:** flujo persistente sin duplicación. **No modificar:** operaciones financieras reales.

### Trabajo MVP-04 — Integrar frontend Android

**Objetivo:** conectar Login, Wallet, operación e historial mediante el cliente HTTP elegido. **Archivos posibles:** servicios, hooks, pantallas y `App.tsx`. **Dependencias:** MVP-03. **Riesgo:** DEMO o dos transportes HTTP. **Pruebas:** typecheck, unit y manual Android. **Aceptación:** flujo completo visible y repetible. **No modificar:** navegación con librerías nuevas.

### Trabajo MVP-05 — Evidencia y presentación

**Objetivo:** preparar documentación, logs/capturas sin secretos y guion. **Archivos:** Markdown autorizados inicialmente. **Dependencias:** MVP-04. **Pruebas:** build/typecheck/unit y recorrido manual. **Aceptación:** entrega explicable con limitaciones explícitas. **No modificar:** código durante la fase documental.

## Decisión de alcance

El plan vigente prioriza una billetera académica pequeña y coherente. Las garantías y componentes comerciales permanecen documentados como post-MVP; no se deben reactivar releases administrativos, GCP productivo, pagos reales ni despliegues empresariales para reducir artificialmente los hallazgos.

# SEGUIMIENTO DE EJECUCIÓN MVP ACADÉMICO — 2026-11-01

## Estado real por etapa

| Etapa | Estado | Implementación | Pruebas | Pendiente |
|---|---|---|---|---|
| 1. Estabilización | VALIDADA LOCALMENTE | Proyección canónica, guards memory, siete servicios y Gateway 8087. | Restore/build Release; backend seguro 171 aprobadas y startup comprobado. | Emulator/Firestore aislado. |
| 2. Billetera académica | PARCIALMENTE IMPLEMENTADA | Store atómico, saldo mutable, transferencias, recargas y persistencia JSON opcional. | Wallet y suite backend pasan. | Reinicio API automatizado e historial cross-service. |
| 3. Android y backend | EN PROGRESO | Modo académico local, headers demo controlados y cliente HTTP. | Typecheck y 255 unitarias. | Emulador Android y recorrido visual. |
| 4. Pruebas/documentación/presentación | EN PROGRESO | Esta adenda y evidencia actualizadas. | Sin E2E ni Android. | Capturas, guion y checklist manual. |

## Checklist actualizado

### Etapa 1

- [x] Workers y Finance usan `financial_movements`.
- [x] Profile, Assistant y Backoffice arrancan en memory sin database Spanner.
- [x] `run-local.ps1 -Backend memory` levantó servicios y Gateway 8087 en copia temporal.
- [x] Backend Release compila en copia temporal aislada.
- [ ] Spanner Emulator/Firestore aislado ejecutado; requiere infraestructura separada.

### Etapa 2

- [x] Transferencia actualiza saldo de origen y destino.
- [x] Recarga simulada actualiza saldo.
- [x] Persistencia JSON local opcional configurada por `Academic__StorePath`.
- [x] Saldo insuficiente y límites conservan pruebas.
- [x] Replay/conflicto HTTP de idempotencia conserva pruebas.
- [ ] Flujo Gateway → Finance → movimientos verificado end-to-end.

### Etapa 3

- [x] Modo académico limitado explícitamente a desarrollo.
- [x] Frontend typecheck pasa.
- [x] Frontend unitarias pasan 255/255.
- [ ] Login académico probado en Android.
- [ ] Saldo, transferencia, recarga e historial comprobados visualmente.
- [ ] `localhost`/`10.0.2.2` y dispositivo físico verificados.

### Etapa 4

- [x] Resultados y bloqueos registrados.
- [x] Se documentó ausencia de GCP real, commits y push.
- [ ] Evidencia manual del checklist de presentación.
- [ ] Guion ejecutado por una segunda persona.

## Matriz MVP posterior a la implementación

| ID | Funcionalidad | Estado | Evidencia | Prioridad |
|---|---|---|---|---|
| MVP-01 | Arranque backend memory | VALIDADA LOCALMENTE | run-local memory, 8 procesos: 7 servicios + Gateway | Alta |
| MVP-02 | Login académico local | IMPLEMENTADO, SIN ANDROID | cliente académico + headers demo | Alta |
| MVP-03 | Perfil | API existente, integración pendiente | servicio Profile/tests históricos | Alta |
| MVP-04 | Saldo mutable | VALIDADO AUTOMÁTICAMENTE | WalletTests y prueba HTTP | Alta |
| MVP-05 | Transferencia ficticia | VALIDADA EN BACKEND | saldos, errores y ownership | Alta |
| MVP-06 | Recarga simulada | VALIDADA EN BACKEND | saldo e idempotencia HTTP | Alta |
| MVP-07 | Historial | PARCIAL | proyección canónica; falta cross-service | Alta |
| MVP-08 | Persistencia local | IMPLEMENTADA, PRUEBA DE REINICIO PENDIENTE | JSON en run-local | Alta |
| MVP-09 | Ownership/autorización | VALIDADA EN TESTS | Wallet/Projection/RBAC | Alta |
| MVP-10 | Idempotencia frontend | VALIDADA UNITARIAMENTE | 255 unitarias; sin Math.random | Alta |
| MVP-11 | Frontend sin DEMO | IMPLEMENTADO, SIN ANDROID | api.ts, modo académico, typecheck | Alta |
| MVP-12 | Android | BLOQUEADO | sin emulador/dispositivo | Alta |
| MVP-13 | Errores básicos | PARCIALMENTE VALIDADO | backend/frontend; falta UX Android | Media |
| MVP-14 | Documentación reproducible | EN PROGRESO | plan, auditoría y script local | Media |
| MVP-15 | Presentación | PENDIENTE | falta evidencia manual | Media |

## Orden operativo inmediato

1. Ejecutar una secuencia API local que confirme persistencia JSON tras detener y reiniciar Wallet.
2. Configurar `EXPO_PUBLIC_API_URL=http://10.0.2.2:8087`, `EXPO_PUBLIC_DEMO_MODE=false` y `EXPO_PUBLIC_ACADEMIC_MODE=true` para el emulador Android.
3. Validar Login → perfil → saldo → transferencia → saldos → recarga → movimientos.
4. Si el historial no cruza Gateway/Finance en procesos separados, completar la proyección memory sin Firestore real.
5. Ejecutar el checklist de presentación y guardar evidencia sin tokens ni datos reales.

No ejecutar `run-local.ps1` sin `-Backend memory`, colecciones GCP ni migraciones. El modo académico local no habilita autenticación demo en Production.
# VALIDACION FINAL Y GUIA ANDROID - 2026-11-01

## Estado posterior

Etapa 2 queda validada para el slice HTTP local: Gateway -> Wallet memory -> `AcademicWalletStore`, con transferencia, recarga, historial, idempotencia y reinicio JSON. Etapa 3 sigue en progreso sin emulador/dispositivo Android. Etapa 4 es parcial por falta de recorrido visual y E2E.

## Checklist actualizado

- [x] Backend Release: 0 errores, 4 warnings XML preexistentes.
- [x] Backend seguro: 171 aprobadas, 0 fallidas, 4 omitidas por Spanner.
- [x] Backend MVP focalizado: 24 aprobadas, 0 fallidas.
- [x] Frontend typecheck correcto.
- [x] Frontend unitarias: 255 aprobadas, 0 fallidas.
- [x] Gateway y siete servicios arrancan en memory.
- [x] Transferencia actualiza saldos de emisor y receptor.
- [x] Recarga actualiza saldo e historial.
- [x] Replay no duplica y cuerpo distinto devuelve 409.
- [x] Solicitud anonima devuelve 401.
- [x] Reinicio conserva saldo, 1 transferencia y 1 recarga.
- [ ] Login y flujo visual Android.
- [ ] Perfil en el recorrido de demostracion.
- [ ] Prueba Android con `10.0.2.2` o IP LAN.
- [ ] Historial cross-service Finance/Workers/Firestore.
- [ ] Guion ejecutado por segunda persona.

## Procedimiento Windows para Android

1. Desde la raiz ejecutar exclusivamente `.\scripts\run-local.ps1 -Backend memory`. Usa `.local-run\academic-wallet.json`, Gateway 8087 y no GCP.
2. En `frontend\.env` configurar `EXPO_PUBLIC_API_URL=http://10.0.2.2:8087` para emulador o `http://IP-LAN-PC:8087` para dispositivo fisico; usar `EXPO_PUBLIC_DEMO_MODE=false` y `EXPO_PUBLIC_ACADEMIC_MODE=true`.
3. No usar `localhost` desde Android. No usar tuneles publicos. La opcion `-Lan` solo es para red local autorizada.
4. Desde `frontend` ejecutar `npx expo start --android` con dependencias instaladas.
5. Iniciar sesion con correo y contrasena no vacios; el modo academico es solo Development.
6. Ejecutar Login -> Wallet -> saldo -> transferencia a `DEST0001` -> saldo/historial -> recarga `SIMULATED_PSE` -> saldo/historial.
7. Repetir la misma intencion y confirmar que no duplica; cerrar y abrir app; reiniciar backend y confirmar persistencia.
8. Ejecutar `.\scripts\stop-local.ps1` y conservar evidencia sin tokens.

Este guion queda pendiente de ejecucion manual; no marcar MVP-12 ni Etapa 3 como validados antes de observar Android.

## Dependencias

`npm audit` reporto 13 vulnerabilidades (3 altas, 9 moderadas, 1 baja, 0 criticas). No se aplico `audit fix --force` porque propone Expo 53/51 frente al SDK 58 declarado. Abrir una PR independiente para resolver compatibilidad.

## Prioridades siguientes

1. Ejecutar el guion Android y completar MVP-02, MVP-11, MVP-12, MVP-13 y MVP-15 con evidencia.
2. Incorporar Profile al recorrido o declarar expresamente su exclusion academica.
3. Si se exige historial Finance/Workers, preparar prueba aislada sin Firestore real.
4. Aislar el key ring de Data Protection en el procedimiento local.
## Inicio de sesion academico corregido

La pantalla mostrada por Expo Go era `SessionGate` en estado `signed-out`. El formulario estaba conectado, pero el texto era historico y afirmaba que no existia login. Ahora indica que se trata de una sesion academica local y explica el procedimiento seguro.

Para Development no se necesitan credenciales productivas ni cuentas creadas en GCP. Con `EXPO_PUBLIC_ACADEMIC_MODE=true`, se puede usar cualquier correo ficticio no vacio y cualquier contrasena no vacia; la identidad se deriva localmente y el backend memory usa sus headers academicos. Esta regla no aplica en Production.

La configuracion verificada para el emulador esta en `frontend/.env.local`. Despues de modificarla, detener Metro y ejecutar `npx expo start --clear`; de lo contrario Expo Go puede continuar mostrando un bundle anterior y conservar el mensaje historico.

# SEGUIMIENTO MOVIMIENTOS ACADEMICOS - 2026-11-01

## Cambio aplicado

El historial del MVP academico no pasa por Finance/Firestore. La pantalla Movimientos conserva `GET /v1/movements` para modos no academicos, pero con `EXPO_PUBLIC_ACADEMIC_MODE=true` combina `GET /v1/transfers` y `GET /v1/recharges` a traves del Gateway `8087`. Estos endpoints leen `AcademicWalletStore`, el mismo store que actualiza los saldos.

## Validacion

- [x] Frontend typecheck sin errores.
- [x] 260 pruebas unitarias frontend aprobadas.
- [x] Backend focalizado Wallet: 7/7 aprobadas en copia temporal.
- [x] Gateway memory: transferencia, recarga, saldo y listados autenticados comprobados.
- [x] Reinicio del backend: JSON recupero 1 transferencia, 1 recarga y el saldo sin duplicados.
- [x] Estado de error Movimientos: solo un boton `Reintentar` cuando corresponde.
- [ ] Verificar visualmente en Expo Go Android con `10.0.2.2:8087`.

## Procedimiento de comprobacion Android

Con `.\scripts\run-local.ps1 -Backend memory`, confirmar en `frontend/.env.local`:

```text
EXPO_PUBLIC_API_URL=http://10.0.2.2:8087
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_ACADEMIC_MODE=true
```

Desde `frontend`, ejecutar `npx expo start --clear`, abrir Expo Go en el emulador, iniciar sesion con correo y contrasena ficticios no vacios, y ejecutar Wallet -> transferencia o recarga -> Movimientos. La pantalla debe mostrar ambos registros. No usar `localhost`, credenciales productivas ni GCP.

# SEGUIMIENTO DE CARGA DE MOVIMIENTOS - 2026-11-02

- [x] Eliminada la dependencia circular entre `ownClientId` y el inicio de la carga academica.
- [x] Las solicitudes de transferencias y recargas terminan y alimentan el historial.
- [x] Historial vacio transiciona a `Movements_02`.
- [x] Se agrego prueba de regresion contra carga infinita.
- [x] Typecheck y 261 pruebas unitarias frontend aprobadas.
- [ ] Confirmar visualmente en Android con Expo Go.

La verificacion manual debe reiniciar Metro con `npx expo start --clear`, mantener `EXPO_PUBLIC_API_URL=http://10.0.2.2:8087`, `EXPO_PUBLIC_DEMO_MODE=false` y `EXPO_PUBLIC_ACADEMIC_MODE=true`, y comprobar tanto un usuario sin operaciones como otro con transferencia o recarga.

# SEGUIMIENTO ANDROID: SESION, TIMEOUT Y NAVEGACION - 2026-11-02

- [x] Restauracion de sesion valida conservada; no se elimino SecureStore.
- [x] Sesion sin refresh token continua entrando a `SessionGate`.
- [x] Logout conectado desde Perfil y limpieza delegada a `SessionManager`.
- [x] Movimientos ya no bloquea la navegacion inferior.
- [x] Inicio, Movimientos y Perfil tienen rutas explicitas.
- [x] Asistente informa que esta fuera del alcance actual.
- [x] Diagnostico de desarrollo agregado sin secretos.
- [x] Typecheck correcto y 263 pruebas frontend aprobadas.
- [x] Gateway local memory respondio saldo y listados sin timeout.
- [ ] Confirmar visualmente todo el flujo en Expo Go Android.

Para la comprobacion manual: ejecutar `.\scripts\run-local.ps1 -Backend memory`, conservar `EXPO_PUBLIC_API_URL=http://10.0.2.2:8087`, `EXPO_PUBLIC_DEMO_MODE=false` y `EXPO_PUBLIC_ACADEMIC_MODE=true`, iniciar Expo con `npx expo start --clear`, comprobar restauracion/login, navegar por las cuatro tabs, cerrar sesion desde Perfil y volver a iniciar sesion. Los logs de Metro mostraran `[session]`, `[academic-movements]` y `[http]` sin credenciales.

# SEGUIMIENTO OPERACIONES ACADEMICAS Y PERFIL - 2026-11-01

## Cambios incorporados

- [x] Idempotencia Android compatible con Expo Go mediante `expo-crypto`, sin `Math.random()`.
- [x] Error del proveedor criptografico convertido en rechazo controlado; no se envia una operacion sin `Idempotency-Key`.
- [x] Perfil academico local registrado por DI cuando `Data:Backend=memory`.
- [x] Perfil Spanner conservado para el backend GCP existente; no se accedio a GCP.
- [x] Bloque temporal `[RAW-FETCH]` eliminado de `frontend/index.ts`.
- [x] Transferencia y recarga comprobadas por Gateway con saldo e historial.
- [x] Replay de recarga comprobado sin duplicacion.

## Evidencia y pendientes

| Elemento | Estado |
|---|---|
| Frontend typecheck | Validado: 0 errores |
| Frontend unitarias | Validado: 265/265 |
| Backend Release | Validado en copia temporal; 0 errores, 4 warnings XML preexistentes |
| Backend completo | 193 aprobadas, 43 omitidas por emulador, 1 fallo ambiental de Event Log Windows |
| Profile memory directo y por Gateway aislado | Validado HTTP 200 |
| Transferencia, recarga, saldo y listados | Validado en Gateway memory |
| Idempotencia de replay | Validado; misma respuesta y sin segundo movimiento |
| Android visual Expo Go | Pendiente |
| Persistencia JSON tras reinicio observada en este seguimiento | Pendiente de repetir con el stack reconstruido |

## Procedimiento Android actualizado

En `frontend/.env.local` mantener `EXPO_PUBLIC_API_URL=http://10.0.2.2:8087`, `EXPO_PUBLIC_DEMO_MODE=false` y `EXPO_PUBLIC_ACADEMIC_MODE=true`. Ejecutar `.\scripts\run-local.ps1 -Backend memory`, iniciar Expo con `npx expo start --clear`, entrar con un correo y contrasena academicos no vacios, comprobar Perfil, Wallet, transferencia, recarga y Movimientos. La prueba de idempotencia debe repetir la misma intencion, no generar otra operacion manualmente. El backend academico no usa GCP ni dinero real.

El Gateway 8087 ya fue validado en esta ejecucion por el flujo HTTP existente. Si el puerto esta ocupado, no reutilizar un proceso antiguo para atribuir resultados al codigo nuevo: detener solo el stack local identificado o usar puertos aislados y documentar la diferencia.

# SEGUIMIENTO TRANSFERENCIA DESDE INICIO - 2026-11-02

## Estado

- [x] Inicio muestra el boton visible `Transferir`.
- [x] El boton abre `Transfers_01` y limpia el borrador academico.
- [x] El formulario reutiliza los servicios y pantallas Transfers existentes.
- [x] El usuario puede introducir codigo de destinatario e importe.
- [x] `Transfers_03` solicita confirmacion antes del POST.
- [x] El envio usa autenticacion e idempotencia criptografica existentes.
- [x] Las pulsaciones repetidas quedan bloqueadas durante el envio.
- [x] Exito actualiza saldo, cache de transferencias y movimientos.
- [x] `DEST0001` fue aceptado por el backend memory en prueba HTTP.
- [ ] Confirmar visualmente el recorrido completo en Expo Go Android.

## Recorrido de comprobacion

Con el backend iniciado mediante `.\scripts\run-local.ps1 -Backend memory`, `adb reverse tcp:8087 tcp:8087` y `EXPO_PUBLIC_API_URL=http://127.0.0.1:8087`, abrir Wallet y pulsar `Transferir`. Introducir `DEST0001`, un importe dentro del saldo y pulsar `Continuar`; revisar destinatario e importe en la confirmacion; pulsar `Confirmar transferencia`; volver a Movimientos y comprobar la fila en Todos y Enviados. Repetir la misma intencion solo para validar idempotencia. No usar dinero real ni GCP.
# BALANCE DOCUMENTAL DEL MVP ACADÉMICO — HEAD 39e089f — 2026-11-01

## Referencia operativa

La rama vigente es feature/mvp-academico y el HEAD documentado es 39e089f2fdc6582688f48622fff7f9ea191ee0fe. El commit anterior 1420cf2 implementó transferencias académicas desde Android; 39e089f completó la navegación segura del comprobante.

El MVP Android ya funciona con la ruta local comprobada mediante `adb reverse`:

    .\scripts\run-local.ps1 -Backend memory
    adb reverse tcp:8087 tcp:8087
    $env:EXPO_PUBLIC_API_URL='http://127.0.0.1:8087'

No requiere Google Cloud, dinero real, Identity Platform real, Spanner real, Firestore real ni pasarelas de pago.
Las referencias históricas a `10.0.2.2:8087` corresponden al diagnóstico de conectividad; no son la configuración recomendada para la demostración actual. La guía `docs/GUIA_MVP_ACADEMICO.md` es la referencia operativa vigente.

## Estado por funcionalidad

| Funcionalidad | Estado | Evidencia o límite |
|---|---|---|
| Autenticación académica | Terminada y probada | SessionGate, academicIdentityPlatform, SecureStore y pruebas frontend |
| Cierre de sesión | Terminado | sessionManager.signOut y validación de sesión |
| Consulta de perfil | Terminada en memory | AcademicProfileDataStore; no persiste entre reinicios |
| Consulta de saldo | Terminada | Wallet API y AcademicWalletStore |
| Recarga simulada | Terminada | POST/GET recharges, idempotencia y Android reportado |
| Transferencia ficticia | Terminada | POST/GET transfers, saldos y Android reportado |
| Confirmación explícita | Terminada | Transfers_03 exige Confirmar transferencia |
| Idempotencia | Terminada para MVP | expo-crypto y FinancialOperation; no sustituye FinancialIntent GCP |
| Historial | Terminado para modo académico | transfers + recharges; no es Finance/Firestore E2E |
| Filtros Todos/Enviados/Recargas | Terminados | Movements académico |
| Detalle de movimientos | Disponible | Validar manualmente con datos del usuario |
| Comprobante | Disponible | Receipt y navegación académica |
| Navegación posterior | Terminada | Wallet_01, Movements_01 y back físico seguro |
| Persistencia Wallet | Terminada localmente | AcademicWalletStore con JSON de run-local |
| Persistencia Profile | Limitada | Memoria de proceso |
| Pruebas de regresión | Disponibles | 268 frontend; Wallet focalizado 7 |
| GCP/Spanner/Firestore | Fuera del recorrido MVP | Mantener como arquitectura futura y riesgos históricos |

## Checklist de aceptación

### Sesión y perfil

- [x] Login académico con correo y contraseña no vacíos.
- [x] Restauración de sesión válida.
- [x] Sesión inválida vuelve al SessionGate.
- [x] Logout limpia la sesión local.
- [x] Perfil académico responde por Gateway memory.
- [ ] Persistencia de Profile después de reiniciar el backend.

### Wallet y operaciones

- [x] Consulta de saldo.
- [x] Transferencia ficticia a destinatario permitido.
- [x] Confirmación explícita antes del POST.
- [x] Validación de importe vacío, cero y superior al saldo.
- [x] Idempotency-Key segura sin Math.random.
- [x] Reintento de la misma intención sin duplicación.
- [x] Recarga simulada.
- [x] Saldo actualizado después de transferir o recargar.
- [x] Errores 4xx tratados sin mostrar éxito falso.

### Historial y comprobante

- [x] Transferencias visibles en modo académico.
- [x] Recargas visibles en modo académico.
- [x] Filtros Todos, Enviados y Recargas.
- [x] Detalle y referencia de operación.
- [x] Comprobante consultable.
- [x] Volver al inicio lleva a Wallet_01.
- [x] Ver movimientos lleva a Movements_01.
- [x] Retroceso Android no vuelve a confirmación reenviable.
- [x] El borrador se limpia al salir del comprobante.
- [ ] Historial a través de Finance, Workers y Firestore reales.

### Entorno y regresión

- [x] Backend memory arranca con el script oficial.
- [x] Gateway local responde en 8087.
- [x] adb reverse documentado y validado por el equipo.
- [x] Frontend typecheck.
- [x] Pruebas unitarias frontend: 268 aprobadas.
- [x] Prueba focalizada Wallet: 7 aprobadas.
- [ ] Suite backend completa sin el fallo ambiental de Windows Event Log.
- [ ] iOS, Expo Web y GCP real: fuera del MVP académico.

## Flujo de demostración para el equipo

1. Clonar el repositorio y cambiar a feature/mvp-academico.
2. Ejecutar npm ci dentro de frontend.
3. Ejecutar run-local.ps1 -Backend memory desde la raíz.
4. Comprobar health/live y health/ready del Gateway.
5. Configurar EXPO_PUBLIC_API_URL=http://127.0.0.1:8087, EXPO_PUBLIC_DEMO_MODE=false y EXPO_PUBLIC_ACADEMIC_MODE=true.
6. Ejecutar adb reverse tcp:8087 tcp:8087.
7. Iniciar Expo con npx expo start --clear.
8. Abrir Expo Go, iniciar sesión con datos ficticios y recorrer Wallet, Perfil, recarga, transferencia, historial, comprobante y logout.
9. Detener servicios con stop-local.ps1.
10. Conservar logs sin tokens ni archivos JSON personales.

La guía completa está en docs/GUIA_MVP_ACADEMICO.md y enlazada desde README.md y docs/README.md.

## Próximos pasos priorizados

1. Mantener el procedimiento memory/Android reproducible para la presentación.
2. Revisar visualmente etiquetas y componentes heredados de Stitch sin tocar la lógica financiera.
3. Añadir una prueba manual o automatizada del reinicio de Profile si se requiere persistencia completa.
4. Separar y resolver en una PR independiente el fallo ambiental de Windows Event Log.
5. No reabrir GCP, Spanner, Firestore, Workers ni FinancialIntent productivo salvo requisito académico explícito.
6. Mantener RES-F1-001 a RES-F1-010 como riesgos de la arquitectura ampliada.

## Límites que deben mantenerse

- El sistema es académico y usa dinero ficticio.
- No se deben utilizar recursos GCP reales para la demostración.
- No se debe habilitar autenticación académica fuera de Development.
- No se debe modificar la lógica financiera para mejorar únicamente la presentación.
- El JSON local no debe subirse ni compartirse.
- El MVP no se debe presentar como aplicación bancaria ni como listo para producción.
