# ARQUITECTURA, BASES DE DATOS, ROLES Y SERVICIOS WEB
## Proyecto Financiero Móvil sobre Google Cloud
### Resumen Consolidado de Decisiones Vigentes y Catálogo Corregido

---

## 1. Resumen Ejecutivo y Decisiones Vigentes

| Elemento | Decisión Vigente |
| :--- | :--- |
| **Frontend** | React Native + Expo + TypeScript |
| **Backend** | ASP.NET Core / C# sobre Cloud Run |
| **Base SQL autoritativa** | Cloud Spanner |
| **Base NoSQL dinámica** | Cloud Firestore |
| **Base local** | SQLite (solo offline y caché en dispositivo) |
| **Autenticación** | Google Cloud Identity Platform + JWT (RFC 8725) |
| **Entrada HTTP** | API Gateway |
| **Eventos** | Transactional Outbox + Pub/Sub |
| **Roles** | `CLIENTE`, `SOPORTE`, `OPERADOR_FINANCIERO`, `ADMIN` |

> [!NOTE]
> Cloud SQL fue considerado por error en una iteración previa y queda totalmente descartado. La arquitectura vigente utiliza **Spanner + Firestore**.

---

## 2. Decisiones Arquitectónicas Congeladas

* **Dinero**: Simulado, una sola moneda: **COP**.
* **Saldo digital**: Autoridad exclusiva en **Spanner**; nunca se decide desde SQLite o Firestore.
* **Efectivo**: Separado del saldo digital; se gestiona como dato financiero personal flexible en Firestore y SQLite offline.
* **Transferencias**: Entre clientes registrados y activos; requieren saldo, límites e idempotencia.
* **Límite individual**: Hasta $2.000.000 COP por transferencia.
* **Límite diario**: Hasta $5.000.000 COP acumulados por cliente/día.
* **Inmutabilidad**: Operaciones completadas no se borran ni se editan; se compensan con reversos o ajustes formales.
* **Offline**: Permitido para caché y movimientos de efectivo; no para transferencias ni recargas críticas.
* **IA**: Consultiva; no puede transferir, recargar, reversar ni alterar saldos.
* **Voz**: Captura e interpreta datos; requiere confirmación explícita antes de persistir.
* **Realtime**: WebSocket actualiza UI; no determina verdad financiera.

---

## 3. Separación de Responsabilidades entre Bases de Datos

### 3.1 Cloud Spanner - Fuente de Verdad Financiera
Spanner conserva la información crítica cuya inconsistencia afectaría dinero, autoridad o trazabilidad contable. **Si existe contradicción entre Spanner, Firestore y SQLite, prevalece Spanner.**
* **Identidad de negocio**: Users/Clients/Staff, estado y vínculo con Identity Platform UID.
* **Roles y acceso**: `CLIENTE`, `SOPORTE`, `OPERADOR_FINANCIERO`, `ADMIN`; asignación auditada de roles.
* **Wallet / Cuentas**: Billeteras, cuentas y saldo digital autoritativo.
* **Transferencias y Recargas**: Operaciones monetarias críticas atómicas.
* **Ledger**: `LedgerOperations` y `LedgerEntries` con contabilidad por partida doble ($\sum \Delta = 0$).
* **Reversos y ajustes**: `REVERSAL` y `ADMIN_ADJUSTMENT` como operaciones compensatorias inmutables.
* **Límites e Idempotencia**: Validación transaccional y registro en `idempotency_records`.
* **Outbox**: Eventos transaccionales confirmados para publicación en Pub/Sub.
* **Auditoría crítica**: Acciones sensibles y eventos contables.

### 3.2 Cloud Firestore - Datos Dinámicos y Proyecciones
Contiene información documental, flexible y orientada a experiencia de usuario. **No es autoridad del saldo digital ni del ledger.**
* **Movimientos visibles**: Proyecciones optimizadas para visualización y scroll (`financial_movements`).
* **Categorías**: Catálogo del sistema y categorías personalizadas (`categories`).
* **Presupuestos y Metas**: Seguimiento de metas y presupuestos personales de gasto.
* **Efectivo**: Ingresos, gastos y saldo de efectivo declarado, separados de la wallet digital.
* **Soporte**: Casos de soporte (`SupportCases`), mensajes y evolución documental.
* **Preferencias y Analítica**: Datos agregados y dashboards de lectura.

