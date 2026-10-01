# Colección Bruno — NequiTrampa Wallet API
## Pruebas locales y GCP para `wallet-api` (Nequi.Wallet)

Contratos HTTP de `Nequi.Wallet` bajo **RFC 9457 (Problem Details)** para los errores de
validación y dominio, seguridad **RFC 8725 (JWT)** y reglas de negocio financieras.
El dinero es **simulado**: lo que se persiste es el saldo y el ledger en Cloud Spanner.

> [!IMPORTANT]
> La colección tiene **45 requests** y **no todos son automatizados**. Los que dependen
> del estado vivo de GCP están marcados con los tags `manual` + `stateful` y quedan
> **fuera de la corrida por defecto**. Ver §5.

---

## 1. Levantar Nequi.Wallet localmente en Docker

```bash
# Desde la raíz del repositorio NequiTrampa:
docker build -f src/Nequi.Wallet/Dockerfile -t nequi-wallet:local .

docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e Data__Backend=memory \
  -e Auth__DemoHeaders=true \
  -e Gcp__ProjectId=local-dev \
  nequi-wallet:local
```

> El contenedor arranca en **http://localhost:8080**.
> `Auth__DemoHeaders=true` habilita `X-Demo-User` / `X-Demo-Role` para simular
> autenticación sin JWT real.
> `Data__Backend=memory` activa los servicios Mock (sin Spanner, sin Firestore).

---

## 2. Variables de entorno

Ambos environments están en `tests/bruno/environments/`.

### `local`
| Variable | Valor | Nota |
|---|---|---|
| `baseUrl` | `http://localhost:8080` | |
| `serverlessToken` | *(vacío)* | Nunca se versiona un token, ni siquiera local |
| `clientUser` | `client-1` | |
| `clientUser2` | `client-2` | Identidad ajena, para el 403 de comprobante |
| `destCode` | `TRF-LAU-0002` | |
| `expectedSourceAuthority` | `MOCK_IN_MEMORY` | |
| `transferDemoKey` | `nequitrampa-transfer-demo-v1` | 28 chars, dentro del límite de 64 |
| `rechargeDemoKey` | `nequitrampa-recharge-demo-v1` | |
| `knownTransferId` | *(vacío)* | Ver §6 |
| `selfTransferCode` | `TRF-ALE-0001` | Solo fixture; ver §7 |
| `inactiveDestCode` | `TRF-INACTIVE-0000` | Único código que el mock trata como inactivo |
| `insufficientAmount` | `1300000` | El mock tiene saldo fijo de $1.250.000 |
| `dailyLimitAmount` | `2000000` | |

### `gcp` (AS-IS verificado)
| Variable | Valor | Nota |
|---|---|---|
| `baseUrl` | `https://nequi-wallet-7v3gdoy4ra-tl.a.run.app` | Cloud Run **privado** |
| `bearerToken` | *(vacío)* | |
| `serverlessToken` | *(vacío)* | Rellenar en la sesión, nunca versionar |
| `clientUser` | `idp-sub-alejandro` | |
| `clientUser2` | `idp-sub-outsider` | Debe ser una identidad **ajena** a la transacción |
| `destCode` | `TRF-LAU-0002` | |
| `expectedSourceAuthority` | `CLOUD_SPANNER` | |
| `transferDemoKey` | `nequitrampa-transfer-demo-v1` | |
| `rechargeDemoKey` | `nequitrampa-recharge-demo-v1` | |
| `knownTransferId` | *(vacío)* | Ver §6 |
| `selfTransferCode` | `TRF-ALE-0001` | **No verificado en GCP**, ver §7 |
| `inactiveDestCode` | `TRF-INA-0003` | **No verificado en GCP**, ver §7 |
| `insufficientAmount` | `1990000` | Ajustar al saldo real, ver §7 |
| `dailyLimitAmount` | `2000000` | |

---

## 3. Cómo ejecutar

