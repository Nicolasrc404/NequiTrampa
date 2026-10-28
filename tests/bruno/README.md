# Colección Bruno — NequiTrampa (API completa)

Valida los contratos HTTP de los **7 servicios** (Wallet, Workers, Finance, Profile, Assistant, Backoffice, Realtime) y del **API Gateway**,
con **RFC 9457 (Problem Details)**, seguridad **JWT (RFC 8725)** y reglas financieras.
Es la **fuente de verdad** de las pruebas: la colección Postman se genera a partir de estos archivos (`tests/postman/generate_from_bruno.py`).

---

## 1. Dos entornos

| Environment | Destino | Autenticación (`authMode`) |
|---|---|---|
| `gcp` | **Producción**: todo pasa por el API Gateway público, igual que el front | `jwt`: inicio de sesión real en Identity Platform; sin cabeceras demo |
| `local` | Servicios en `localhost:8080-8087` (`scripts/run-local.ps1`) | `demo`: cabeceras `X-Demo-*` (requiere `Auth__DemoHeaders=true` local) |

### Personas
Cada request declara la cabecera `X-Persona` (`client`, `outsider`, `support`, `operator`, `admin`); **el script de `collection.bru` la elimina** y
añade la autenticación según `authMode`. Sin `X-Persona` el request va anónimo (útil para probar `401`).

| Persona | Usuario (GCP) | Rol |
|---|---|---|
| `client` | `alejandro@demo.co` (`idp-sub-alejandro`) | CLIENTE (+ claim `client_id`) |
| `outsider` | `outsider@demo.co` | CLIENTE ajeno (pruebas de `403`) |
| `support` | `soporte@demo.co` | SOPORTE |
| `operator` | `operador@demo.co` | OPERADOR_FINANCIERO |
| `admin` | `admin@demo.co` | ADMIN |

---

## 2. Ejecutar contra GCP

Una sola vez, crea los usuarios de prueba (requiere `gcloud` autenticado con permisos sobre Identity Platform):

```bash
SEED_PASSWORD='<contraseña>' bash infra/seed-identity.sh   # imprime también la Web API key (pública)
```

Luego, desde `tests/bruno` (los secretos **no** se guardan en el repo):

```bash
bru run --env gcp --env-var testPassword='<contraseña>' --env-var firebaseApiKey='<WEB_API_KEY>'
# Windows PowerShell:
bru.cmd run --env gcp --env-var testPassword='<contraseña>' --env-var firebaseApiKey='<WEB_API_KEY>'
```

En la GUI de Bruno define `testPassword` y `firebaseApiKey` como variables secretas del environment `gcp`.

> [!WARNING]
> Las pruebas escriben en **producción**: recargas, transferencias, reversos, ajustes (se compensan entre sí), casos de soporte y entradas de auditoría.

## 3. Ejecutar en local

```powershell
./scripts/run-local.ps1                       # levanta los servicios
cd tests/bruno; bru.cmd run --env local
```

Con `Data__Backend=memory` los datos son mocks. La carpeta `gateway/` solo aplica a GCP (o a un gateway local en `:8087` con `Gateway__IdentityTokens=false`).
Si Bruno devuelve `Requests: 0`, ejecútalo desde la raíz de la colección (`tests/bruno`).

---

## 4. Casos cubiertos (carpetas)

| Carpeta | Servicio | Qué valida |
|---|---|---|
| `health`, `authorization` | Wallet | Sondas `200`; sin token `401`; rol SOPORTE en endpoint de cliente `403` |
| `wallet`, `recharges`, `transfers` | Wallet | Saldo (`CLOUD_SPANNER`), recargas, transferencias, **idempotencia** (replay, conflicto `409`, sin llave `400`), límite `422`, comprobante ajeno `403` |
| `workers` | Workers | Salud, drenado del outbox, estadísticas (solo staff), proyecciones y notificaciones por `client_id`, reportes CSV asíncronos |
| `finance` | Finance | Movimientos propios (claim `client_id`), staff con `?clientId=`, `400 clientid_required` |
| `profile` | Profile | `GET/PATCH /v1/profile` (zona horaria IANA, alias), validación `422`, staff `403` |
| `assistant` | Assistant | Resumen determinista y chat (Vertex AI con respaldo), validación `422`, staff `403` |
| `backoffice` | Backoffice | Admin (usuarios, roles, configuración, auditoría), **casos de soporte** (crear → asignar → mensaje → escalar → cerrar → `409` al reabrir), investigación de operaciones (línea de tiempo, estado de proyección), **reverso** (saldo restaurado, original `REVERSED`, doble reverso `409`), **ajustes** CREDIT/DEBIT (sobregiro `409`, sin llave `400`), reconciliación |
| `gateway` | Gateway | `/internal/**` y Swagger no expuestos (`404`), cabeceras `X-Demo-*` ignoradas (`401`), JWT inválido `401`, CORS (origen permitido / no permitido), rutas a Wallet, Finance, Workers |
| `realtime` | Realtime | Salud y `me/access` |

El WebSocket (`/ws?access_token=<JWT>`) no es automatizable con Bruno; se verificó con un cliente de prueba (ver `docs/guia-frontend-api.md`).

---

## 5. Notas

- **Idempotencia AS-IS**: replay y conflicto están validados en el camino normal; `CompleteAsync` no comparte transacción con el movimiento, por lo que un fallo intermedio puede dejar un *commit gap* en el que un retry con la misma llave repita el movimiento.
- **Secretos**: `testPassword` y `firebaseApiKey` viajan por `--env-var` o como variables secretas; nunca los versiones.
- **Codificación**: guarda los `.bru` en UTF-8 sin BOM.
- Las carpetas `workers`, `finance`, `profile`, `assistant`, `backoffice` y `gateway` dependen de los datos semilla de Spanner (`clients`: Alejandro, Laura y Outsider).
