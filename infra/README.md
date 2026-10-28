# Infraestructura (scripts de automatización)

Guía del directorio `infra/`, que contiene los scripts de aprovisionamiento y
despliegue de **NequiTrampa** en Google Cloud Platform.

> **Advertencia**: estos scripts crean y modifican recursos GCP reales
> (billing asociado al proyecto). Revíselos antes de ejecutarlos en
> producción.

---

## Propósito

Automatizar, de forma reproducible:

1. Habilitación de APIs de proyecto.
2. Creación/reutilización de recursos (Artifact Registry, Pub/Sub, Firestore,
   Secret Manager, SA).
3. Build con Cloud Build y despliegue a Cloud Run.
4. Instalación de suscripciones push OIDC de Pub/Sub.
5. Prueba de humo post-despliegue.

---

## Multi-proyecto

| Proyecto | Rol | Usado por |
|---|---|---|
| `full-stack-2026` | Plano transaccional (compute): Cloud Run, Spanner, Pub/Sub, AR, Secret Manager | `setup.sh`, `deploy.sh` |
| `fullstack-d3be5` | Plano documental: Firestore | `setup.sh` (creación de Firestore) |

Definidos en `common.sh` como `PROJECT_ID` y `FIRESTORE_PROJECT_ID`
(override por variable de entorno). Si se hace override de `PROJECT_ID`
(respecto de `full-stack-2026`), `FIRESTORE_PROJECT_ID` **debe** especificarse
también: en caso contrario `common.sh` falla con `exit 1` para evitar aplicar
IAM cross-project sobre el Firestore histórico.

---

## Scripts

### `common.sh`

Variables compartidas y utilidades:

| Variable | Default |
|---|---|
| `PROJECT_ID` | `full-stack-2026` |
| `FIRESTORE_PROJECT_ID` | `fullstack-d3be5` |
| `REGION` | `southamerica-west1` |
| `AR_REPO` | `servicios` |
| `TOPIC` | `wallet-events` |
| `DLQ_TOPIC` | `wallet-events-dlq` |
| `SPANNER_DATABASE` | `projects/full-stack-2026/instances/finanzas-mvp/databases/finanzas-core` |
| SA | `outbox-dispatcher`, `realtime-service`, `pubsub-push-invoker`, `wallet-service` |

Incluye `sa_email()` y el helper `exists()` (idempotencia).

### `setup.sh`

Diseñado para **habilitar APIs y crear/reutilizar recursos de forma
idempotente** (`PROJECT_ID=my-proj FIRESTORE_PROJECT_ID=my-proj-firestore REGION=us-central1 ./infra/setup.sh`).
Pasos:

1. **APIs**: habilita `run`, `cloudbuild`, `artifactregistry`, `pubsub`,
   `firestore`, `secretmanager`, `spanner`, `logging`, `monitoring`,
   `cloudscheduler`, `identitytoolkit`.
2. **Artifact Registry**: crea `servicios` si no existe.
3. **Service Accounts** (crea solo las que faltan), con los roles que el
   script asigna:

   | SA | Roles IAM |
   |---|---|
   | `outbox-dispatcher` | `spanner.databaseUser`, `pubsub.publisher` (proyecto), `pubsub.viewer` sobre `wallet-events`, `secretmanager.secretAccessor`, `logging.logWriter`, `monitoring.metricWriter`, y `datastore.user` en `fullstack-d3be5` |
   | `realtime-service` | `logging.logWriter`, `monitoring.metricWriter` |
   | `wallet-service` | `spanner.databaseUser`, `secretmanager.secretAccessor`, `logging.logWriter`, `monitoring.metricWriter`, y `datastore.viewer` en `fullstack-d3be5` |
   | `pubsub-push-invoker` | Creada aquí; el rol `roles/run.invoker` se otorga en `deploy.sh` |

   `roles/datastore.user` de `outbox-dispatcher` se otorga en `FIRESTORE_PROJECT_ID`
   (`fullstack-d3be5`), no en `PROJECT_ID`. `wallet-service` recibe únicamente
   `roles/datastore.viewer` (su readiness solo lee `_health/ping`).

   Service Accounts dedicadas y roles IAM configurados por `setup.sh`: estos
   bindings son los que el script aplica; no implica una garantía global de
   mínimo privilegio sobre todo el IAM del proyecto.

4. **Pub/Sub**: crea topics `wallet-events` y `wallet-events-dlq`; otorga a
   `outbox-dispatcher` `roles/pubsub.viewer` sobre `wallet-events` (sin subir
   el permiso a nivel de proyecto); al agente de servicio de Pub/Sub el rol
   `roles/pubsub.publisher` sobre el DLQ y `roles/iam.serviceAccountTokenCreator`
   sobre `pubsub-push-invoker` (habilita el push OIDC).
5. **Firestore**: habilita `firestore.googleapis.com` en `fullstack-d3be5` y
   crea la base `(default)` en modo nativo si no existe; otorga
   `roles/datastore.user` a `outbox-dispatcher` y `roles/datastore.viewer` a
   `wallet-service` en `fullstack-d3be5` (no en `PROJECT_ID`).
