# Nequi.Finance (core-api)

Contenedor de despliegue: `core-api`. Agrupa los dominios personales que no mueven dinero en el
ledger bancario:

| Dominio | Rutas | Persistencia |
|---|---|---|
| Movements (proyección) | `GET /v1/movements` | Firestore `financial_movements` (escrito por `Nequi.Workers`) |
| Categories | `GET/POST /v1/categories`, `PATCH/DELETE /v1/categories/{id}` | Firestore `categories`, `category_keys` |
| Budgets | `GET/POST /v1/budgets`, `GET/PATCH /v1/budgets/{id}` | Firestore `budgets` |
| Goals | `GET/POST /v1/goals`, `GET/PATCH /v1/goals/{id}` | Firestore `goals`, `goal_keys` |
| Analytics | `GET /v1/analytics/summary`, `/categories`, `/trends` | Lectura de `financial_movements` |
| Cash | `GET /v1/cash/balance`, `GET/POST /v1/cash/movements` | Firestore `cash_accounts`, `cash_movements`, `cash_dedupe` |

## Reglas

- La autoridad financiera es **Cloud Spanner**; este servicio nunca escribe en el ledger, en
  `wallet_accounts` ni en `WalletBalance`.
- El propietario se resuelve siempre desde `auth_subject → client_id`. Nunca se acepta `clientId`
  desde el cuerpo o la query.
- Presupuestos y metas no mueven ni apartan dinero. El progreso de presupuesto se recalcula en
  cada lectura desde movimientos con `status=COMPLETED`.
- Analytics solo lee `financial_movements` con `status=COMPLETED` y periodos mensuales en
  `America/Bogota`.
- Cash es un registro personal declarado, atómico por cliente, separado de la billetera. Un gasto
  no puede superar el efectivo disponible y un registro idéntico se rechaza con 409.

## Firestore

Índice compuesto requerido (no desplegado por este repositorio):

```
cash_movements: clientId ASC, occurredOn DESC
```

`database/firestore/firestore.indexes.json` contiene la definición de referencia.

## Configuración local

`appsettings.json` usa `Data:Backend=memory` y `Auth:DemoHeaders=false`. No contiene secretos.
En GCP, `Data:Backend=gcp` requiere `Firestore:ProjectId` (o `Gcp:ProjectId`) y `Spanner:Database`
inyectado desde Secret Manager.
