# Nequi.Wallet

Microservicio transaccional financiero de la plataforma **NequiTrampa** (`wallet-api` conceptual). Es la autoridad financiera del dinero digital simulado en pesos colombianos (**COP**).

---

## Responsabilidad

`Nequi.Wallet` custodia y gobierna las operaciones monetarias del sistema:
- Gestión de cuentas de billetera digital y consulta de saldo oficial.
- Procesamiento de transferencias internas entre clientes registrados.
- Procesamiento de recargas simuladas fondeadas desde la cuenta central del sistema.
- Contabilidad de partida doble (*Double-Entry Ledger*).
- Control de saldo no negativo en cuentas de cliente (`CLIENT_WALLET`) y límites acumulados diarios.
- Idempotencia HTTP perimetral coordinada con persistencia en base de datos.
- Registro transaccional de eventos de dominio mediante el patrón **Transactional Outbox**.

---

## Estado actual

* **Estado**: ✅ **AS-IS Verificado en Google Cloud Platform**.
* **Despliegue**: Desplegado en **Cloud Run** (`southamerica-west1`) bajo el servicio privado `nequi-wallet`.
* **Persistencia**: Respaldado por **Google Cloud Spanner** (instancia `finanzas-mvp`, base de datos `finanzas-core` en proyecto `full-stack-2026`).
* **Validación**: Validado funcionalmente contra el servicio desplegado en GCP mediante Bruno (18/18 requests PASS, 2/2 tests PASS, 34/34 assertions PASS, exit code: 0).

---

## Modos de persistencia

El servicio soporta dos modos de persistencia seleccionables mediante configuración:

### `memory` (Desarrollo y pruebas locales)
* Se activa configurando `Data__Backend=memory` (además es el valor predeterminado actual en `appsettings.json`).
* Registra los servicios en memoria:
  * `MockWalletService`
  * `MockTransferService`
  * `MockRechargeService`
* Permite arrancar y probar el servicio localmente sin requerir conexión a GCP ni credenciales activas.

### `gcp` (Autoritativo en Google Cloud Spanner)
* Se activa configurando `Data__Backend=gcp`.
* Requiere la configuración `Spanner__Database` apuntando al recurso de Spanner.
* Registra las implementaciones autoritativas reales:
  * `SpannerWalletService`
  * `SpannerTransferService`
  * `SpannerRechargeService`
* Todas las mutaciones monetarias se ejecutan como transacciones ACID serializables con TrueTime en Cloud Spanner.

---

## Endpoints

Los endpoints de dominio responden bajo la semántica REST y utilizan el estándar **RFC 9457 (Problem Details)** para la gestión de errores (`application/problem+json`). Los health endpoints exponen su propio formato JSON de reporte de salud.

| Método | Ruta | Rol Requerido | Descripción |
|:---:|---|:---:|---|
| `GET` | `/v1/wallet` | `CLIENTE` | Consulta la información general de la billetera del cliente autenticado. |
| `GET` | `/v1/wallet/balance` | `CLIENTE` | Consulta el saldo oficial autoritativo (`sourceAuthority = CLOUD_SPANNER` o `MOCK_IN_MEMORY`). |
| `POST` | `/v1/transfers` | `CLIENTE` | Crea y procesa una transferencia de dinero simulado. Requiere `Idempotency-Key`. |
| `GET` | `/v1/transfers` | `CLIENTE` | Lista el historial paginado de transferencias del cliente autenticado (`page`, `pageSize`). |
| `GET` | `/v1/transfers/{id}` | `CLIENTE` | Consulta el detalle de una transferencia propia. |
| `GET` | `/v1/transfers/{id}/receipt` | `CLIENTE` | Emite y consulta el comprobante digital de una transferencia (emisor o receptor). |
| `POST` | `/v1/recharges` | `CLIENTE` | Acredita saldo simulado fondeado desde la cuenta central del sistema. Requiere `Idempotency-Key`. |
| `GET` | `/v1/recharges` | `CLIENTE` | Lista el historial paginado de recargas del cliente autenticado. |
| `GET` | `/health/live` | Anónimo | Sonda de vida (*liveness probe*) de ASP.NET Core (`200 OK`). |
| `GET` | `/health/ready` | Anónimo | Sonda de preparación que valida las dependencias registradas (`200 OK` si saludables, `503 Service Unavailable` si alguna falla; en GCP incluye Spanner y Firestore). |

