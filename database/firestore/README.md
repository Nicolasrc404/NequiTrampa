# Firestore — índices de referencia

Este directorio no se despliega automáticamente. Documenta los índices compuestos que el código
espera en Firestore para no degradar a error de consulta en GCP.

| Colección | Campos | Uso |
|---|---|---|
| `cash_movements` | `clientId ASC`, `occurredOn DESC` | `GET /v1/cash/movements` (historial del cliente) |

Las consultas restantes usan igualdad sobre un único campo (índice automático) o leen
`financial_movements` por `clientId` sin orden (ver `MovementReader`).

Aplicación sugerida (requiere autorización y credenciales, fuera de este repositorio):

```
gcloud firestore indexes composite create \
  --collection-group=cash_movements \
  --field-config=field-path=clientId,order=ascending \
  --field-config=field-path=occurredOn,order=descending
```
