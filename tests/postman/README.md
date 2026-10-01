# Colección Postman — NequiTrampa Wallet API

Equivalente de `tests/bruno/` para evaluadores que usan **Postman** en lugar del CLI de
Bruno. Mismos endpoints, mismas variables y mismos criteria de clasificación.

---

## ⚠️ Antes de ejecutar nada

> **NO pulses *Run Collection* contra GCP.**
>
> Esta colección contiene requests que **mueven saldo/dinero simulado persistido en
> Cloud Spanner**. El dinero del proyecto es **simulado**: lo que se persiste es el saldo
> y el ledger en Cloud Spanner, no dinero ni moneda real.
> *Run Collection* no respeta tags ni exclusiones: ejecuta los 45 requests, incluidos
> los `[MANUAL]` condicionales y los `[FREE-RUN]` que crean movimientos nuevos.
>
> **Ejecuta carpeta por carpeta** y deja fuera `Manual (condicional)` y
> `Free-run (movimiento nuevo)`.

> **Bruno sí puede excluir por tags; Postman no.** Si necesitas la suite completa
> automatizada con exclusión real, usa `tests/bruno/` con
> `bru run --env gcp --exclude-tags=manual,stateful`. Aquí la separación es por carpeta
> y por prefijo de nombre (`[MANUAL]`, `[FREE-RUN]`).

---

## 1. Importar

1. Abrir Postman → **Import**.
2. Arrastrar estos tres archivos (o *Link* / *Raw text*):
   - `NequiTrampa-Wallet.postman_collection.json` → la colección
   - `NequiTrampa-GCP.postman_environment.json` → entorno GCP
   - `NequiTrampa-Local.postman_environment.json` → entorno local (mocks)
3. Seleccionar el environment arriba a la derecha: **`GCP`** o **`Local`**.

---

## 2. Autenticación

| Capa | Mecanismo | Dónde |
|---|---|---|
| Cloud Run (privado) | IAM identity token en `X-Serverless-Authorization: Bearer <token>` | `serverlessToken` |
| Aplicación | `X-Demo-User` / `X-Demo-Role` (esquema demo, `Auth__DemoHeaders=true`) | `clientUser`, `clientRole` |

Generar el token de IAM:

```powershell
gcloud auth print-identity-token
```

> [!WARNING]
> `serverlessToken` y `bearerToken` están **vacíos** en todos los archivos versionados,
> en los dos entornos. Asigna el token **solo en la sesión de Postman** y nunca lo
> guardes en el archivo del environment: se versionaría una credencial.

En GCP, `clientUser2` debe ser una identidad **ajena** a la transacción (por ejemplo
`idp-sub-outsider`). Si fuera el receptor, el `403` esperado de
*Get Transfer Receipt Forbidden* no ocurriría.

---

## 3. Variables

Idénticas a `tests/bruno/environments/`. Documentadas en detalle en
[`tests/bruno/README.md`](../bruno/README.md) §2.

| Variable | GCP | Local |
|---|---|---|
| `baseUrl` | `https://nequi-wallet-7v3gdoy4ra-tl.a.run.app` | `http://localhost:8080` |
| `clientUser` | `idp-sub-alejandro` | `client-1` |
| `clientUser2` | `idp-sub-outsider` | `client-2` |
| `destCode` | `TRF-LAU-0002` | `TRF-LAU-0002` |
| `expectedSourceAuthority` | `CLOUD_SPANNER` | `MOCK_IN_MEMORY` |
| `transferDemoKey` | `nequitrampa-transfer-demo-v1` | igual |
| `rechargeDemoKey` | `nequitrampa-recharge-demo-v1` | igual |
| `knownTransferId` | *(vacío)* | *(vacío)* |
| `selfTransferCode` | `TRF-ALE-0001` ⚠️ | `TRF-ALE-0001` |
| `inactiveDestCode` | `TRF-INA-0003` ⚠️ | `TRF-INACTIVE-0000` |
| `insufficientAmount` | `1990000` | `1300000` |
| `dailyLimitAmount` | `2000000` | `2000000` |

### ⚠️ Fixtures no garantizados