---

## Cloud Spanner

En modo `gcp`, `Nequi.Wallet` interactúa con las siguientes tablas físicas definidas en [database/spanner/01_schema.sql](../../database/spanner/01_schema.sql):

1. **`clients`**: Valida que emisor y receptor existan y se encuentren en estado `ACTIVE`. Mapea el `auth_subject` hacia `client_id` y valida el `public_transfer_code`.
2. **`wallet_accounts`**: Cuentas de billetera (`CLIENT_WALLET` y cuenta del sistema `SYSTEM_FUNDING`). Almacena `current_balance_minor` y versionamiento optimista (`version INT64`).
3. **`daily_transfer_usage`**: Controla y actualiza atómicamente el acumulado diario de transferencias salientes por cliente y fecha local (`America/Bogota`).
4. **`ledger_operations`**: Registro inmutable de cada operación monetaria (valores implementados: `INTERNAL_TRANSFER`, `SIMULATED_RECHARGE`), asociando `idempotency_key`, montos y actor.
5. **`ledger_entries`**: Asientos contables por partida doble (`INTERLEAVE IN PARENT ledger_operations`) con `delta_minor`, `balance_before_minor` y `balance_after_minor`.
6. **`idempotency_records`**: Registro de control de idempotencia gestionado por el store de idempotencia, con clave, hash del payload, estado y respuesta serializada.
7. **`outbox_events`**: Eventos de dominio generados transaccionalmente para publicación asíncrona hacia Pub/Sub.

---

## Modelo financiero

* **Moneda única**: Pesos colombianos (**COP**). Cualquier otra moneda es rechazada.
* **Representación de dinero**: Unidades menores enteras (100 unidades = 1 COP). En Spanner se utiliza `NUMERIC` de precisión fija. En C# se manipula mediante `decimal` y centavos enteros `long AmountCents`. Está estrictamente prohibido el uso de `float` o `double`.
* **Invariante de saldo no negativo (acotado)**: en `CLIENT_WALLET`,
  `current_balance_minor >= 0` es validado por el servicio financiero; la
  transacción aborta inmediatamente si el saldo es insuficiente (`422
  Unprocessable Content`). La cuenta `SYSTEM_FUNDING` admite sobregiro en el
  AS-IS y el DDL no impone un `CHECK` global `current_balance_minor >= 0`.
* **Límites de transferencia**:
  * Tope por operación individual: Hasta $2.000.000 COP.
  * Tope acumulado diario por cliente: Hasta $5.000.000 COP (calculado en fecha local de Colombia).

---

## Transferencias

El procesamiento de una transferencia se desacopla rigurosamente en dos capas:

### A. Capa de Idempotencia HTTP (`IdempotencyActionFilter` / `SpannerIdempotencyStore`)
Antes de invocar el controlador:
1. El filtro intercepta la solicitud y valida la presencia del encabezado `Idempotency-Key`.
2. Calcula el hash criptográfico del cuerpo de la petición.
3. Invoca `BeginAsync` sobre `IIdempotencyStore` (`SpannerIdempotencyStore` en modo GCP, operando sobre `idempotency_records`):
   - Si la clave ya fue completada con el mismo hash: retorna la respuesta previa en caché con encabezado `Idempotent-Replayed: true` (sin ejecutar el servicio ni mover saldos).
   - Si la clave existe pero con un hash diferente: interrumpe el flujo y responde inmediatamente `409 Conflict` (`code=idempotency_key_conflict`).
   - Si la clave está en progreso concurrente: responde `409 Conflict` por operación concurrente.
   - Si es una clave nueva: registra el estado en progreso y cede el control a la acción.
4. Tras la ejecución exitosa de la acción, invoca `CompleteAsync` para almacenar el status HTTP y el cuerpo de respuesta en `idempotency_records`. Si ocurre un error no controlado, invoca `AbandonAsync`.