### 3.3 SQLite - Almacenamiento Local del Dispositivo
Vive exclusivamente en el teléfono. Sirve para rendimiento y experiencia offline parcial:
* Caché de movimientos, categorías, presupuestos y metas.
* Último saldo conocido, mostrado como **"último saldo sincronizado"** en ausencia de conexión.
* Movimientos de efectivo creados offline y cola de sincronización (`PENDING`, `SYNCED`, `FAILED`).
* **Regla estricta**: No autoriza transferencias ni recargas offline.

---

## 4. Distinción: Dominio Funcional vs. Rol vs. Despliegue Físico

* **Dominio / Servicio Funcional**: Qué capacidad ofrece el sistema.
* **Rol**: Quién puede utilizar una capacidad y bajo qué políticas.
* **Unidad Física de Despliegue**: Contenedores agrupados en Google Cloud Run.

---

## 5. Catálogo Formalizado de Servicios y Endpoints por Rol

### 5.1 CLIENTE
| Servicio | HTTP | Endpoint | Función | Códigos Respuesta | Persistencia |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Profile** | GET | `/v1/me` | Perfil autenticado | 200, 401, 404 | Spanner |
| **Profile** | PATCH | `/v1/me` | Actualiza campos permitidos | 200, 400, 401, 422 | Spanner |
| **Access** *(Subordinado a Profile)* | GET | `/v1/me/access` | Roles y permisos efectivos de UI | 200, 401 | Identity / Claims |
| **Wallet** | GET | `/v1/wallet` | Información de billetera | 200, 401, 404 | Spanner |
| **Wallet** | GET | `/v1/wallet/balance` | Saldo digital oficial autoritativo | 200, 401, 404, 503 | Spanner |
| **Transfers** | POST | `/v1/transfers` | Crea transferencia interna (Idempotency-Key) | 201, 400, 401, 404, 409, 422, 429, 503 | Spanner $\rightarrow$ Outbox |
| **Transfers** | GET | `/v1/transfers` | Lista transferencias propias | 200, 401, 429 | Spanner |
| **Transfers** | GET | `/v1/transfers/{id}` | Detalle de transferencia propia | 200, 401, 403, 404 | Spanner |
| **Transfers** | GET | `/v1/transfers/{id}/receipt`| Comprobante formal de transferencia | 200, 401, 404 | Spanner |
| **Recharges** | POST | `/v1/recharges` | Recarga simulada (Idempotency-Key) | 201, 400, 401, 409, 422, 429 | Spanner $\rightarrow$ Outbox |
| **Recharges** | GET | `/v1/recharges` | Historial de recargas propias | 200, 401 | Spanner |
| **Beneficiaries** | GET | `/v1/beneficiaries` | Lista beneficiarios frecuentes | 200, 401 | Firestore / Spanner |
| **Beneficiaries** | POST | `/v1/beneficiaries` | Agrega nuevo beneficiario | 201, 400, 401, 404, 409 | Firestore / Spanner |
| **Beneficiaries** | DELETE | `/v1/beneficiaries/{id}` | Elimina beneficiario propio | 204, 401, 403, 404 | Firestore / Spanner |
| **Movements** | GET | `/v1/movements` | Historial visible paginado | 200, 401, 429 | Firestore |
| **Movements** | GET | `/v1/movements/{id}` | Detalle de movimiento | 200, 401, 404 | Firestore |
| **Cash** | GET | `/v1/cash/balance` | Saldo de efectivo declarado | 200, 401 | Firestore / SQLite |
| **Cash** | GET | `/v1/cash/movements` | Historial de efectivo | 200, 401 | Firestore / SQLite |
| **Cash** | POST | `/v1/cash/movements` | Registra ingreso/gasto/ajuste de caja | 201, 400, 401, 409, 422 | Firestore / SQLite |
| **Categories** | GET | `/v1/categories` | Lista catálogo y categorías propias | 200, 401 | Firestore |
| **Categories** | POST | `/v1/categories` | Crea categoría personal | 201, 400, 401, 409 | Firestore |
| **Budgets** | GET | `/v1/budgets` | Lista presupuestos personales | 200, 401 | Firestore |
| **Budgets** | POST | `/v1/budgets` | Crea presupuesto | 201, 400, 401, 422 | Firestore |
| **Budgets** | PATCH | `/v1/budgets/{id}` | Actualiza presupuesto | 200, 400, 401, 404 | Firestore |
| **Goals** | GET | `/v1/goals` | Lista metas financieras | 200, 401 | Firestore |
| **Goals** | POST | `/v1/goals` | Crea meta de ahorro | 201, 400, 401, 422 | Firestore |
| **Goals** | PATCH | `/v1/goals/{id}` | Actualiza meta | 200, 400, 401, 404 | Firestore |
| **Analytics** | GET | `/v1/analytics/summary` | Resumen financiero global | 200, 401 | Firestore |
| **Analytics** | GET | `/v1/analytics/categories` | Gasto desglosado por categoría | 200, 401 | Firestore |
| **Analytics** | GET | `/v1/analytics/trends` | Tendencias de gasto por periodo | 200, 400, 401 | Firestore |
| **Support** | POST | `/v1/support/cases` | Abre caso de soporte | 201, 400, 401, 422 | Firestore |
| **Support** | GET | `/v1/support/cases` | Lista casos propios | 200, 401 | Firestore |
| **Support** | POST | `/v1/support/cases/{id}/messages` | Agrega mensaje a caso propio | 201, 400, 401, 403, 404 | Firestore |
| **Assistant** | POST | `/v1/assistant/queries` | Consulta IA financiera (solo lectura) | 200, 400, 401, 429, 503 | N/A (Vertex AI) |
| **Voice** | POST | `/v1/voice/transcriptions` | Audio a texto (Speech-to-Text) | 200, 400, 401, 413, 415, 429, 503 | N/A (STT API) |
| **Voice** | POST | `/v1/voice/cash-drafts` | Texto a borrador de movimiento | 200, 400, 401, 422 | N/A |
| **Sync** | POST | `/v1/sync/cash-movements/batch` | Sincroniza efectivo offline | 200/207, 400, 401, 409, 422 | Firestore $\leftarrow$ SQLite |
| **Sync** | GET | `/v1/sync/bootstrap` | Descarga datos iniciales | 200, 401 | Firestore / Spanner |
| **Notifications** | GET | `/v1/notifications` | Lista notificaciones del cliente | 200, 401 | Firestore |
| **Notifications** | PATCH | `/v1/notifications/{id}/read` | Marca notificación como leída | 200/204, 401, 404 | Firestore |