`database/spanner/03_datos_prueba.sql` siembra `client-1`/`TRF-ALE-0001`,
`client-2`/`TRF-LAU-0002` y `client-3`/`TRF-INA-0003` (suspendido). **Ese seed no
describe la base GCP en vivo**, que se popula con otros `auth_subject`. Los valores
marcados con ⚠️ provienen del seed y **no están verificados contra GCP**: si el código no
existe allí, la respuesta será `404 RESOURCE_NOT_FOUND` en lugar del `422` de dominio.

Además, el backend `memory` **no implementa** la validación de destino inexistente ni la
de auto-transferencia: con un código arbitrario responde `201`.

`knownTransferId` está **vacío a propósito**: no se inventa ningún identificador. Copia
uno real de una corrida previa.

---

## 4. Clasificación: 45 requests

| Categoría | Requests | Assertions | Carpeta |
|---|---|---|---|
| **Automatizados** | 39 | Sí | `Health`, `Authorization`, `Wallet`, `Transfers`, `Recharges` |
| **Manuales condicionales** | 4 | **No** | `Manual (condicional)` |
| **Free-run (movimiento nuevo)** | 2 | Sí | `Free-run (movimiento nuevo)` |

### Orden dentro de `Transfers` y `Recharges`

Hay dependencias porque los requests comparten variables de colección:

**Transfers**
1. `Post Transfer Success` → fija `lastTransferId`
2. `Post Transfer Replay Same Key Same Body`
3. `Post Transfer Idempotency Conflict (same key, different body)`
4. `Get Transfer By Id`, `Get Transfer Receipt`, `Get Transfer Receipt Forbidden`

**Recharges**
1. `Post Recharge Success` → fija `lastRechargeId`
2. `Post Recharge Replay Same Key Same Body`
3. `Post Recharge Idempotency Conflict (same key, different body)`

Ejecuta la **carpeta completa**, no requests sueltos. Para lanzar solo los GET, rellena
`knownTransferId`: su script `pre-request` lo aplica como fallback de `lastTransferId`.

### Los 4 manuales condicionales

Sin assertions: el resultado depende del estado vivo y se interpreta a mano.

| Request | Esperado | Condición |
|---|---|---|
| `[MANUAL] Post Transfer Self` | `422 SELF_TRANSFER_NOT_ALLOWED` | `selfTransferCode` debe ser el código real del propio actor |
| `[MANUAL] Post Transfer Destination Inactive` | `422 DESTINATION_ACCOUNT_INACTIVE` | el destino debe existir con `status != ACTIVE` |
| `[MANUAL] Post Transfer Insufficient Funds` | `422 INSUFFICIENT_FUNDS` | el monto debe superar el saldo real |
| `[MANUAL] Post Transfer Daily Limit` | `422 LIMIT_EXCEEDED` | hay que encadenar transfers hasta cruzar $5.000.000 del día |

### Los 2 free-run

`[FREE-RUN] Post Transfer New Movement` y `[FREE-RUN] Post Recharge New Movement` usan
`{{$guid}}` como `Idempotency-Key`, de modo que **siempre** crean un movimiento nuevo,
nunca son replay y consumen cupo diario. Existen para provocar tráfico a demanda y
quedan fuera de la corrida por defecto.

> [!WARNING]
> **La corrida equivalente NO es estrictamente read-only.** En Bruno:
> `bru run --env gcp --exclude-tags=manual,stateful` ejecuta **39 requests** y excluye los
> **6** `manual`/`free-run`, pero entre los 39 hay dos que mueven saldo/dinero simulado
> persistido en Cloud Spanner: `Post Transfer Success` y `Post Recharge Success`.
>
> Si `transferDemoKey` / `rechargeDemoKey` **aún no se han usado** para tu actor, la
> primera ejecución **crea una transferencia y una recarga** en Spanner. Las ejecuciones
> siguientes con la **misma key y el mismo body** son **replay** (`201` +
> `Idempotent-Replayed: true`) y no vuelven a mover saldo. Para forzar una operación nueva,
> cambia la key en el environment.
>
> El resto de los 39 son lecturas (`GET`) o rechazos del DTO (`422`) y del filtro de
> idempotencia (`400`), y **no mueven saldo**. En Postman, ejecuta `Transfers` y
> `Recharges` **como carpetas completas y en orden**, nunca con *Run Collection*.