### B. Capa de Dominio Financiero (`SpannerTransferService`)
El servicio recibe la clave ya validada y ejecuta una transacción atómica ACID independiente en Cloud Spanner:
1. Resuelve el cliente emisor desde `clients` por `auth_subject` y comprueba que esté `ACTIVE`.
2. Resuelve el cliente receptor por su código público (`public_transfer_code`) y comprueba que esté `ACTIVE`.
3. Valida que el monto cumpla: `monto > 0` y `monto <= $2.000.000 COP`.
4. Consulta y actualiza atómicamente `daily_transfer_usage`, validando que el acumulado no supere $5.000.000 COP.
5. Valida que la cuenta de billetera origen tenga fondos suficientes (`current_balance_minor - amount_minor >= 0`).
6. Aplica débito a la cuenta origen y crédito a la cuenta destino en `wallet_accounts`, incrementando sus versiones.
7. Inserta la operación en `ledger_operations` (con tipo `INTERNAL_TRANSFER` y registrando el `idempotency_key`) junto a dos asientos balanceados en `ledger_entries` (débito negativo y crédito positivo, $\sum \Delta = 0$).
8. Inserta en `outbox_events` dos eventos de dominio independientes (uno para el emisor con delta negativo y otro para el receptor con delta positivo).
9. Confirma la transacción en Spanner (`COMMIT`).

---

## Recargas

De forma análoga a transferencias, la idempotencia HTTP se gestiona perimetralmente con `IdempotencyActionFilter`. Posteriormente, `SpannerRechargeService` ejecuta la transacción en Spanner:
1. Acreditación de saldo a la cuenta `CLIENT_WALLET` del cliente solicitante.
2. Débito de la cuenta de fondeo central del sistema (`acc_system_funding_cop` de tipo `SYSTEM_FUNDING`).
3. Creación de registros en `ledger_operations` (tipo `SIMULATED_RECHARGE`) y asientos en `ledger_entries` balanceados ($\sum \Delta = 0$).
4. Inserción del evento `RECHARGE_COMPLETED` en `outbox_events`.
5. Confirmación de la transacción (`COMMIT`).

---

## Ledger

* **Partida doble estricta**: Toda operación que mueva saldo digital genera asientos en `ledger_entries` donde la sumatoria algebraica de los deltas es exactamente cero:
  $$\sum_{i} \Delta_i = 0$$
* **Inmutabilidad por contrato/diseño de aplicación**: La API no expone endpoints de edición ni eliminación sobre operaciones completadas. No existen `DELETE /v1/transfers/{id}` ni `PATCH /v1/wallet/{id}/balance`.
* **Correcciones**: Cualquier corrección futura se realizará mediante transacciones compensatorias formales (`REVERSAL` o `ADMIN_ADJUSTMENT`).

---

## Idempotencia

* Toda operación mutante (`POST /v1/transfers`, `POST /v1/recharges`) exige el encabezado `Idempotency-Key` (cadena no vacía de 1 a 64 caracteres). Se recomienda el uso de UUID v4 como convención estándar de cliente.
* Si falta el encabezado, el servicio responde `400 Bad Request` (`code=idempotency_key_required`).
* En modo Spanner, el estado se persiste en `idempotency_records`:
  * **Reintento idéntico**: Retorna la respuesta guardada con HTTP `201 Created` y encabezado `Idempotent-Replayed: true`.
  * **Conflicto de clave**: Retorna HTTP `409 Conflict` (`code=idempotency_key_conflict`).

---

## Transactional Outbox

Para garantizar la consistencia eventual entre Cloud Spanner y el plano NoSQL de Cloud Firestore sin transacciones distribuidas bidireccionales:
1. El microservicio `Nequi.Wallet` inserta el evento de dominio en la tabla física `outbox_events` dentro de la **misma transacción atómica de Spanner** que mueve el dinero.
2. El evento queda persistido atómicamente junto con el movimiento financiero, permitiendo que `OutboxWorker` lo reintente hasta su publicación.
3. La entrega es *at-least-once* y puede producir duplicados que los consumidores (como `ProjectionService`) deben tolerar mediante lógica idempotente basada en `eventId`.

---

## Autorización

* **Autenticación en código**: El servicio cuenta con soporte implementado para tokens JWT de Google Cloud Identity Platform (RFC 8725).
* **RBAC**: Política de autorización `Client` (`RequireCliente`), garantizando que solo usuarios con rol `CLIENTE` puedan operar su billetera.
* **Resource-Based Authorization**:
  * Un cliente solo puede consultar su propia billetera y saldo (`sub == wallet.clientId`).
  * En transferencias, solo el cliente emisor o el cliente receptor pueden consultar el detalle o el recibo (`origin == sub || dest == sub`). Consultar una transferencia ajena devuelve `403 Forbidden` (`code=FORBIDDEN`).
