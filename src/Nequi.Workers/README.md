# Nequi.Workers

Microservicio de **workers asíncronos** de la plataforma **NequiTrampa**.
Realiza el pipeline post-Spanner: drena el outbox, publica a Pub/Sub y
proyecta eventos de dominio a Firestore.

---

## Responsabilidades

- **Outbox**: pollear `outbox_events` en Spanner y publicar los eventos
  confirmados a Pub/Sub (patrón Transactional Outbox).
- **Proyección**: convertir eventos confirmados en read models de Firestore
  (`financial_movements`).
- **Notificación**: crear notificaciones en Firestore (`notifications`) y
  encolar envío push (FCM pendiente de device tokens).
- **Reportes**: generación asíncrona de reportes CSV desde la proyección de
  Firestore.

---

## Estado actual

- **Estado activo**: ✅ **AS-IS desplegado** en Cloud Run (`nequi-workers`,
  `southamerica-west1`, proyecto `full-stack-2026`).
- **E2E validado** (validado durante la integración GCP):

  ```
  Outbox → Pub/Sub → Push OIDC → Projection / Notification → Firestore
  ```

- `ReportWorker` / `ReportGenerator`: **implementados en código**, sin
  afirmar validación E2E en GCP.

> El resultado E2E del pipeline de proyecciones no se extiende a los módulos
> de Workers que no cuentan con evidencia específica.

> **Identidad (limitación AS-IS)**: `DomainEvent.ClientId` usa
> `clients.client_id` resuelto desde Spanner y Firestore lo persiste tal cual
> en `financial_movements`/`notifications`. `CurrentUser.Uid` representa
> `user_id`/`sub`/`auth_subject`, mientras que `CurrentUser.ClientId` puede
> contener el claim `client_id`. Los endpoints actuales de
> `ProjectionService`/`NotificationService` consultan/otorgan ownership por
> `user.Uid` y **no** resuelven automáticamente `auth_subject → client_id`. El
> mapping queda **pendiente**; mientras no exista, el acceso end-user a
> proyecciones financieras reales no debe declararse E2E validado. El smoke
> sintético usa `clientId=smoke-user` y `X-Demo-User=smoke-user`, por lo que no
> prueba esta diferencia.

---

## Componentes (verificados en código)

### Outbox

| Componente | Archivo | Descripción |
|---|---|---|
| `OutboxOptions` | `Outbox/OutboxWorker.cs` | `BatchSize` (50), `PollSeconds` (2), `Enabled`. |
| `OutboxDispatcher` | `Outbox/OutboxWorker.cs` | `DrainOnceAsync`: obtiene pendientes, publica y marca `published`; ante fallo invoca `MarkFailedAsync`. La política posterior depende del store: en Spanner permanece elegible para reintento hasta `MaxAttempts=10`; el store in-memory marca `FAILED` y deja de devolverlo como pendiente. |
| `OutboxWorker` | `Outbox/OutboxWorker.cs` | `BackgroundService`: bucle de poll con `Task.Delay` cuando no hay eventos. |
| `SpannerOutbox` / `SpannerOutboxStore` | `Outbox/SpannerOutbox.cs` | Store respaldado por `outbox_events` cuando `Spanner__Database` está configurada. Reintenta mientras el evento siga pendiente (`pending_since`); agotado `MaxAttempts=10`, `pending_since` pasa a `NULL` y el evento deja de entrar en el índice de pendientes (requiere investigación/intervención). |
| `InMemoryOutboxStore` | — | Store en memoria para modo `memory` (desarrollo local). |

La resolución es: `SpannerOutbox.Create(sp) ?? InMemoryOutboxStore`
(`Program.cs`).

### Proyecciones

`ProjectionService` (`Projection/ProjectionService.cs`) convierte el evento en
un documento de `financial_movements` con `document id = eventId`, por lo que
es **idempotente**: un duplicado se ignora (log únicamente).

### Notificaciones

`NotificationService` (`Notifications/NotificationService.cs`) crea un
documento en `notifications` (id = `eventId`) y delega el envío en
`IPushSender`. La única implementación es `LogPushSender`: FCM pendiente de
device tokens de la app móvil; hoy solo registra en logs (sin PII ni montos).

### Reportes

`ReportService.cs` (`Reports/ReportService.cs`):

- `ReportQueue`: cola interna (`Channel`) de `reportId` pendientes.
- `ReportGenerator`: lee la proyección `financial_movements`, genera CSV
  (con guard anti inyección de fórmulas) y guarda el resultado en
  `reports`.
- `ReportWorker`: `BackgroundService` que consume la cola.

---

## Endpoints

### Internos (push de Pub/Sub y operación)

Protegidos por **Cloud Run IAM** (`pubsub-push-invoker`, `roles/run.invoker`),
no por JWT de usuario.

| Método | Ruta | Uso |
|:---:|---|---|
| `POST` | `/internal/pubsub/projection` | Push de proyección (`ProjectionService`). Rechaza malformados con `202 Accepted` + log. |
| `POST` | `/internal/pubsub/notifications` | Push de notificación (`NotificationService`). |
| `POST` | `/internal/outbox/drain` | Drain manual / Cloud Scheduler (`OutboxDispatcher`). |
| `POST` | `/internal/dev/outbox` | Solo con `Auth__DemoHeaders=true`: inserta un evento en el outbox en memoria (smoke testing). |