6. **Secret Manager**: crea `nequi-spanner-database` con el identificador del
   recurso Spanner (proveniente de `SPANNER_DATABASE` de `common.sh`) y
   otorga `secretAccessor` a `outbox-dispatcher` y `wallet-service`.
7. **Observabilidad**: métrica de logging `nequi_http_5xx`.

> Spanner: `setup.sh` **no crea** la instancia ni la base de datos. Solo
> habilita `spanner.googleapis.com`; los recursos `finanzas-mvp` /
> `finanzas-core` deben existir previamente o ser provisionados por otro
> procedimiento.

> Se documenta su comportamiento previsto; no configuración/provisioning
> validado desde cero en cada ejecución.

### `deploy.sh`

Construye y despliega (`PROJECT_ID=my-proj FIRESTORE_PROJECT_ID=my-proj-firestore ./infra/deploy.sh [wallet|workers|realtime|all]`):

- `build <dir> <imagen>`: `gcloud builds submit` con `infra/cloudbuild.yaml`
  y substitutions `_SERVICE` / `_IMAGE`.
- `deploy_wallet`: Cloud Run `nequi-wallet`, SA `wallet-service`,
  `--no-allow-unauthenticated`, `Data__Backend=gcp`, secreto
  `Spanner__Database`.
- `deploy_workers`: Cloud Run `nequi-workers`, SA `outbox-dispatcher`, CPU
  siempre asignado + `--min-instances 1` (drenaje de outbox en background),
  `--no-cpu-throttling`.
- `deploy_realtime`: Cloud Run `nequi-realtime`, SA `realtime-service`,
  `--max-instances 1` + session affinity (estado en memoria). Configuración
  presente en infraestructura; sin validación E2E.
- `subscribe <nombre> <servicio> <ruta>`: otorga `roles/run.invoker` a
  `pubsub-push-invoker` y crea/actualiza la suscripción push con
  `--push-auth-service-account`, `--push-auth-token-audience`, DLQ y retry
  (`max-delivery-attempts 5`, `min-retry-delay 5s`, `max-retry-delay 60s`).

Suscripciones **configuradas por `deploy.sh`**:

| Suscripción | Frente a | Ruta | Estado |
|---|---|---|---|
| `workers-projection` | `nequi-workers` | `/internal/pubsub/projection` | Verificada |
| `workers-notifications` | `nequi-workers` | `/internal/pubsub/notifications` | Verificada |
| `realtime-push` | `nequi-realtime` | `/internal/pubsub/realtime` | Definida por infraestructura; no verificada como despliegue E2E |

### `cloudbuild.yaml`

Definición del build:
`docker build --build-arg SERVICE=${_SERVICE} -t ${_IMAGE} .` y publica la
imagen en Artifact Registry.

### `smoke-test.sh`

Inspección **sintética** post-despliegue (requiere
`AUTH_DEMO_HEADERS=true` en el despliegue):

- Publica un `DomainEvent` **directamente** en `wallet-events`.
- Llama endpoints de `nequi-workers` (`/health/live`, `/health/ready`,
  movimientos, notificaciones, `/v1/me/access`, reportes, `401` sin usuario) y
  **muestra las respuestas**.

> No contiene assertions exhaustivas de status/contenido ni polling robusto (cruza
> un sleep fijo); su exit code por sí solo no certifica que todas las
> verificaciones hayan pasado. Debe tratarse como smoke/inspección operativa. La
> evidencia automatizada del núcleo financiero es la suite **Bruno** y las
> comprobaciones explícitas.
> No valida `Wallet → Spanner → Outbox`: el evento se inyecta en Pub/Sub, no
> proviene de una transacción financiera real. Su alcance es Workers /
> Firestore / APIs.

---

## Seguridad

- **Secretos**: no se almacenan credenciales en el repositorio; los scripts
  referencian secretos por nombre vía Secret Manager. El valor de
  `nequi-spanner-database` es un **identificador de recurso** (no una
  credencial) y también aparece en `common.sh` y en la documentación.
- **Credenciales locales**: usar ADC (`gcloud auth application-default
  login`); no se suben `.env` ni archivos con tokens/JWT al repositorio.
- **Cloud Run privado**: los servicios no permiten invocaciones no
  autenticadas (`--no-allow-unauthenticated`); los endpoints internos quedan
  protegidos por IAM (OIDC de Pub/Sub).
- `Auth__DemoHeaders` solo se activa para smoke testing; nunca en producción.

---

## Orden típico de uso

```bash
bash infra/setup.sh                          # APIs + recursos (idempotente)
AUTH_DEMO_HEADERS=true bash infra/deploy.sh wallet   # núcleo AS-IS: Wallet
AUTH_DEMO_HEADERS=true bash infra/deploy.sh workers  # núcleo AS-IS: Workers (+ push subs)
bash infra/smoke-test.sh                     # humo sintético post-despliegue
```

> `deploy.sh all` incluye además `Nequi.Realtime`, cuyo despliegue/E2E no
> forma parte del alcance verificado actual.