* **Validación actual en GCP vs. TO-BE Productivo**:
  * La validación funcional en GCP se ejecutó manteniendo Cloud Run privado bajo IAM (`X-Serverless-Authorization`) y habilitando temporalmente `Auth__DemoHeaders=true` (`X-Demo-User`, `X-Demo-Role`) para pruebas de integración de dominio.
  * La arquitectura productiva con Google Cloud Identity Platform y API Gateway en el borde perimetral (con `Auth__DemoHeaders=false`) permanece como **TO-BE**, pendiente de validación productiva.

---

## Variables de entorno

| Variable | Tipo | Descripción | Ejemplo / Valor |
|---|:---:|---|---|
| `PORT` | string | Puerto HTTP de escucha (inyectado por Cloud Run). | `8080` |
| `Data__Backend` | string | Selector de persistencia: `gcp` (Spanner) o `memory` (Mocks). | `gcp` |
| `Spanner__Database` | string | Identificador canónico del recurso Spanner en GCP. | `projects/full-stack-2026/instances/finanzas-mvp/databases/finanzas-core` |
| `Gcp__ProjectId` | string | ID del proyecto principal de GCP. | `full-stack-2026` |
| `Firestore__ProjectId` | string | ID del proyecto GCP/Firebase donde reside Firestore. | `fullstack-d3be5` |
| `Auth__DemoHeaders` | boolean | Habilita headers `X-Demo-User` / `X-Demo-Role` para smoke testing. | `false` (producción) / `true` (integración) |

En Cloud Run, `Spanner__Database` se inyecta de forma segura a través de **Google Secret Manager** (`nequi-spanner-database`).

---

## Health checks

* **`/health/live`**: Devuelve `200 OK` si el proceso web de ASP.NET Core está respondiendo solicitudes.
* **`/health/ready`**: Sonda de preparación que valida las dependencias registradas (`200 OK` si saludables, `503 Service Unavailable` si alguna falla; en el despliegue GCP actual incluye Cloud Spanner y Firestore).

---

## Ejecución local

### Opción 1: Con `dotnet run` (Modo memoria)
```powershell
$env:Data__Backend = "memory"
$env:Auth__DemoHeaders = "true"
dotnet run --project src/Nequi.Wallet
```

### Opción 2: Con Docker
```bash
docker build -f src/Nequi.Wallet/Dockerfile -t nequi-wallet:local .
docker run --rm -p 8080:8080 -e PORT=8080 -e Data__Backend=memory -e Auth__DemoHeaders=true nequi-wallet:local
```

---

## Ejecución en GCP

Despliegue automatizado a través de los scripts de infraestructura:
```bash
# Despliegue con Cloud Build hacia Cloud Run:
bash infra/deploy.sh wallet
```
El servicio corre en Cloud Run bajo la service account dedicada `wallet-service@full-stack-2026.iam.gserviceaccount.com`, con permisos `roles/spanner.databaseUser` y acceso de lectura al secreto `nequi-spanner-database`.

---

## Pruebas Bruno

La suite completa de pruebas HTTP está disponible en `tests/bruno/`. Se ejecutó contra el servicio desplegado en GCP obteniendo:
* **Requests:** `18/18 PASS`
* **Tests:** `2/2 PASS`
* **Assertions:** `34/34 PASS`
* **Exit code:** `0`

Para reproducir la ejecución contra GCP:
```bash
cd tests/bruno
bru.cmd run --env gcp
```
*(Asignando previamente el identity token en `serverlessToken` según las instrucciones de [tests/bruno/README.md](../../tests/bruno/README.md))*.

---

## Limitaciones y pendientes

1. **Autenticación perimetral definitiva (TO-BE)**: Integración final de Google Cloud Identity Platform y API Gateway en el borde, con validación formal de JWT por claims y desactivación permanente de `Auth__DemoHeaders`.
2. **Beneficiarios**: El subdominio de beneficiarios (`/v1/beneficiaries`) se encuentra definido conceptualmente pero no implementado en este servicio.
3. **Límites dinámicos**: Los límites actuales son fijos de dominio ($2.000.000 COP por operación y $5.000.000 COP diario). La parametrización dinámica por perfil de riesgo queda como trabajo futuro.
