# Guía para el front: cómo consumir la API

Todo el tráfico del front va a **un único host público: el API Gateway** (`nequi-gateway`, Cloud Run). Los 7 servicios de negocio
siguen **privados** (Cloud Run IAM); el gateway los invoca con su propia identidad. El navegador nunca habla con ellos directamente.

```
Navegador ──HTTPS + Bearer JWT──► nequi-gateway (público, CORS, rate limit)
                                     │  X-Serverless-Authorization: <identity token del gateway>
                                     ▼
        wallet · finance · profile · assistant · workers · backoffice · realtime   (privados)
```

**Base URL**: `https://nequi-gateway-7v3gdoy4ra-tl.a.run.app` (consúltala con `gcloud run services describe nequi-gateway --region southamerica-west1 --project full-stack-2026 --format 'value(status.url)'`).

## 1. Autenticación (Identity Platform / Firebase Auth)

El proyecto de Identity Platform es `full-stack-2026`. En el front usa el SDK de Firebase Auth (email + contraseña):

```js
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const app = initializeApp({ apiKey: "<WEB_API_KEY>", authDomain: "full-stack-2026.firebaseapp.com", projectId: "full-stack-2026" });
const { user } = await signInWithEmailAndPassword(getAuth(app), email, password);
const token = await user.getIdToken();          // se renueva solo; pídelo antes de cada llamada
await fetch(`${API}/v1/wallet`, { headers: { Authorization: `Bearer ${token}` } });
```

La `WEB_API_KEY` es pública (clave de navegador de Firebase): `gcloud services api-keys get-key-string <key>`.

El token lleva los claims que usa el backend:

| Claim | Contenido |
|---|---|
| `user_id` | uid de Identity Platform = `clients.auth_subject` (clientes) o `administrators.auth_subject` (staff) |
| `roles` | `["CLIENTE"]`, `["SOPORTE"]`, `["OPERADOR_FINANCIERO"]` o `["ADMIN"]` |
| `client_id` | solo clientes: el `client_id` de Spanner (lo usan Finance, Notificaciones y Proyecciones) |

Usuarios de prueba (`infra/seed-identity.sh`): `alejandro@demo.co`, `laura@demo.co`, `outsider@demo.co` (CLIENTE), `soporte@demo.co`, `operador@demo.co`, `admin@demo.co`.
La contraseña la define quien ejecuta el script (`SEED_PASSWORD`); no está en el repo.

Sin token válido → `401`. Rol insuficiente → `403`. El gateway **descarta** cualquier cabecera `X-Demo-*` y los servicios corren con `Auth__DemoHeaders=false`.

## 2. Convenciones

- Errores: `application/problem+json` (RFC 9457) con `code`, `title`, `detail`, `requestId`. Validación → `422 VALIDATION_ERROR`.
- Dinero: enteros en **centavos** (`amountCents`; 100 centavos = 1 COP). Los montos de entrada (`amount`) van en COP.
- **Idempotencia**: los `POST` financieros exigen `Idempotency-Key` (UUID, ≤ 64 chars). Reintentar con la misma llave devuelve el mismo resultado con `Idempotent-Replayed: true`; la misma llave con otro cuerpo → `409`.
- CORS: orígenes permitidos en `Cors__AllowedOrigins` del gateway (por defecto `localhost:3000/4200/5173`). Para tu dominio: `CORS_ORIGINS=https://app.ejemplo.com bash infra/deploy.sh gateway`.
- Límite: 600 req/min por IP; cuerpo máx. 1 MB.

## 3. Rutas disponibles por el gateway

| Prefijo | Servicio | Quién | Qué hace |
|---|---|---|---|
| `GET /v1/wallet`, `/v1/wallet/balance` | Wallet | CLIENTE | Billetera y saldo (fuente: Spanner) |
| `POST/GET /v1/transfers`, `/{id}`, `/{id}/receipt` | Wallet | CLIENTE | Transferencias y comprobante |
| `POST/GET /v1/recharges` | Wallet | CLIENTE | Recargas simuladas |
| `GET /v1/movements` | Finance | CLIENTE (propios) / staff con `?clientId=` | Movimientos (proyección Firestore) |
| `GET/PATCH /v1/profile` | Profile | CLIENTE | Perfil (zona horaria, alias) |
| `GET /v1/me/access` | todos | cualquiera | Uid y roles del token |
| `GET /v1/assistant/summary`, `POST /v1/assistant/chat` | Assistant | CLIENTE | Resumen y chat (Vertex AI, solo lectura) |
| `GET /v1/notifications`, `PATCH /v1/notifications/{id}/read` | Workers | CLIENTE | Notificaciones |
| `POST/GET /v1/reports`, `/{id}`, `/{id}/download` | Workers | CLIENTE/OPERADOR/ADMIN | Extractos CSV asíncronos |
| `/v1/support/**` | Backoffice | SOPORTE, OPERADOR, ADMIN | Casos e investigación de operaciones |
| `/v1/financial-operations/**`, `/v1/reversals/**`, `/v1/financial-adjustments/**`, `/v1/reconciliation/**` | Backoffice | OPERADOR_FINANCIERO | Reversos, ajustes y reconciliación |
| `/v1/admin/**` | Backoffice | ADMIN | Usuarios, roles, configuración, auditoría |
| `/ws`, `GET /v1/realtime/stats` | Realtime | CLIENTE / staff | WebSocket de refresco de UI |

No se exponen `/internal/**`, `/swagger` ni `/health` de los servicios (solo `/health/live` y `/health/ready` del gateway).

## 4. WebSocket (tiempo real)

El navegador no puede enviar `Authorization` en un WebSocket, así que el gateway acepta el JWT por query string:

```js
const ws = new WebSocket(`wss://nequi-gateway-7v3gdoy4ra-tl.a.run.app/ws?access_token=${token}`);
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);   // { type:"movement", eventType, operationId, amountCents, balanceAfterCents, occurredAt }
  // Solo refresca la UI: el saldo autoritativo sigue siendo GET /v1/wallet/balance
};
```

El socket solo recibe los eventos del propio cliente (clave = `client_id`). Reconecta con un token nuevo si expira.

## 5. Flujo de punta a punta (qué ocurre en una transferencia)

1. `POST /v1/transfers` → Wallet mueve el dinero en una transacción de **Spanner** (ledger + saldos + evento en `outbox_events`).
2. El `OutboxWorker` publica el evento en **Pub/Sub** (`wallet-events`).
3. Suscripciones push: **Workers** proyecta el movimiento y la notificación en **Firestore**; **Realtime** lo empuja por WebSocket.
4. El front lee `GET /v1/movements` / `GET /v1/notifications` (Firestore) y `GET /v1/wallet/balance` (Spanner).

## 6. Pruebas

`tests/bruno` (fuente de verdad) y `tests/postman` (generada con `generate_from_bruno.py`) ejecutan **este mismo camino**: gateway + JWT reales.
Ver los README de cada carpeta.
