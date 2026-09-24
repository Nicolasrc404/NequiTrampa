# Colección Bruno — NequiTrampa Wallet API
## Pruebas locales y GCP para `wallet-api` (Nequi.Wallet)

Esta colección valida los contratos HTTP del servicio `Nequi.Wallet` bajo **RFC 9457 (Problem Details)**, seguridad **RFC 8725 (JWT)** y reglas de negocio financieras.

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
> `Auth__DemoHeaders=true` habilita los headers `X-Demo-User` / `X-Demo-Role` para simular autenticación sin JWT real.
> `Data__Backend=memory` activa los servicios Mock (sin Spanner, sin Firestore).

---

## 2. Seleccionar el environment en Bruno (`local` o `gcp`)

### Environment `local`
1. Abre Bruno y carga esta colección (`tests/bruno/`).
2. En la esquina superior derecha selecciona el environment **`local`**.
3. El environment apunta a `http://localhost:8080` y define:
   - `clientUser` = `client-1`
   - `clientRole` = `CLIENTE`
   - `clientUser2` = `client-2` (para casos de acceso denegado)
   - `destCode` = `TRF-LAU-0002` (código destino en transferencias)
   - `expectedSourceAuthority` = `MOCK_IN_MEMORY`
   - `serverlessToken` = `local-noop`

### Environment `gcp` (AS-IS Verificado)
1. Apunta a la URL de Cloud Run del servicio `nequi-wallet` (privado).
2. Variables en `tests/bruno/environments/gcp.bru`:
   - `baseUrl` = URL de Cloud Run
   - `clientUser` = `idp-sub-alejandro`
   - `clientRole` = `CLIENTE`
   - `clientUser2` = `idp-sub-outsider` (cliente ajeno para probar 403 en comprobante ajeno)
   - `destCode` = `TRF-LAU-0002`
   - `expectedSourceAuthority` = `CLOUD_SPANNER`
   - `serverlessToken` = token de identidad de Cloud Run (debe permanecer vacío en el archivo versionado)

---

## 3. Cómo ejecutar la colección

### Ejecución en Local (CLI)
```bash
# Desde tests/bruno:
bru run --env local
# En Windows PowerShell si aplica:
bru.cmd run --env local
```

### Ejecución en GCP (Procedimiento Validado)
Debido a que Cloud Run es privado (`--no-allow-unauthenticated`), el acceso requiere un identity token de IAM en el encabezado `X-Serverless-Authorization`:

1. Generar token de identidad con gcloud:
   ```powershell
   gcloud auth print-identity-token
   ```
2. Asignar temporalmente el valor a `serverlessToken` en `tests/bruno/environments/gcp.bru` o en el entorno activo de la GUI de Bruno.
3. Ejecutar desde el directorio `tests/bruno`:
   ```bash
   bru run --env gcp
   # En Windows PowerShell:
   bru.cmd run --env gcp
   ```
4. **IMPORTANTE**: Volver a dejar `serverlessToken:` vacío en `tests/bruno/environments/gcp.bru` antes de hacer cualquier commit o push para evitar versionar credenciales.

> [!TIP]
> Si Bruno devuelve `Requests: 0`, asegúrate de estar ubicado exactamente en la raíz de la colección (`tests/bruno`).

### Ejecución individual en GUI
Abre cualquier archivo `.bru`, selecciona el environment (`local` o `gcp`) y haz click en **Run**. En GCP, asegúrate de tener configurado `serverlessToken` en la sesión de Bruno.

> **Orden recomendado para la carpeta `transfers/`:**
> 1. `post-transfer-success.bru` (genera `lastTransferId` y `transferIdempKey`)
> 2. `post-transfer-replay.bru` (debe compartir `replayIdempKey` con el conflict)
> 3. `post-transfer-idempotency-conflict.bru` (usa la misma `replayIdempKey`)
> 4. `post-transfer-limit-exceeded.bru`
> 5. `post-transfer-no-idempotency.bru`
> 6. `get-transfer-by-id.bru` (depende de `lastTransferId`)
> 7. `get-transfer-receipt.bru` (depende de `lastTransferId`)
> 8. `get-transfer-receipt-forbidden.bru` (depende de `lastTransferId`, probado con `idp-sub-outsider`)
> 9. `get-transfers.bru`

---

## 4. Casos cubiertos

### HEALTH
| Archivo | Endpoint | Esperado |
|---|---|---|
| `health/get-health-live.bru` | `GET /health/live` | `200 OK` |
| `health/get-health-ready.bru` | `GET /health/ready` | `200 OK` |

### AUTENTICACIÓN / AUTORIZACIÓN
| Archivo | Endpoint | Esperado |
|---|---|---|
| `authorization/get-wallet-unauthorized.bru` | `GET /v1/wallet` (sin auth) | `401 Unauthorized` |
| `authorization/get-wallet-forbidden.bru` | `GET /v1/wallet` (rol SOPORTE) | `403 Forbidden` |

### WALLET
| Archivo | Endpoint | Esperado |
|---|---|---|
| `wallet/get-wallet.bru` | `GET /v1/wallet` | `200 OK`, `currency=COP` |
| `wallet/get-balance.bru` | `GET /v1/wallet/balance` | `200 OK`, `sourceAuthority` según entorno (`MOCK_IN_MEMORY` local / `CLOUD_SPANNER` GCP) |

