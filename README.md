# NequiTrampa

**MVP de una billetera financiera digital** construido como proyecto académico full stack.
Es un clon educativo inspirado en aplicaciones tipo Nequi: permite registrar clientes,
manejar un saldo digital, hacer transferencias y recargas simuladas, llevar el control de
gastos en efectivo, presupuestos y categorías, y consultar todo mediante un asistente de
IA y comandos de voz.


---

## El fin del proyecto

Demostrar, sobre un dominio donde los errores se notan —el dinero—, que se entienden las
responsabilidades de cada tecnología en lugar de elegir una sola para todo:

- **SQL (Spanner)** protege la identidad estructurada y la contabilidad crítica.
- **NoSQL (Firestore)** modela la actividad financiera dinámica que consulta el usuario.
- **SQLite** resuelve el modo offline en el dispositivo.
- **Pub/Sub y WebSocket** distribuyen los cambios sin convertirse nunca en fuente de verdad.
- **Identity Platform** protege el acceso.
- **La IA y la voz quedan deliberadamente fuera de la frontera de autorización financiera.**

La regla que ordena todo el diseño: **la autoridad del dinero es una sola operación SQL en
Spanner.** Todo lo demás es proyección, caché o interfaz.

---

## Tecnologías

### Frontend
| Tecnología | Uso |
|---|---|
| React Native + Expo | App móvil (UI de cliente y de administrador) |
| SQLite | Caché offline: saldo, movimientos, categorías, presupuestos, cola de efectivo |
| SecureStore | Sesión y token |