### 5.2 SOPORTE
| Servicio | HTTP | Endpoint | Función | Códigos Respuesta | Persistencia |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Support Mgmt** | GET | `/v1/support/cases` | Casos asignados / permitidos | 200, 401, 403 | Firestore |
| **Support Mgmt** | GET | `/v1/support/cases/{id}` | Detalle del caso | 200, 401, 403, 404 | Firestore |
| **Support Mgmt** | PATCH | `/v1/support/cases/{id}/status` | Actualiza estado del caso | 200, 400, 401, 403, 409 | Firestore |
| **Support Mgmt** | POST | `/v1/support/cases/{id}/messages` | Responde al cliente | 201, 400, 401, 403, 404 | Firestore |
| **Support Mgmt** | POST | `/v1/support/cases/{id}/assignments` | Asigna caso a operador | 201, 401, 403, 409 | Firestore |
| **Support Mgmt** | POST | `/v1/support/cases/{id}/escalations` | Escala caso a operador financiero | 201, 401, 403, 409 | Firestore $\rightarrow$ Pub/Sub |
| **Investigation** | GET | `/v1/support/operations/{id}` | Estado seguro de operación | 200, 401, 403, 404 | Spanner (Solo lectura) |
| **Investigation** | GET | `/v1/support/operations/{id}/timeline` | Línea temporal de eventos | 200, 401, 403, 404 | Spanner + Firestore |
| **Investigation** | GET | `/v1/support/operations/{id}/projection-status`| Estado Spanner vs Firestore | 200, 401, 403, 404 | Spanner vs Firestore |
| **Customer Lookup** | GET | `/v1/support/clients/{id}` | Datos mínimos necesarios | 200, 401, 403, 404 | Spanner |
| **Customer Lookup** | GET | `/v1/support/clients/{id}/operations` | Operaciones ligadas al caso | 200, 401, 403 | Spanner (Auditoría) |