Hay que estar **exactamente** en la raíz de la colección (`tests/bruno`); si no, Bruno
devuelve `Requests: 0`. Nunca pasar la ruta como argumento posicional.

### Corrida por defecto (39 requests, excluye los 6 manuales)

```bash
cd tests/bruno
bru run --env local --exclude-tags=manual,stateful
bru run --env gcp   --exclude-tags=manual,stateful
```

> [!WARNING]
> **Esta corrida NO es estrictamente read-only.** Ejecuta 39 requests y excluye los 6
> `manual`/`stateful`, pero entre los 39 hay dos que mueven saldo/dinero simulado
> persistido en Cloud Spanner:
>
> - `transfers/post-transfer-success.bru`
> - `recharges/post-recharge-success.bru`
>
> Si `transferDemoKey` / `rechargeDemoKey` **aún no se han usado** para tu actor, la
> primera ejecución **crea una transferencia y una recarga persistentes** en Spanner.
>
> A partir de ahí, cada ejecución posterior con la **misma key y el mismo body** es un
> **replay**: devuelve la respuesta ya guardada con `201` y `Idempotent-Replayed: true`,
> y no vuelve a mover saldo. Para forzar una operación nueva, cambia la key en el
> environment.
>
> Todos los demás requests de esa corrida son lecturas (`GET`), rechazos del DTO
> (`422`) o rechazos del filtro de idempotencia (`400`), y **no mueven saldo**.

### Corrida de un subconjunto

```bash
bru run --env gcp --exclude-tags=manual,stateful --tags=smoke   # solo lo marcado smoke
```

### Solo los manuales (6 requests, todos stateful)

```bash
cd tests/bruno
bru run --env gcp --tags=manual
```

> En la **GUI** los tags no impiden pulsar *Run Collection*: el filtro por tags es
> exclusivo del CLI. Si vas a usar la GUI contra GCP, ejecuta carpeta por carpeta y deja
> fuera `manual/`, `post-transfer-free-run.bru` y `post-recharge-free-run.bru`.

### Procedimiento GCP validado

Cloud Run es privado (`--no-allow-unauthenticated`), así que el acceso exige un identity
token de IAM en `X-Serverless-Authorization`:

1. Generar el token:
   ```powershell
   gcloud auth print-identity-token
   ```
2. Asignarlo a `serverlessToken` **en la sesión activa de Bruno** (no en el archivo
   versionado).
3. Ejecutar con el comando de la corrida por defecto.
4. **Antes de commitear**, confirmar que `serverlessToken` y `bearerToken` siguen vacíos
   en `environments/gcp.bru`.

---

## 4. Orden de ejecución

`transfers/` y `recharges/` tienen dependencias de orden porque las requests comparten
variables de runtime.

### `transfers/`
1. `post-transfer-success.bru` → fija `lastTransferId`
2. `post-transfer-replay.bru` → misma key + mismo body que (1)
3. `post-transfer-idempotency-conflict.bru` → misma key, body distinto
4. `get-transfer-by-id.bru` → depende de `lastTransferId`
5. `get-transfer-receipt.bru` → depende de `lastTransferId`
6. `get-transfer-receipt-forbidden.bru` → depende de `lastTransferId`, con `clientUser2`

### `recharges/`
1. `post-recharge-success.bru` → fija `lastRechargeId`
2. `post-recharge-replay.bru` → misma key + mismo body que (1)
3. `post-recharge-idempotency-conflict.bru` → misma key, body distinto

---

## 5. Clasificación de los 45 requests

| Categoría | Requests | Assertions | Entra en la corrida por defecto |
|---|---|---|---|
| **Automatizados** | 39 | Sí | Sí |
| **Manuales condicionales** | 4 | **No** | No (`manual`, `stateful`) |
| **Free-run (movimiento nuevo)** | 2 | Sí | No (`manual`, `stateful`) |

### Los 39 automatizados

