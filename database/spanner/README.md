# Cloud Spanner — Esquema `finanzas-core`

Documentación del esquema físico de **Google Cloud Spanner**, fuente de verdad
financiera y ledger autoritativo de **NequiTrampa**.

| Atributo | Valor |
|---|---|
| Proyecto | `full-stack-2026` |
| Instancia | `finanzas-mvp` |
| Base de datos | `finanzas-core` |
| Recurso | `projects/full-stack-2026/instances/finanzas-mvp/databases/finanzas-core` |
| Dialecto | GoogleSQL |
| Fuente del DDL | [`database/spanner/01_schema.sql`](01_schema.sql) |

---

## Regla de dinero

- Unidades menores enteras (`100 minor = 1 COP`).
- En Spanner el dinero se almacena como `NUMERIC` de precisión fija.
- Está estrictamente prohibido el uso de `float` o `double`.

---

## Las 7 tablas

### 1. `clients` — Clientes de la plataforma

Usuarios de negocio registrados.

| Campo | Notas |
|---|---|
| `client_id STRING(64)` | PK. |
| `auth_subject STRING(128)` | Sujeto de autenticación (clave única vía `idx_clients_auth_subject`). |
| `public_transfer_code STRING(32)` | Código público para transferencias (índice único). |
| `status STRING(16)` | Estado del cliente. El servicio exige `ACTIVE` para operar; los datos de prueba usan también `SUSPENDED` (y `BLOCKED` en cuentas). |
| `timezone STRING(64)` | Zona horaria (p. ej. `America/Bogota`). |

### 2. `wallet_accounts` — Cuentas de billetera

Cuentas de tipo `CLIENT_WALLET` (clientes) y `SYSTEM_FUNDING` (cuenta central
de fondeo del sistema).

| Campo | Notas |
|---|---|
| `account_id STRING(64)` | PK. |
| `client_id STRING(64)` | Propietario (NULL para `SYSTEM_FUNDING`). |
| `account_type STRING(32)` | `CLIENT_WALLET` / `SYSTEM_FUNDING`. |
| `currency STRING(3)` | Moneda de la cuenta. El DDL no la fija; el servicio financiero actual opera y valida `COP`. |
| `current_balance_minor NUMERIC` | Saldo vigente en unidades menores. |
| `status STRING(16)` | Estado de la cuenta. |
| `version INT64` | **Concurrencia optimista** (se incrementa en cada actualización). |

`idx_wallet_accounts_client_type` es `UNIQUE NULL_FILTERED`: garantiza
unicidad cuando `client_id` no es nulo. No garantiza por DDL la existencia de
una única cuenta `SYSTEM_FUNDING` con `client_id = NULL`.

### 3. `daily_transfer_usage` — Uso acumulado diario

Controla el límite diario de transferencias (hasta **$5.000.000 COP**).

| Campo | Notas |
|---|---|
| `client_id STRING(64)` | PK compuesta con `local_day`. |
| `local_day DATE` | Día local del cliente, calculado a partir de `clients.timezone`; `America/Bogota` es el fallback aplicado cuando `timezone` está ausente, no una zona rígida universal. |
| `outgoing_total_minor NUMERIC` | Acumulado saliente del día. |
| `operations_count INT64` | Conteo de operaciones del día. |
| `version INT64` | Concurrencia optimista. |

### 4. `ledger_operations` — Operaciones del ledger

Registro **tratado como inmutable por contrato/diseño de aplicación** de cada
operación monetaria (valores implementados: `INTERNAL_TRANSFER`,
`SIMULATED_RECHARGE`).

| Campo | Notas |
|---|---|
| `operation_id STRING(64)` | PK. |
| `public_reference STRING(32)` | Referencia pública (índice único). |
| `type STRING(32)` | Tipo de operación. |
| `status STRING(16)` | Estado de la operación. |
| `actor_id` / `actor_type` | Actor responsable. Valor de `actor_type` implementado actualmente: `CLIENT`. |
| `amount_minor NUMERIC` / `currency` | Monto y moneda. |
| `idempotency_key STRING(128)` | Clave de idempotencia (índice null-filtered). |
| `original_operation_id STRING(64)` | Apunta a la operación original (reversos/ajustes). |
| `reason STRING(256)` | Motivo. |

### 5. `ledger_entries` — Asientos de partida doble

Asientos contables balanceados, interleaved con `ledger_operations`:

```
PRIMARY KEY (operation_id, entry_no)
INTERLEAVE IN PARENT ledger_operations ON DELETE NO ACTION
```

| Campo | Notas |
|---|---|
| `entry_no INT64` | Orden del asiento dentro de la operación. |
| `account_id STRING(64)` | Cuenta afectada. |
| `delta_minor NUMERIC` | Delta firmado (débito negativo, crédito positivo). |
| `balance_before_minor` / `balance_after_minor` | Saldo antes/después del asiento. |

