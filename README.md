# NequiTrampa

**MVP de una billetera financiera digital** construido como proyecto académico full stack.
Es un clon educativo inspirado en aplicaciones tipo Nequi: permite registrar clientes,
manejar un saldo digital, hacer transferencias y recargas simuladas, llevar el control de
gastos en efectivo, presupuestos y categorías, y consultar todo mediante un asistente de
IA y comandos de voz.

> ⚠️ **Aviso.** Este proyecto no está afiliado ni relacionado con Nequi ni con Bancolombia.
> No procesa dinero real, no se conecta a bancos, pasarelas de pago ni Open Banking. Todas
> las recargas son simuladas y el sistema existe únicamente con fines educativos.

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
| ASP.NET Core (C#) | Los seis servicios web |
| Cloud Run | Ejecución de contenedores, HTTPS y WebSockets |
| API Gateway | Entrada única de APIs y validación de JWT |
| REST | Contrato público (sin SOAP, sin GraphQL, sin gRPC público) |

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

### Los seis servicios

| Servicio | Base | Responsabilidad |
|---|---|---|
| `profile-service` | Spanner | Cliente, perfil, resolución de destinatarios |
| `wallet-service` | Spanner | Saldo, transferencias, recargas, ledger |
| `finance-service` | Firestore | Movimientos, efectivo, categorías, presupuestos |
| `assistant-service` | ninguna | IA consultiva + procesamiento de voz |
| `realtime-service` | ninguna | WebSocket y difusión de eventos |
| `admin-service` | vía los otros | Operaciones administrativas |

---

## Reglas del dominio

Estas reglas no son opcionales: definen qué es el proyecto.

- **Partida doble.** Toda operación cumple `Σ delta = 0` en `ledger_entries`.
- **Saldo nunca negativo.** `current_balance >= 0`, validado dentro de la transacción.
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

| Componente | Estado |
|---|---|
| Documento de arquitectura | ✅ Congelado |
| Esquema Spanner `finanzas-core` | ✅ Desplegado en GCP (9 tablas, 18 índices, 25 CHECK, 5 FK) e invariantes verificados contra producción |
| Infraestructura GCP | ✅ APIs, service accounts con mínimo privilegio, Pub/Sub con DLQ, Artifact Registry |
| Firestore | 🚧 Parcial — faltan colecciones y el enlace `operationId` |
| Los 6 servicios ASP.NET Core | ⬜ Pendientes |
| API Gateway · Identity Platform · Cloud Scheduler | ⬜ Pendientes (necesitan las URLs de Cloud Run) |
| App React Native | ⬜ Pendiente |

Este repositorio todavía no contiene código de aplicación. El esquema SQL, los scripts de
despliegue y la documentación de infraestructura viven por ahora en las carpetas hermanas
`spanner/` e `infra/` del proyecto.

### Tablas en Spanner

`clients` · `administrators` · `wallet_accounts` · `ledger_operations` · `ledger_entries` ·
`idempotency_records` · `daily_transfer_usage` · `outbox_events` · `reconciliation_issues`

### Colecciones en Firestore

`financial_movements` · `categories` · `budgets` · `cash_summaries` ·
`finance_idempotency` · `audit_events`

---

## Orden de construcción

| Etapa | Qué se construye | Prueba obligatoria |
|---|---|---|
| Fundamento | Identity + API Gateway + Cloud Run | Sin JWT → 401 |
| SQL | Cliente/admin + billetera + ledger | Nunca saldo negativo |
| Transacciones | Transferencia + recarga + idempotencia | Doble tap → un solo efecto |
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