Solo se automatiza lo que es **determinista en los dos backends** (`memory` y `gcp`) y
no depende del saldo, del consumo del día ni de la existencia de un fixture concreto.

- **Health (2)**: `GET /health/live`, `GET /health/ready` → `200`.
- **Autorización (8)**: `401` sin identidad; `403` con rol `SOPORTE` sobre rutas que exigen
  `Policies.Client`; `/v1/me/access` devuelve el `uid` y los roles del actor.
- **Lectura (4)**: `GET /v1/wallet`, `/v1/wallet/balance`, `/v1/transfers`,
  `/v1/recharges`. El balance comprueba `sourceAuthority` contra
  `expectedSourceAuthority`.
- **Validación de DTO (10)**: `422 VALIDATION_ERROR` con el campo señalado en
  `invalidParams` (monto cero, monto negativo, moneda `USD`, destino ausente, destino
  malformado, recarga bajo mínimo, recarga sobre máximo, método de pago no soportado).
- **Idempotencia (5)**: key ausente con body válido → `400 idempotency_key_required`;
  key de 65 chars con body válido → `400`; body inválido **sin** key → `422`
  (prueba de que el filtro de ModelState corre antes que `IdempotencyActionFilter`);
  replay → `201` + `Idempotent-Replayed: true`; conflicto → `409`.
- **No encontrado (4)**: transferencia y comprobante inexistentes → `404
  RESOURCE_NOT_FOUND`; comprobante de tercero → `403 FORBIDDEN`.
- **Estado canónico (6)**: `post-transfer-success`, `post-transfer-replay`,
  `post-transfer-idempotency-conflict`, `post-recharge-success`,
  `post-recharge-replay` y `post-recharge-idempotency-conflict`. Usan keys estables
  (`transferDemoKey`, `rechargeDemoKey`), así que **solo la primera corrida con una key
  nueva mueve saldo/dinero simulado persistido en Cloud Spanner**; las siguientes reproducen el resultado guardado (replay).

> Los requests de validación DTO **nunca alcanzan Spanner**: `InvalidModelStateResponseFactory`
> corta la petición antes que `IdempotencyActionFilter`, así que no se crea ningún
> registro de idempotencia.

### Los 4 manuales condicionales (`manual/`)

Sin assertions: el resultado depende del estado vivo y se interpreta a mano.

| Request | Esperado | Por qué es condicional |
|---|---|---|
| `post-transfer-self` | `422 SELF_TRANSFER_NOT_ALLOWED` | Requiere que `selfTransferCode` sea el código real del propio actor |
| `post-transfer-destination-inactive` | `422 DESTINATION_ACCOUNT_INACTIVE` | Requiere que el destino exista con `status != ACTIVE` |
| `post-transfer-insufficient-funds` | `422 INSUFFICIENT_FUNDS` | Requiere que el monto supere el saldo real |
| `post-transfer-daily-limit` | `422 LIMIT_EXCEEDED` | Requiere encadenar transfers hasta cruzar $5.000.000 del día |

### Los 2 free-run (movimiento nuevo)

`post-transfer-free-run.bru` y `post-recharge-free-run.bru` generan una
`Idempotency-Key` UUID nueva en cada ejecución: **siempre** crean un movimiento nuevo,
consumen cupo diario y nunca son replay. Existen para que el evaluador pueda provocar
tráfico a demanda, y por diseño quedan fuera de la corrida por defecto.

---

## 6. `knownTransferId`

`get-transfer-by-id`, `get-transfer-receipt` y `get-transfer-receipt-forbidden` usan la
variable de runtime `lastTransferId`, que produce `post-transfer-success`. Para poder
ejecutarlos sueltos se puede rellenar `knownTransferId` en el environment: el
`script:pre-request` de esas tres requests lo aplica como fallback.

El valor está **vacío a propósito**: no se inventa ningún identificador. Hay que copiar
uno real devuelto por una corrida previa.

---