Invariante de partida doble: la suma algebraica de los deltas por operación
es exactamente cero ($\sum \Delta_i = 0$).

> Nota exacta de DDL verificada: `ON DELETE NO ACTION` bloquea los borrados de
> una operación padre mientras tenga asientos hijos.

### 6. `idempotency_records` — Control de idempotencia HTTP

Clave, hash del payload, estado y respuesta serializada del control de
idempotencia perimetral.

```
PRIMARY KEY (actor_id, scope, idempotency_key)
```

| Campo | Notas |
|---|---|
| `request_hash STRING(128)` | Hash criptográfico del cuerpo. |
| `status STRING(16)` | Estado: `IN_PROGRESS` o `COMPLETED`. El store además reconoce `FAILED` para reiniciar el ciclo; `AbandonAsync` elimina el registro `IN_PROGRESS` (no persiste un estado "abandonada"). |
| `http_status INT64` / `response_body JSON` | Respuesta almacenada para replay. |

> **Limitación AS-IS (commit gap)**: la idempotencia se gestiona con
> `IdempotencyActionFilter` sobre este registro, **fuera** de la transacción del
> movimiento financiero. `BeginAsync` reserva `IN_PROGRESS`, el movimiento se
> confirma en su propia transacción y después `CompleteAsync` marca `COMPLETED`
> en otra (no comparte transacción con el movimiento). Si el movimiento ya hizo
> commit y `CompleteAsync` falla, el catch puede ejecutar `AbandonAsync` y
> eliminar el registro `IN_PROGRESS`, dejando una ventana en la que un retry con
> la misma clave podría volver a ejecutar el movimiento. El replay idéntico y el
> conflicto de payload están validados por Bruno; no existe garantía atómica
> end-to-end entre el efecto financiero y el `COMPLETED`.

### 7. `outbox_events` — Transactional Outbox

Eventos de dominio confirmados junto al ledger para publicación asíncrona por
`OutboxWorker` (patrón Transactional Outbox).

| Campo | Notas |
|---|---|
| `event_id STRING(64)` | PK. |
| `aggregate_id` / `aggregate_type` | Origen del evento. |
| `event_type STRING(32)` | Tipo de evento de dominio. |
| `payload JSON` | Contrato del evento (por ejemplo `clientId`, `amountCents`,
`currency`; opcionalmente `operationId`, `occurredAt`,
`counterpartyClientId`, `description`, `balanceAfterCents`). |
| `published_at TIMESTAMP` | Momento de publicación (nulo = pendiente). |
| `pending_since TIMESTAMP` | Índice `idx_outbox_events_pending` para el poll. |
| `attempts INT64` / `last_error` | Reintentos y último error. |

---

## Invariantes financieros

- **Saldo de cuenta de cliente no negativo**: en `CLIENT_WALLET`,
  `current_balance_minor >= 0` es validado por el servicio financiero; saldo
  insuficiente aborta la operación.
- **`SYSTEM_FUNDING` admite sobregiro (AS-IS)**: el comportamiento actual
  permite saldo negativo en la cuenta central de fondeo; el dataset histórico
  de integración contiene saldo negativo.
- **El DDL por sí solo no impone `CHECK current_balance_minor >= 0`**: la
  restricción es responsabilidad del servicio, no del esquema.
- **Dinero en unidades menores** con `NUMERIC` de precisión fija; nunca
  `float`/`double`.
- **Límites**: hasta $2.000.000 COP por operación y $5.000.000 COP
  acumulados por día local (`America/Bogota`).
- **Partida doble**: $\sum \Delta_i = 0$ por operación en `ledger_entries`.

---

## Inmutabilidad del ledger

- El ledger es **inmutable por contrato/diseño de aplicación**: la API no
  expone endpoints de edición ni eliminación sobre operaciones completadas
  (no existe `DELETE /v1/transfers/{id}` ni edición de saldos).
- Cualquier corrección se realiza mediante transacciones compensatorias
  formales (`REVERSAL` o `ADMIN_ADJUSTMENT`) que referencian la operación
  original (`original_operation_id`).
- El DDL por sí mismo no impide operaciones administrativas de
  `UPDATE`/`DELETE` sobre el ledger; la inmutabilidad es un compromiso del
  diseño de aplicación.
- Como refuerzo estructural del DDL, `ledger_entries` usa
  `INTERLEAVE IN PARENT ledger_operations ON DELETE NO ACTION`, de modo que
  `ledger_operations` no puede eliminarse mientras tenga asientos hijos.

---

## Archivos del directorio

| Archivo | Contenido |
|---|---|
| `01_schema.sql` | DDL canónico: las 7 tablas e índices. |
| `02_opcional_fk_autoreferencia.sql` | FKs opcionales (autoreferencia de `ledger_operations`, FKs hacia `clients`/`wallet_accounts`). Ejecutar después de `01_schema.sql`. |
| `03_datos_prueba.sql` | Datos sintéticos de prueba. |
| `README.md` | Este documento. |