### 5.3 OPERADOR_FINANCIERO
| Servicio | HTTP | Endpoint | Función | Códigos Respuesta | Persistencia |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Financial Ops** | GET | `/v1/financial-operations/{id}` | Inspección financiera | 200, 401, 403, 404 | Spanner |
| **Financial Ops** | GET | `/v1/financial-operations/{id}/ledger` | Ledger contable asociado | 200, 401, 403, 404 | Spanner (`ledger_entries`)|
| **Financial Ops** | GET | `/v1/financial-operations/{id}/audit` | Auditoría relacionada | 200, 401, 403, 404 | Spanner (`audit_events`) |
| **Reversals** | POST | `/v1/financial-operations/{id}/reversals` | Crea reverso formal | 201, 400, 401, 403, 409, 422, 503 | Spanner (ACID compensatorio)|
| **Reversals** | GET | `/v1/reversals/{id}` | Consulta detalle de reverso | 200, 401, 403, 404 | Spanner |
| **Adjustments** | POST | `/v1/financial-adjustments` | Ajuste compensatorio auditado | 201, 400, 401, 403, 409, 422 | Spanner (ACID compensatorio)|
| **Adjustments** | GET | `/v1/financial-adjustments/{id}` | Consulta detalle de ajuste | 200, 401, 403, 404 | Spanner |
| **Reconciliation** | GET | `/v1/reconciliation/issues` | Lista inconsistencias detectadas | 200, 401, 403 | Spanner (`reconciliation_issues`)|
| **Reconciliation** | GET | `/v1/reconciliation/issues/{id}` | Detalle de inconsistencia | 200, 401, 403, 404 | Spanner |
| **Reconciliation** | POST | `/v1/reconciliation/issues/{id}/resolve`| Resolución formal auditada | 200, 400, 401, 403, 409 | Spanner |

### 5.4 ADMIN
| Servicio | HTTP | Endpoint | Función | Códigos Respuesta | Persistencia |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Users** | GET | `/v1/admin/users` | Busca / lista usuarios | 200, 401, 403 | Spanner (`clients`/`staff`)|
| **Users** | GET | `/v1/admin/users/{id}` | Detalle administrativo | 200, 401, 403, 404 | Spanner |
| **Users** | PATCH | `/v1/admin/users/{id}/status` | Activa / bloquea usuario | 200, 400, 401, 403, 404 | Spanner |
| **Roles** | GET | `/v1/admin/roles` | Lista roles del sistema | 200, 401, 403 | Spanner |
| **Roles** | GET | `/v1/admin/users/{id}/roles` | Roles asignados al usuario | 200, 401, 403, 404 | Spanner |
| **Roles** | PUT | `/v1/admin/users/{id}/roles` | Asigna roles autorizados | 200, 400, 401, 403, 409 | Spanner |
| **Configuration** | GET | `/v1/admin/configuration` | Consulta configuración | 200, 401, 403 | Firestore / Secret Manager |
| **Configuration** | PATCH | `/v1/admin/configuration` | Modifica flags permitidos | 200, 400, 401, 403 | Firestore |
| **Audit** | GET | `/v1/admin/audit-events` | Busca bitácoras de auditoría | 200, 401, 403 | Spanner (`audit_events`) |
| **Audit** | GET | `/v1/admin/audit-events/{id}` | Detalle de evento auditado | 200, 401, 403, 404 | Spanner |

### 5.5 TRANSVERSALES
* **Authentication**: Identity Platform + JWT (RFC 8725).
* **Authorization**: RBAC + Policies + Deny-by-Default.
* **Idempotency**: Protección de POSTs mediante `Idempotency-Key` en Spanner.
* **Notifications**: Gestión unificada multi-rol.
* **Problem Details**: Manejo uniforme de errores RFC 9457.
* **Logging & Monitoring**: Trazabilidad con `traceId` en Cloud Logging / Monitoring.
* **Health**: Liveness (`/health/live`) y Readiness (`/health/ready`).

### 5.6 INTERNOS / ASÍNCRONOS
* **Transactional Outbox**: Persistente en Spanner.
* **Outbox Worker**: Spanner $\rightarrow$ Pub/Sub.
* **Projection Worker**: Pub/Sub $\rightarrow$ Firestore.
* **Realtime Service**: WebSocket hacia cliente móvil.
* **Notification Worker**: Pub/Sub $\rightarrow$ FCM / Correo.

---

## 6. Despliegue Físico Recomendado en Cloud Run

1. `core-api`: Profile, Access, Movements, Cash, Categories, Budgets, Goals, Analytics, Sync.
2. `wallet-api`: Wallet, Transfers, Recharges, Beneficiaries.
3. `backoffice-api`: Support, Investigation, Financial Operations, Reversals, Adjustments, Reconciliation, Users, Roles, Configuration, Audit.
4. `assistant-api`: Assistant, Voice.
5. `workers`: Outbox Worker, Projection Worker, Notification Worker.