## 7. Fixtures: lo que el seed NO garantiza

`database/spanner/03_datos_prueba.sql` siembra `client-1`/`TRF-ALE-0001`,
`client-2`/`TRF-LAU-0002` y `client-3`/`TRF-INA-0003` (suspendido). **Ese seed no
describe la base GCP en vivo**, que se popula con otros `auth_subject`
(`idp-sub-alejandro`, `idp-sub-outsider`). Por eso los cuatro requests manuales llevan
valores por defecto derivados del seed marcados como **no verificados**: si el código no
existe en GCP, la respuesta será `404 RESOURCE_NOT_FOUND` en lugar del `422` de dominio.

Además, el backend `memory` **no implementa** la validación de destino inexistente ni la
de auto-transferencia: con un código arbitrario responde `201`. Por eso esos casos no
pueden automatizarse de forma honesta.

---

## 8. Notas de seguridad

> [!WARNING]
> **AS-IS vs TO-BE en autenticación**
> - **AS-IS (integración/smoke)**: Cloud Run privado (`--no-allow-unauthenticated`) +
>   identity token de IAM en `X-Serverless-Authorization`. Dentro de la app se habilitó
>   `Auth__DemoHeaders=true` (`X-Demo-User`, `X-Demo-Role`) solo para simular la
>   identidad del cliente en pruebas.
> - **TO-BE pendiente**: la arquitectura definitiva con Identity Platform, validación de
>   JWT por claims en API Gateway y la app corriendo con `Auth__DemoHeaders=false`. **No
>   documentar como terminada** hasta su prueba formal.

- **Prohibición de secretos**: `serverlessToken` y `bearerToken` deben quedar vacíos en
  todo archivo versionado. Nunca versionar tokens JWT (`eyJ...`).
- **Codificación**: los `.bru` van en **UTF-8 sin BOM**; el lexer de Bruno falla con BOM.
- **Deny-by-default**: toda ruta exige identidad por la `FallbackPolicy`. Solo
  `/internal/pubsub/*` y `/internal/outbox/drain` son `AllowAnonymous`, protegidos por
  IAM de Cloud Run y no por un JWT de usuario.

---

## 9. Contrato de errores: no todo es RFC 9457

**No todos los errores devuelven Problem Details.** Hay tres familias distintas y la
suite solo comprueba el status en las dos últimas.

| Familia | Dónde se genera | Cuerpo | `code` |
|---|---|---|---|
| **Validación y dominio** | `InvalidModelStateResponseFactory` (DTO) y `WalletExceptionFilter` (`WalletDomainException`) | `application/problem+json` (RFC 9457) | Sí |
| **Idempotencia** | `IdempotencyActionFilter` | `application/problem+json` (RFC 9457) | Sí |
| **`401` por credenciales ausentes o inválidas** | Middleware de autenticación (`JwtBearer`) | **Sin Problem Details**; lo seguro para el cliente es el **status** | **No** |
| **`403` por rol** (p. ej. `SOPORTE` sobre una ruta `Policies.Client`) | Middleware de autorización | **Sin Problem Details**; lo seguro para el cliente es el **status** | **No** |
| **`403` por recurso** (tercero pidiendo el comprobante ajeno) | `WalletExceptionFilter`, que mapea `UnauthorizedAccessException` | `application/problem+json` (RFC 9457) | Sí → `FORBIDDEN` |

Motivo en el código: el `JwtBearerEvents` activo (`src/Nequi.Shared/Security/AuthExtensions.cs`)
solo define `OnTokenValidated`; **no** registra `OnChallenge` ni `OnForbidden`, así que los
`401` y los `403` por rol conservan el comportamiento por defecto del framework, sin
cuerpo Problem Details. Los handlers que sí devolvían Problem Details en esos casos están
en `src/backend/wallet-api/Security/SecurityExtensions.cs`, un duplicado **legacy fuera de
la solución**: nunca se compila ni se despliega, y no describe el servicio real.