### Backend
| Tecnología | Uso |
|---|---|
| ASP.NET Core (.NET 10.0 / C#) | Microservicios de dominio y workers asíncronos |
| Cloud Run | Ejecución de contenedores, HTTPS y WebSockets |
| API Gateway | Entrada única de APIs y validación de JWT (TO-BE) |
| REST | Contrato público HTTP/REST; sin SOAP, GraphQL ni gRPC público. Errores mediante RFC 9457 Problem Details. |

### Datos
| Tecnología | Uso |
|---|---|
| Cloud Spanner (GoogleSQL) | Clientes, admins, billeteras, ledger, límites, idempotencia, outbox |
| Firestore | Movimientos visibles, categorías, presupuestos, efectivo, auditoría |
| SQLite | Solo dispositivo, nunca autoridad del saldo |

### Plataforma Google Cloud
`Identity Platform` (email+password + TOTP) · `Pub/Sub` · `Secret Manager` ·
`Cloud Logging` · `Cloud Monitoring` · `Cloud Scheduler` · `Speech-to-Text` ·
`Vertex AI / Gemini` · `Artifact Registry` · `Cloud Build`

**Descartados a propósito:** MongoDB Atlas, Bigtable, AlloyDB, Cloud SQL, GKE, Apigee,
Cloud Functions, BigQuery/Dataflow, Memorystore y Cloud Storage para audio. Cada uno
duplicaría una responsabilidad ya cubierta o sería sobrearquitectura para un MVP de tres
personas.

---

## Arquitectura

```
        APP MÓVIL (React Native / Expo)
        SQLite + SecureStore
                 │
        Identity Platform ──► JWT
                 │
           API Gateway
                 │
   ┌─────────────┼──────────────┐
   ▼             ▼              ▼
PROFILE       WALLET         FINANCE
   │             │              │
SPANNER       SPANNER       FIRESTORE
clientes      billetera     movimientos
admins        ledger        categorías
              límites       presupuestos
              idempotencia  efectivo
              outbox        auditoría
                 │
              PUB/SUB
                 │
       ┌─────────┴──────────┐
       ▼                    ▼
 FINANCE PROJECTION    REALTIME ──► WebSocket ──► Móvil

 ASSISTANT ──► Speech-to-Text + Vertex AI  (SOLO lectura)
 ADMIN     ──► Profile · Wallet · Finance  (auditoría obligatoria)
```

### Servicios Funcionales y Agrupación de Despliegue Físico

> **Evolución Arquitectónica (ANTERIOR vs. VIGENTE)**:
> Para un equipo pequeño y optimización de recursos en Cloud Run, los dominios funcionales no se despliegan como 30 microservicios ni como 6 contenedores aislados que aumenten la latencia de red. Se agrupan modularmente en **4 APIs de Cloud Run** y **1 conjunto de workers asíncronos**:

| Unidad Cloud Run | Dominios que Contiene | Persistencia Principal |
|---|---|---|
| `core-api` | Profile, Access, Movements, Cash, Categories, Budgets, Goals, Analytics, Sync | Firestore / Spanner / SQLite sync |
| `wallet-api` | Wallet, Transfers, Recharges, Beneficiaries | Cloud Spanner (Autoridad) |
| `backoffice-api` | Support, Investigation, Financial Operations, Reversals, Adjustments, Reconciliation, Users, Roles, Config, Audit | Spanner / Firestore |
| `assistant-api` | Assistant (IA Consultiva), Voice (Speech-to-Text) | Solo lectura (Vertex AI / STT) |
| `workers` | Outbox Worker, Projection Worker, Notification Worker | Pub/Sub / Cloud Run Jobs |


---

## Reglas del dominio

Estas reglas no son opcionales: definen qué es el proyecto.

- **Partida doble.** Toda operación cumple `Σ delta = 0` en `ledger_entries`.
- **Saldo no negativo en cuentas de cliente.** `current_balance >= 0` lo valida
  el servicio financiero para `CLIENT_WALLET`; la cuenta `SYSTEM_FUNDING` admite
  sobregiro en el AS-IS y el DDL no impone `CHECK current_balance >= 0`.
- **Dinero en centavos.** Enteros en todas las capas; `decimal` en C#, `NUMERIC` en
  Spanner, `int64` en Firestore. Nunca `float` ni `double`.
- **COP es constante de dominio.** Cualquier otra moneda se rechaza.
- **Idempotencia obligatoria** en transferencias, recargas, efectivo, sincronización y
  reversos. Reusar una `Idempotency-Key` con distinto cuerpo devuelve `409`.
- **Límites:** $2.000.000 por transferencia, $5.000.000 acumulados por día local
  (`America/Bogota`).
- **No hay DELETE financiero.** No existen `DELETE /movements/{id}`,
  `PATCH /movements/{id}/amount` ni `PATCH /wallet/balance`. Una corrección es un
  movimiento compensatorio (`REVERSAL` o `ADMIN_ADJUSTMENT`) con actor, motivo y auditoría.
- **El administrador no puede escribir un saldo.** Solo puede generar compensaciones.
- **Outbox transaccional.** El evento se escribe en la misma transacción que el
  movimiento de dinero, así que si Pub/Sub falla no se pierde el movimiento.
- **Reconciliación periódica** entre saldo materializado y suma del ledger. Si la
  diferencia no es cero se abre un `reconciliation_issue` — nunca se corrige el saldo en
  silencio.

### La IA no puede tocar el dinero

Tres capas independientes lo impiden:

1. **Prompt** — se le instruye no ejecutar operaciones.
2. **Herramientas** — solo se declaran funciones `GET`; `transfer_money` no existe.
3. **IAM** — la service account de `assistant-service` no tiene permiso de escritura en
   ninguna base.

El asistente responde "¿cuánto gasté este mes?" y rechaza "transfiere $50.000 a Laura" y
cualquier recomendación de inversión. El modelo tampoco puede inventar categorías: recibe
un enum cerrado de `categoryId` y el backend revalida contra Firestore.

### Modo offline

| Permitido sin Internet | Prohibido sin Internet |
|---|---|
| Ver saldo cacheado, movimientos, categorías, presupuestos | Transferencias |
| Registrar gasto o ingreso de **efectivo** (queda en `cash_sync_queue`) | Recargas |
| | Reversos y cambios críticos |

El estado financiero (`COMPLETED`) y el de sincronización (`LOCAL_PENDING`) son campos
distintos: que un gasto ya haya ocurrido en la vida real no significa que ya esté en la nube.

---

## Estado actual

El proyecto superó la fase puramente mock y cuenta con persistencia financiera autoritativa y pipeline asíncrono validados en **Google Cloud Platform**. Para máxima transparencia arquitectónica, el repositorio clasifica sus componentes en tres estados:

### 1. Clasificación de Estado de Componentes

| Componente | Estado | Detalle y Persistencia |
|---|:---:|---|
| **Arquitectura y Reglas Financieras** | ✅ AS-IS Verificado | Congeladas y validadas contra principios contables y RFCs |
| **Esquema Spanner (`finanzas-core`)** | ✅ AS-IS Verificado | DDL en [database/spanner/01_schema.sql](database/spanner/01_schema.sql) (7 tablas: `clients`, `wallet_accounts`, `daily_transfer_usage`, `ledger_operations`, `ledger_entries`, `idempotency_records`, `outbox_events`) |
| **Infraestructura Core (`full-stack-2026`)** | ✅ AS-IS Verificado | Cloud Run (`nequi-wallet`, `nequi-workers`), Spanner, Pub/Sub con DLQ, Secret Manager, Artifact Registry y Service Accounts dedicadas |
| **Persistencia NoSQL (`fullstack-d3be5`)** | ✅ AS-IS Verificado | Firestore Nativo `(default)`, colecciones `financial_movements` y `notifications` proyectadas desde eventos de dominio |
| **`Nequi.Wallet` (wallet-api)** | ✅ AS-IS Verificado | Soporte dual: Spanner autoritativo (`Data__Backend=gcp`) y Mocks (`Data__Backend=memory`). Validado en Cloud Run con Bruno (18/18 PASS) |
| **`Nequi.Workers` (Outbox / Proyecciones)** | ✅ AS-IS Verificado | Pipeline E2E validado: Spanner Outbox → `OutboxWorker` → Pub/Sub → Push OIDC → `ProjectionService` / `NotificationService` → Firestore |
| **`Nequi.Realtime` (WebSockets)** | 🟡 Implementado (No validado E2E) | Proyecto en `src/Nequi.Realtime`; sin validación end-to-end con clientes |
| **`Nequi.Profile` / `Nequi.Finance` / `Nequi.Backoffice`** | 🟡 Implementado (Parcial) | Estructura de proyectos y contratos HTTP en `src/`; pendiente cierre funcional completo contra Spanner/Firestore |
| **Autenticación Identity Platform + API Gateway** | ⚪ TO-BE (Pendiente) | Cloud Run validado privadamente vía IAM (`X-Serverless-Authorization`) y `Auth__DemoHeaders=true` para integración; JWT perimetral productivo pendiente |
| **App Móvil (React Native / Expo + SQLite)** | ⚪ TO-BE (Pendiente) | Cliente móvil y persistencia local SQLite pendientes de consolidación/documentación en este repositorio |

---

### 2. Proyectos GCP y Distribución de Infraestructura

El despliegue en la región `southamerica-west1` está dividido en dos proyectos de Google Cloud Platform para desacoplar el plano transaccional bancario del plano documental de experiencia de usuario:

#### Proyecto Principal: `full-stack-2026`
* **Cloud Run (Serverless Privado)**:
  * `nequi-wallet`: Microservicio autoritativo de billetera, transferencias y recargas.
  * `nequi-workers`: Host de background jobs (`OutboxWorker`) y endpoints push (`/internal/pubsub/projection`, `/internal/pubsub/notifications`).
* **Google Cloud Spanner**:
  * Instancia: `finanzas-mvp`
  * Base de datos: `finanzas-core`
  * Recurso: `projects/full-stack-2026/instances/finanzas-mvp/databases/finanzas-core`
* **Google Cloud Pub/Sub**:
  * Topic de eventos: `wallet-events`
  * Dead Letter Queue: `wallet-events-dlq`
  * Suscripciones Push OIDC autenticadas: `workers-projection` y `workers-notifications`
* **Configuración e Identidades**:
  * Secret Manager: `nequi-spanner-database` (resource identifier/configuración de la base Spanner).
  * Artifact Registry: Repositorio Docker `servicios`.
  * Service Accounts dedicadas verificadas: `wallet-service`, `outbox-dispatcher`, `pubsub-push-invoker`.

#### Proyecto Firebase / Firestore: `fullstack-d3be5`
* **Google Cloud Firestore**:
  * Base de datos: `(default)`
  * Modo: `FIRESTORE_NATIVE`
  * Región: `southamerica-west1`
  * Colecciones verificadas: `financial_movements` (proyecciones de transferencias y recargas) y `notifications` (alertas de usuario).

---

### 3. Documentación Técnica del Repositorio

Para profundizar en cada subsistema, consulte las guías especializadas:

* [Índice General de Documentación](docs/README.md)
* [Guía de Despliegue y Validación en GCP (AS-IS)](docs/despliegue-y-validacion-gcp.md)
* [Documentación del Servicio Nequi.Wallet](src/Nequi.Wallet/README.md)
* [Documentación del Servicio Nequi.Workers](src/Nequi.Workers/README.md)
* [Modelo Físico de Cloud Spanner (DDL)](database/spanner/README.md)
* [Scripts de Automatización e Infraestructura](infra/README.md)
* [Suite de Pruebas Automatizadas Bruno](tests/bruno/README.md)
* [Bitácora de Troubleshooting](TROUBLESHOOTING.md)

---

## Orden de construcción

| Etapa | Qué se construye | Prueba obligatoria |
|---|---|---|
| Fundamento | Identity + API Gateway + Cloud Run | Sin JWT → 401 |
| SQL | Cliente/admin + billetera + ledger | Saldo de cliente nunca negativo |
| Transacciones | Transferencia + recarga + idempotencia | Reintento idéntico → replay 201; misma key con payload distinto → 409. Limitación AS-IS: commit gap entre el efecto financiero y `CompleteAsync`; sin garantía atómica E2E de un solo efecto |
| NoSQL | Movimientos + categorías + efectivo | Historial correcto |
| Reversos | Compensaciones | El original permanece |
| Realtime | Outbox + Pub/Sub + WebSocket | Dos sesiones reciben el saldo |
| Offline | SQLite + sync | Efectivo sí, transferencias no |
| Admin | Admin service + auditoría | No se puede editar el saldo |
| Voz | Speech-to-Text + borrador | Nada se guarda sin confirmar |
| IA | Chatbot read-only | No muta ni recomienda inversiones |

---

## Costos

El MVP está diseñado para caber en cuotas gratuitas y pruebas: Cloud Run (2M req/mes),
API Gateway (2M llamadas/mes), Identity Platform (50k MAU), Firestore (1 GiB, 50k
lecturas/día), Pub/Sub (10 GiB/mes), Secret Manager, Speech-to-Text (60 min/mes).

Dos excepciones conscientes:

- **Spanner** no tiene capa gratuita permanente, solo una prueba de 90 días. Por eso el
  desarrollo se hace contra el **emulador local** (`SPANNER_EMULATOR_HOST=localhost:9010`)
  y la instancia real se reserva para la integración y la demostración.
- **Vertex AI** no debe presupuestarse como Always Free. La app expone un flag
  `AI_ENABLED` para que la falta de créditos de IA nunca tumbe transferencias, saldos,
  efectivo ni presupuestos.

---

## Servicios internos y complementarios

Authorization, Idempotency, Health, Logging y Secret Manager viven en `src/Nequi.Shared`.
Outbox Worker, Projection, Notification y Report corren en `src/Nequi.Workers`; el WebSocket en `src/Nequi.Realtime`.

```
bash infra/setup.sh                      # APIs, IAM, Firestore, secreto (idempotente)
AUTH_DEMO_HEADERS=true bash infra/deploy.sh all   # build con Cloud Build + Cloud Run + suscripciones push
bash infra/smoke-test.sh                 # publica un evento y lo consulta por los endpoints
dotnet test                              # pruebas locales (en memoria)
```

`AUTH_DEMO_HEADERS=true` habilita `X-Demo-User` / `X-Demo-Role` solo para pruebas; nunca en producción.
Contrato del `payload` de `outbox_events` que debe escribir `wallet-service`: `clientId`, `amountCents` (con signo), `currency`
(opcionales: `operationId`, `occurredAt`, `counterpartyClientId`, `description`, `balanceAfterCents`).
