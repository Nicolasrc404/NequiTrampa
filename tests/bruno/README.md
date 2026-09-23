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

## 2. Seleccionar el environment `local` en Bruno

1. Abre Bruno y carga esta colección (`tests/bruno/`).
2. En la esquina superior derecha selecciona el environment **`local`**.
3. El environment apunta a `http://localhost:8080` y define las variables:
   - `clientUser` = `client-1`
   - `clientRole` = `CLIENTE`
   - `clientUser2` = `client-2` (para casos de acceso denegado)
   - `destCode` = `TRF-LAU-0002` (código destino en transferencias)

---

## 3. Cómo ejecutar la colección

### Ejecución individual
Abre cualquier archivo `.bru`, selecciona el environment `local` y haz click en **Run**.

### Ejecución completa (CLI)
```bash
# Desde tests/bruno:
bru.cmd run --env local
```

> **Orden recomendado para la carpeta `transfers/`:**
> 1. `post-transfer-success.bru` (genera `lastTransferId` y `transferIdempKey`)
> 2. `post-transfer-replay.bru` (debe compartir `replayIdempKey` con el conflict)
> 3. `post-transfer-idempotency-conflict.bru` (usa la misma `replayIdempKey`)
> 4. `post-transfer-limit-exceeded.bru`
> 5. `post-transfer-no-idempotency.bru`
> 6. `get-transfer-by-id.bru` (depende de `lastTransferId`)
> 7. `get-transfer-receipt.bru` (depende de `lastTransferId`)
> 8. `get-transfer-receipt-forbidden.bru` (depende de `lastTransferId`)
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
| `wallet/get-balance.bru` | `GET /v1/wallet/balance` | `200 OK`, `sourceAuthority=MOCK_IN_MEMORY` |

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
| `transfers/get-transfer-receipt-forbidden.bru` | `GET /v1/transfers/{id}/receipt` (otro cliente) | `403`, `code=FORBIDDEN` |
| `transfers/get-transfers.bru` | `GET /v1/transfers?page=1&pageSize=20` | `200 OK` |

### RECARGAS
| Archivo | Endpoint | Esperado |
|---|---|---|
| `recharges/post-recharge-success.bru` | `POST /v1/recharges` | `201 Created`, `status=COMPLETED` |
| `recharges/post-recharge-no-idempotency.bru` | `POST /v1/recharges` (sin key) | `400`, `code=idempotency_key_required` |
| `recharges/get-recharges.bru` | `GET /v1/recharges` | `200 OK` |

---

## 5. Pruebas GCP pendientes (bloqueadas por Spanner)

Los siguientes casos requieren `Data__Backend=gcp` con acceso real a Cloud Spanner y el environment `gcp` configurado con la URL del servicio Cloud Run:

- **`sourceAuthority = CLOUD_SPANNER`** en balance (actualmente `MOCK_IN_MEMORY`)
- **Saldo persistente y real** tras transferencias y recargas (el mock usa saldo fijo de $1.250.000)
- **Límite diario acumulado real** ($5.000.000 COP) con persistencia en Spanner (`daily_transfer_usage`)
- **Destino inactivo** via `TRF-INACTIVE-0000` con validación contra Spanner (`status != ACTIVE`)
- **`/health/ready`** con check de Spanner y Firestore en `Healthy`
- **Ledger real**: verificación de entradas en `ledger_operations` y `ledger_entries`
- **Outbox**: eventos en `outbox_events` publicados a Pub/Sub

### Cómo configurar el environment `gcp`
Una vez desplegado el servicio en Cloud Run:
1. Obtén la URL: `gcloud run services describe nequi-wallet --region <REGION> --format 'value(status.url)'`
2. Actualiza `tests/bruno/environments/gcp.bru` → campo `baseUrl` con la URL real.
3. Obtén un token JWT de Identity Platform y colócalo en `bearerToken`.
4. Selecciona el environment `gcp` en Bruno y ejecuta la colección.

> **Ningún token ni secreto real debe versionarse en el repositorio.**

---

## Notas de seguridad

- Las variables `bearerToken` en `gcp.bru` deben dejarse vacías en el repo y configurarse localmente en Bruno.
- El header `X-Demo-User` / `X-Demo-Role` solo funciona cuando `Auth__DemoHeaders=true` (nunca en producción con acceso público).
- En Cloud Run el servicio es `--no-allow-unauthenticated`; el token de Identity Platform es obligatorio.