### TRANSFERENCIAS
| Archivo | Endpoint | Esperado |
|---|---|---|
| `transfers/post-transfer-success.bru` | `POST /v1/transfers` | `201 Created`, `status=COMPLETED` |
| `transfers/post-transfer-replay.bru` | `POST /v1/transfers` (mismo key+body) | `201`, header `Idempotent-Replayed: true` |
| `transfers/post-transfer-idempotency-conflict.bru` | `POST /v1/transfers` (mismo key, body diferente) | `409`, `code=idempotency_key_conflict` |
| `transfers/post-transfer-limit-exceeded.bru` | `POST /v1/transfers` (monto > $2.000.000) | `422`, `code=VALIDATION_ERROR` |
| `transfers/post-transfer-no-idempotency.bru` | `POST /v1/transfers` (sin Idempotency-Key) | `400`, `code=idempotency_key_required` |
| `transfers/get-transfer-by-id.bru` | `GET /v1/transfers/{id}` | `200 OK`, `status=COMPLETED` |
| `transfers/get-transfer-receipt.bru` | `GET /v1/transfers/{id}/receipt` | `200 OK`, `status=COMPLETED` |
| `transfers/get-transfer-receipt-forbidden.bru` | `GET /v1/transfers/{id}/receipt` (`idp-sub-outsider`) | `403`, `code=FORBIDDEN` |
| `transfers/get-transfers.bru` | `GET /v1/transfers?page=1&pageSize=20` | `200 OK` |

### RECARGAS
| Archivo | Endpoint | Esperado |
|---|---|---|
| `recharges/post-recharge-success.bru` | `POST /v1/recharges` | `201 Created`, `status=COMPLETED` |
| `recharges/post-recharge-no-idempotency.bru` | `POST /v1/recharges` (sin key) | `400`, `code=idempotency_key_required` |
| `recharges/get-recharges.bru` | `GET /v1/recharges` | `200 OK` |

---

## 5. Validación en GCP (AS-IS Verificado)

La suite de pruebas fue ejecutada de forma automatizada sobre Google Cloud Platform contra el servicio `nequi-wallet` desplegado en **Cloud Run** (`southamerica-west1`) con persistencia autoritativa en **Cloud Spanner** (`finanzas-core` en proyecto `full-stack-2026`).

### Resultado de Ejecución Verificado:
* **Requests:** `18/18 PASS`
* **Tests:** `2/2 PASS`
* **Assertions:** `34/34 PASS`
* **Exit code:** `0`

### Casos Validados en GCP:
- **`sourceAuthority = CLOUD_SPANNER`** en el balance oficial (`GET /v1/wallet/balance`).
- **Saldo persistente y real** tras recargas simuladas y transferencias entre cuentas activas.
- **Ledger contable real**: inserción inmutable de operaciones en `ledger_operations` y asientos balanceados por partida doble en `ledger_entries` ($\sum \Delta = 0$).
- **Límite diario acumulado real**: control de tope diario ($5.000.000 COP) y límite individual ($2.000.000 COP) con persistencia en `daily_transfer_usage`.
- **Idempotencia persistente**: validada en `idempotency_records`; reintento idéntico devuelve `201 Created` con encabezado `Idempotent-Replayed: true`, y reintento con payload incompatible devuelve `409 Conflict` (`code=idempotency_key_conflict`).
- **Transactional Outbox**: generación atómica de eventos en `outbox_events` por cada cliente afectado dentro de la transacción de Spanner.
- **Autorización por recurso**: se verificó con el usuario outsider `idp-sub-outsider` que no es posible consultar comprobantes de transferencias de terceros, devolviendo `403` (`code=FORBIDDEN`).
- **Sondas de salud**: `/health/live` y `/health/ready` respondiendo `200 OK` con dependencias activas.

---

## 6. Notas de Seguridad y Autenticación

> [!WARNING]
> **ESTADO DE LA AUTENTICACIÓN (AS-IS vs. TO-BE)**:
> - **AS-IS en Integración/Smoke Test**: El servicio Cloud Run permaneció privado (`--no-allow-unauthenticated`) y se invocó mediante IAM pasando un identity token en `X-Serverless-Authorization`. Dentro de la aplicación se habilitó temporalmente `Auth__DemoHeaders=true` (`X-Demo-User`, `X-Demo-Role`) exclusivamente para simular la identidad del cliente en pruebas de integración.
> - **TO-BE Pendiente de Validación Productiva**: La arquitectura de autenticación definitiva con **Google Cloud Identity Platform**, validación de JWT por claims en **API Gateway** y la aplicación corriendo con `Auth__DemoHeaders=false` permanece como **pendiente de validación productiva**. No debe documentarse como terminada hasta su prueba formal.

- **Prohibición de secretos**: La variable `serverlessToken` (y `bearerToken`) en `tests/bruno/environments/gcp.bru` debe permanecer vacía en el repositorio; nunca versiones tokens JWT (`eyJ...`) ni credenciales.
- **Codificación**: Los archivos `.bru` deben guardarse en formato UTF-8 sin BOM para evitar errores de parseo en Bruno CLI.