---

## 5. Idempotencia: no toques esos cuerpos

`Idempotency-Key` es obligatoria (1-64 chars) en todo POST mutante. El store compara el
**SHA-256 de los bytes crudos del body**:

- Misma key + **mismos** bytes → replay `201 Created` con `Idempotent-Replayed: true`.
- Misma key + bytes distintos → `409`, `code=idempotency_key_conflict`.

Las keys canónicas (`transferDemoKey`, `rechargeDemoKey`) están fijadas en el environment
para que la corrida sea repetible: **solo la primera corrida con una key nueva mueve
saldo/dinero simulado persistido en Cloud Spanner**; las siguientes reproducen la respuesta
guardada (replay). Si necesitas forzar una ejecución nueva, cambia la key en el environment.

> **No reformatees** el body de `Post Transfer/ Recharge Success` ni el de su `Replay`:
> cualquier espacio en blanco o salto de línea distinto cambia el hash y el replay se
> convierte en `409`.

Los requests de validación de DTO **nunca alcanzan Spanner**:
`InvalidModelStateResponseFactory` corta la petición antes que `IdempotencyActionFilter`,
así que no se crea ningún registro de idempotencia.

---

## 6. Errores

**No todos los errores son RFC 9457.** Hay tres familias distintas:

| Familia | Dónde se genera | Cuerpo | `code` |
|---|---|---|---|
| **Validación y dominio** | `InvalidModelStateResponseFactory` (DTO) y `WalletExceptionFilter` (`WalletDomainException`) | `application/problem+json` (RFC 9457) | Sí |
| **Idempotencia** | `IdempotencyActionFilter` | `application/problem+json` (RFC 9457) | Sí |
| **`401` por credenciales ausentes o inválidas** | Middleware de autenticación (`JwtBearer`) | **Sin Problem Details**; lo seguro para el cliente es el **status** | **No** |
| **`403` por rol** (`SOPORTE` sobre rutas `Policies.Client`) | Middleware de autorización | **Sin Problem Details**; lo seguro para el cliente es el **status** | **No** |
| **`403` por recurso** (tercero pidiendo el comprobante ajeno) | `WalletExceptionFilter`, que mapea `UnauthorizedAccessException` | `application/problem+json` (RFC 9457) | Sí → `FORBIDDEN` |

Motivo en el código: el `JwtBearerEvents` activo (`src/Nequi.Shared/Security/AuthExtensions.cs`)
solo define `OnTokenValidated`; **no** registra `OnChallenge` ni `OnForbidden`, así que los
`401` y los `403` por rol conservan el comportamiento por defecto del framework, sin cuerpo
Problem Details. Los handlers que sí devolvían Problem Details en esos casos están en
`src/backend/wallet-api/Security/SecurityExtensions.cs`, un duplicado **legacy fuera de la
solución**: nunca se compila ni se despliega y no describe el servicio real.

> Por eso `Get Me Access Unauthorized`, `Get Transfers Unauthorized`,
> `Get Recharges Unauthorized`, `Get Transfers Forbidden` y `Get Recharges Forbidden`
> asertan **solo el status**. Afirmar un `code` en ellos sería inventar el contrato.

Códigos que sí se pueden afirmar, porque los produce el `code` de Problem Details:

| Código | HTTP | Origen |
|---|---|---|
| `VALIDATION_ERROR` | 422 | DTO (`invalidParams` detalla el campo) |
| `idempotency_key_required` | 400 | filtro de idempotencia (ausente o >64 chars) |
| `idempotency_key_conflict` | 409 | misma key, body distinto |
| `RESOURCE_NOT_FOUND` | 404 | transferencia/recurso inexistente |
| `FORBIDDEN` | 403 | **autorización por recurso** (`WalletExceptionFilter`) |
| `SELF_TRANSFER_NOT_ALLOWED` | 422 | dominio (solo manual) |
| `DESTINATION_ACCOUNT_INACTIVE` | 422 | dominio (solo manual) |
| `INSUFFICIENT_FUNDS` | 422 | dominio (solo manual) |
| `LIMIT_EXCEEDED` | 422 | dominio (solo manual, acumulado diario) |