> Por eso los requests `*-unauthorized` y `*-forbidden` por rol de esta colección
> asertan **solo el status**: afirmar un `code` en ellos sería inventar el contrato.

Códigos que sí se pueden afirmar porque los produce el `code` de Problem Details:
`VALIDATION_ERROR` (422), `RESOURCE_NOT_FOUND` (404), `FORBIDDEN` (403 por recurso),
`idempotency_key_required` (400), `idempotency_key_conflict` (409).

---

## 10. Alcance AS-IS de la validación en GCP

### 10.1 Evidencia HTTP directa de la corrida Bruno en GCP

Lo que los asserts de la corrida **observan de verdad** sobre el endpoint desplegado. Todo
esto es evidencia de **nivel HTTP** contra Cloud Run con Spanner detrás:

- `GET /health/live` y `GET /health/ready` → `200`.
- `GET /v1/wallet` → `200` con `currency = COP`.
- `GET /v1/wallet/balance` → `200` con `sourceAuthority = CLOUD_SPANNER`. Esto **sí**
  demuestra que la lectura del saldo sale de Spanner y no de un mock.
- `POST /v1/transfers` → `201` con `status = COMPLETED`.
- `POST /v1/recharges` → `201` con `status = COMPLETED`.
- Replay de ambas operaciones → `201` con cabecera `Idempotent-Replayed: true`. Esto
  **sí** demuestra que la idempotencia persiste entre peticiones, en Spanner.
- Misma key con body distinto → `409` con `code = idempotency_key_conflict`.
- Body válido sin `Idempotency-Key` → `400` con `code = idempotency_key_required`.
- Monto superior a $2.000.000 COP → `422 VALIDATION_ERROR`. Lo rechaza el **DTO**, no la
  regla de dominio: el límite individual se observa, pero como validación de contrato.
- `GET /v1/transfers/{id}` inexistente → `404 RESOURCE_NOT_FOUND`.
- Comprobante de un tercero (`idp-sub-outsider`) → `403` con `code = FORBIDDEN`.
- `401` sin credenciales y `403` por rol `SOPORTE` sobre rutas `Policies.Client` (solo
  status; ver §9).

### 10.2 Evidencia separada: E2E, código y documentación del proyecto

Lo siguiente **no lo observa la suite Bruno** y no debe atribuirse a ella. Su evidencia es
de otra naturaleza (consulta directa a la base, pruebas end-to-end del proyecto, lectura
del código y de `ARCHITECTURE.md` / los README de servicio):

- **Partida doble en `ledger_entries` (`Σ Δ = 0`)**: propiedad del ledger en Spanner. Para
  comprobarla hay que consultar la tabla, no la API.
- **Transactional outbox** (`outbox_events` escrito en la *misma* transacción que mueve el
  saldo): propiedad de `SpannerTransferService` / `SpannerRechargeService`. Se verifica
  en la base y con el pipeline Pub/Sub → Firestore, no con un assert HTTP.
- **El saldo efectivamente disminuye tras la transferencia y aumenta tras la recarga**:
  la API no expone un antes/después atómico y la corrida no lo comprueba.
- **Límite diario acumulado de $5.000.000 COP** (`daily_transfer_usage`): requiere
  encadenar transferencias; está en `manual/post-transfer-daily-limit.bru` y queda fuera de
  la corrida por defecto.
- **Consistencia del pipeline Spanner → Pub/Sub → Firestore**: es **eventual**;
  `published_at` en `outbox_events` solo certifica la publicación en el bus.

### 10.3 Limitación conocida, no resuelta

`CompleteAsync` no comparte transacción con el movimiento de saldo. Un fallo intermedio
puede dejar un *commit gap* en el que un retry con la misma `Idempotency-Key` vuelva a
ejecutar la operación. Está documentado como limitación AS-IS y **esta suite no lo
resuelve ni lo mide**.