### Con autorización

La política por defecto es *deny-by-default* (exige autenticación); los roles
se resuelven desde el claim `role`/`roles` de Identity Platform (o de los
headers demo en modo smoke test).

Todos los endpoints bajo `/v1/reports` heredan `Policies.CanGenerateReports`
(roles CLIENTE, OPERADOR_FINANCIERO y ADMIN). `ResourceAccess.CanRead` permite
al propietario o al staff, pero **SOPORTE queda fuera** de los endpoints de
reportes: la política del grupo lo excluye aunque `ResourceAccess.CanRead`
por sí solo lo dejaría leer.

| Método | Ruta | Autorización |
|:---:|---|---|
| `GET` | `/v1/outbox/stats` | `InternalStaff` (Soporte, OperadorFinanciero, Admin). |
| `GET` | `/v1/projections/movements` | Autenticado + `ResourceAccess.CanRead` (propietario **o staff**), ownership por `user.Uid`. |
| `GET` | `/v1/notifications` | Autenticado + ownership (`clientId == sub`) por `user.Uid`; sin resolución `auth_subject → client_id`. |
| `PATCH` | `/v1/notifications/{id}/read` | Autenticado + ownership; 404 para ajeno o inexistente. |
| `POST` | `/v1/reports` | `CanGenerateReports` + `ResourceAccess.CanRead` sobre el `clientId` objetivo + idempotencia (`RequireIdempotency`). |
| `GET` | `/v1/reports` | `CanGenerateReports`; devuelve solo reportes con `requestedBy == usuario`. |
| `GET` | `/v1/reports/{id}` | `CanGenerateReports` + `ResourceAccess.CanRead`. |
| `GET` | `/v1/reports/{id}/download` | `CanGenerateReports` + `ResourceAccess.CanRead`; CSV listo o `409 report_not_ready`. |

### Health checks

| Ruta | Comportamiento |
|---|---|
| `GET /health/live` | `200 OK` si el proceso responde. |
| `GET /health/ready` | `200 OK` si las dependencias registradas son saludables; si alguna falla devuelve `503`. En el despliegue GCP actual incluye **Spanner**, **Firestore** y **Pub/Sub** (el chequeo Pub/Sub verifica el topic `wallet-events`). |

---

## Modos de persistencia

| Modo | Elegido por | Comportamiento |
|---|---|---|
| **gcp** | `Data__Backend=gcp` | `PubSubEventPublisher` (Pub/Sub real) + `SpannerOutboxStore` (outbox_events). |
| **memory** | `Data__Backend=memory` (o no `gcp`) | `InMemoryEventPublisher` + `InMemoryOutboxStore`. Ideal para desarrollo local sin GCP. |

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|:---:|---|
| `PORT` | Puerto HTTP (inyectado por Cloud Run). | `8080` |
| `Data__Backend` | `gcp` o `memory`. | `gcp` |
| `Spanner__Database` | Recurso Spanner (via Secret Manager en Cloud Run). | `projects/full-stack-2026/instances/finanzas-mvp/databases/finanzas-core` |
| `Gcp__ProjectId` | Proyecto principal. | `full-stack-2026` |
| `Firestore__ProjectId` | Proyecto Firestore/Firebase. | `fullstack-d3be5` |
| `PubSub__OutboxTopic` | Topic de eventos (default `wallet-events`). | `wallet-events` |
| `Auth__DemoHeaders` | Habilita `X-Demo-User` / `X-Demo-Role` (solo smoke test). | `false` / `true` |

---

## Modelo de entrega

- **At-least-once**: un evento puede entregarse más de una vez.
- **Idempotencia en consumidores**: `ProjectionService` y `NotificationService`
  usan `document id = eventId` (inserción solo si no existe), por lo que los
  duplicados no generan efectos repetidos.
- **Límite de reintentos**: `SpannerOutboxStore` usa `MaxAttempts=10`;
  superado el máximo, el evento deja la cola de pendientes y queda para
  investigación. No se promete publicación eventual absoluta.

---

## Ejecución local

```powershell
$env:Data__Backend = "memory"
$env:Auth__DemoHeaders = "true"
dotnet run --project src/Nequi.Workers
```

En GCP se despliega con:

```bash
bash infra/setup.sh
AUTH_DEMO_HEADERS=true bash infra/deploy.sh workers
```

---

## Limitaciones

1. **FCM pendiente**: el envío push es *log-only* (`LogPushSender`) hasta que
   la app móvil registre device tokens.
2. **Reportes**: implementados en código; sin validación E2E documentada en GCP.
3. **Nequi.Realtime**: servicio separado (`src/Nequi.Realtime`); sin validación
   E2E ni despliegue verificado para esta guía.
4. **Identidad pendiente**: mapping `auth_subject → client_id` / uso consistente
   de `CurrentUser.ClientId`. Los endpoints consultan por `user.Uid`; el acceso
   end-user a proyecciones financieras reales no está E2E verificado.