> El límite **individual** de $2.000.000 COP lo rechaza el DTO antes que el dominio, así
> que responde `422 VALIDATION_ERROR` y no `LIMIT_EXCEEDED`. Es una distinción
> deliberada y está documentada.

---

## 7. Alcance AS-IS

### 7.1 Evidencia HTTP directa de la corrida contra GCP

Lo que los asserts de la corrida **observan de verdad** sobre el endpoint desplegado. Es
evidencia de **nivel HTTP** contra Cloud Run con Spanner detrás:

- `GET /health/live` y `GET /health/ready` → `200`.
- `GET /v1/wallet` → `200` con `currency = COP`.
- `GET /v1/wallet/balance` → `200` con `sourceAuthority = CLOUD_SPANNER`. Esto **sí**
  demuestra que la lectura del saldo sale de Spanner y no de un mock.
- `POST /v1/transfers` → `201` con `status = COMPLETED`.
- `POST /v1/recharges` → `201` con `status = COMPLETED`.
- Replay de ambas operaciones → `201` con `Idempotent-Replayed: true`, lo que **sí**
  demuestra que la idempotencia persiste entre peticiones.
- Misma key con body distinto → `409` con `code = idempotency_key_conflict`.
- Body válido sin `Idempotency-Key` → `400` con `code = idempotency_key_required`.
- Monto superior a $2.000.000 COP → `422 VALIDATION_ERROR`. Lo rechaza el **DTO**, no la
  regla de dominio: el límite individual se observa, pero como validación de contrato.
- `GET /v1/transfers/{id}` inexistente → `404 RESOURCE_NOT_FOUND`.
- Comprobante de un tercero → `403` con `code = FORBIDDEN`.
- `401` sin credenciales y `403` por rol `SOPORTE` sobre rutas `Policies.Client` (solo
  status; ver §6).

### 7.2 Evidencia separada: E2E, código y documentación del proyecto

Lo siguiente **no lo observa esta suite** y no debe atribuirse a ella. Su evidencia es de
otra naturaleza: consulta directa a la base, pruebas end-to-end del proyecto, lectura del
código y de `ARCHITECTURE.md` / los README de servicio.

- **Partida doble en `ledger_entries` (`Σ Δ = 0`)**: propiedad del ledger en Spanner. Para
  comprobarla hay que consultar la tabla, no la API.
- **Transactional outbox** (`outbox_events` escrito en la *misma* transacción que mueve el
  saldo): propiedad de `SpannerTransferService` / `SpannerRechargeService`. Se verifica
  en la base y con el pipeline Pub/Sub → Firestore, no con un assert HTTP.
- **El saldo disminuye tras la transferencia y aumenta tras la recarga**: la API no expone
  un antes/después atómico y la corrida no lo comprueba.
- **Límite diario acumulado de $5.000.000 COP** (`daily_transfer_usage`): requiere encadenar
  transferencias; está en `[MANUAL] Post Transfer Daily Limit` y queda fuera de la corrida
  por defecto.
- **Consistencia del pipeline Spanner → Pub/Sub → Firestore**: es **eventual**;
  `published_at` en `outbox_events` solo certifica la publicación en el bus.

### 7.3 Limitación conocida, no resuelta

`CompleteAsync` no comparte transacción con el movimiento de saldo. Un fallo intermedio
puede dejar un *commit gap* en el que un retry con la misma `Idempotency-Key` vuelva a
ejecutar la operación. Documentado como limitación AS-IS; **esta suite no lo resuelve ni lo
mide**.

> **AS-IS vs TO-BE en autenticación.** Cloud Run permanece privado y se invoca con
> identity token de IAM; dentro de la app `Auth__DemoHeaders=true` simula la identidad
> del cliente. La arquitectura definitiva (Identity Platform, validación de JWT por
> claims en API Gateway, app con `Auth__DemoHeaders=false`) sigue **pendiente de
> validación formal** y no debe documentarse como terminada.
