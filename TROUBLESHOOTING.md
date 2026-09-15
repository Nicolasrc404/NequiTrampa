# Registro de solución de problemas

Formato: `[Fecha/Hora]`, `[Descripción del error]`, `[Solución aplicada]` (regla obligatoria de `GEMINI.md`).

---

## [2026-09-14 20:00] Todo el modelo de dominio de `profile-service` no coincidía con el esquema real de Spanner

**Descripción del error:** `Client`, `Administrator` y sus repositorios (`SpannerClientRepository`,
`SpannerAdminRepository`) estaban escritos contra un esquema imaginado
(`phone_number`, `document_type`, `document_number`, `identity_uid`, `admin_id`,
`full_name`, `role` con valores `ADMIN/SOPORTE/OPERADOR_FINANCIERO`) que no
existe en la base real desplegada en GCP. El esquema real (`spanner/01_schema.sql`,
ya desplegado y verificado) usa `auth_subject`, `username`, `public_transfer_code`,
`alias`, `timezone` en `clients`, y `administrator_id`, `display_name`,
`admin_level` (`SUPPORT/OPERATOR/SUPERADMIN`) en `administrators`. Además
`Program.cs` nunca llamaba a `AddInfrastructure()`/`AddApplication()`, así que el
servicio ni siquiera intentaba conectarse a nada. Ninguna de estas rutas habría
funcionado contra la base real.

**Solución aplicada:** Se reescribió el dominio (`Client`, `Administrator`,
`UserStatus` → `ACTIVE/SUSPENDED/CLOSED`, `AdminRole` → `SUPPORT/OPERATOR/SUPERADMIN`,
alineados con los `CHECK` constraints reales) y los repositorios Spanner para
mapear 1:1 contra `01_schema.sql`. Se agregó generación de `public_transfer_code`
único (8 caracteres, alfabeto sin ambigüedades) en `AuthApplicationService`. Se
conectó `Program.cs`: DI completa, autenticación JWT Bearer contra Identity
Platform (`https://securetoken.google.com/{projectId}`), manejo de errores de
dominio → HTTP, y endpoints `/v1/auth/register`, `/v1/profile/*`,
`/v1/clients/resolve/{code}`.

**Pendiente / fuera de alcance:** El feature de `Beneficiary` (`beneficiaries`)
apunta a una tabla que **no existe** en el esquema real de Spanner (solo hay 9
tablas). Compila pero fallará en tiempo de ejecución. Requiere decidir y aplicar
una migración de esquema antes de habilitarlo.

**Pendiente / fuera de alcance:** El notebook del proyecto documenta roles de
negocio `SOPORTE / OPERADOR_FINANCIERO / ADMIN` para RBAC, pero la columna real
`administrators.admin_level` solo acepta `SUPPORT/OPERATOR/SUPERADMIN` (CHECK
constraint). Se priorizó lo que la base de datos realmente exige porque es lo
único que garantiza que un INSERT no falle. Falta reconciliar ambos vocabularios
(¿son el mismo concepto con nombres distintos, o dos capas distintas — nivel de
cuenta vs. rol de autorización?).

---

## [2026-09-14 21:20] `outbox_events`: columna `status` no existe / tipo de `payload` incorrecto

**Descripción del error:** `SpannerOutboxRepository` insertaba una columna
`status` (STRING) que no existe en la tabla real — el estado "pendiente" se
modela con `pending_since`/`published_at` (ver comentario en
`spanner/01_schema.sql`). Además el parámetro `payload` se enviaba como
`SpannerDbType.String`, pero la columna real es `JSON`, lo que Spanner rechaza
con `InvalidArgument`. Esto bloqueaba **cualquier** operación transaccional del
servicio (registro de cliente, actualización de perfil, cambio de estado),
porque todas escriben un evento outbox en la misma transacción.

**Solución aplicada:** `AddAsync` ahora inserta `pending_since = created_at` (sin
columna `status`) y usa `SpannerDbType.Json` para `payload`. `GetPendingEventsAsync`
filtra por `pending_since IS NOT NULL`. `MarkAsPublishedAsync` limpia
`pending_since` a `NULL` y fija `published_at`. `MarkAsFailedAsync` incrementa
`attempts` y registra `last_error` (no existe un estado "FAILED" persistido; el
evento sigue pendiente y se reintenta).

---

## [2026-09-14 21:30] Connection string de Spanner mal formada para el emulador local

**Descripción del error:** `SpannerOptions.ConnectionString` combinaba host y
puerto en un solo campo (`Host=localhost:9010`), y usaba
`EmulatorDetection=Always`, que **no es un valor válido** del enum
`Google.Api.Gax.Grpc.EmulatorDetection` (solo existen `EmulatorOnly` y
`ProductionOnly`). Esto producía primero un `UriFormatException` ("Invalid port
specified") y, tras corregir el separado de host/puerto, un intento de TLS
contra el puerto plano del emulador (`AuthenticationException`). El valor
`EmulatorOnly`, además, exige que la variable de entorno **del proceso**
`SPANNER_EMULATOR_HOST` esté definida — no basta con pasarla en la connection
string.

**Solución aplicada:** `ConnectionString` ahora fija
`Environment.SetEnvironmentVariable("SPANNER_EMULATOR_HOST", ...)` si no está ya
definida, y usa `EmulatorDetection=EmulatorOnly` sin `Host=`/`Port=` explícitos
(el cliente los toma de la variable de entorno). Verificado extremo a extremo
contra un emulador local (`gcloud emulators spanner start`) con el esquema real
aplicado: `POST /v1/auth/register` → `201 Created`, fila persistida, y el
segundo intento con el mismo email → `409 EMAIL_ALREADY_EXISTS` (confirma
lectura consistente contra la misma base).

---

## Notas de seguridad aplicadas (ver notebook del proyecto, sección Identity Platform)

- Las contraseñas nunca se registran en logs (`GoogleIdentityPlatformService`
  solo loguea email/UID, nunca el password).
- Los Custom Claims se fijan exclusivamente desde el backend
  (`AuthApplicationService`/`AdminApplicationService`), nunca desde el cliente.
- El JWT se valida contra el issuer real de Identity Platform
  (`https://securetoken.google.com/{projectId}`) con `ValidAlgorithms = ["RS256"]`
  explícito (rechaza `alg=none` y downgrade a HMAC).
- **Pendiente de configurar en la consola de GCP** (no es código de la app):
  habilitar "Email enumeration protection" en Identity Platform, según indica
  el notebook del proyecto.
