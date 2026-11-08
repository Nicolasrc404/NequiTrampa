# Guía de pruebas — backend real en GCP (`finanzas-mvp-2026`)

> Paso a paso con comandos para probar el backend real (Cloud Run, Spanner, Identity Platform) desde tu máquina. Generado el 2026-11-08 a pedido de Nicolás, con permisos ya configurados. Actualizado el mismo día para agregar a Alejo.

## 0. Acceso ya configurado

Las siguientes cuentas ya tienen el rol **`roles/editor`** en el proyecto `finanzas-mvp-2026`: `rubianon10@gmail.com` y `alejovilla2007@gmail.com`. Esto permite leer y modificar la mayoría de los recursos (Cloud Run, Spanner, Firestore, Pub/Sub, etc.), pero **no** administrar permisos de otros usuarios ni facturación — eso sigue siendo solo del dueño del proyecto (`juangamercam0108@gmail.com`).

Si `alejovilla2007@gmail.com` no podía iniciar sesión en la app ni en modo académico: ya tiene su propia cuenta de app (ver sección 6). Sobre el modo académico — es una limitación **por diseño**, no un permiso: solo funciona en un build de desarrollo (`expo start`), queda bloqueado automáticamente en el APK de producción/release, sin importar las credenciales.

## 1. Autenticarte con gcloud

Si es la primera vez en esta máquina:

```powershell
gcloud auth login
```

Esto abre el navegador para iniciar sesión con `rubianon10@gmail.com`. Después fijá el proyecto activo:

```powershell
gcloud config set project finanzas-mvp-2026
```

Verificá que quedó bien:

```powershell
gcloud config get-value project
gcloud auth list
```

## 2. El comando que te había fallado

Ahora debería funcionar sin el error de `PERMISSION_DENIED`:

```powershell
gcloud run services describe nequi-gateway --project=finanzas-mvp-2026 --region=southamerica-west1 --format="value(status.url)"
```

Esto devuelve la URL pública del gateway (API Gateway del backend). Debería ser:

```
https://nequi-gateway-241267467975.southamerica-west1.run.app
```

## 3. Probar que el gateway responde

Con la URL de arriba, probá un endpoint protegido (sin token, tiene que devolver **401**, eso confirma que el gateway está sano — no es un error):

```powershell
curl -i https://nequi-gateway-241267467975.southamerica-west1.run.app/v1/wallet
```

Si ves `HTTP/1.1 401 Unauthorized` (o similar), el backend está funcionando correctamente.

## 4. Ver todos los servicios de Cloud Run del proyecto

```powershell
gcloud run services list --project=finanzas-mvp-2026 --region=southamerica-west1
```

Para ver los logs de un servicio puntual (por ejemplo si algo falla):

```powershell
gcloud run services logs read nequi-gateway --project=finanzas-mvp-2026 --region=southamerica-west1 --limit=50
```

## 5. Consultar la base de datos real (Spanner)

El proyecto usa Cloud Spanner, instancia `finanzas-mvp`, base de datos `finanzas-core`.

Ver clientes registrados (sin traer email/nombre, solo lo esencial):

```powershell
gcloud spanner databases execute-sql finanzas-core --instance=finanzas-mvp --project=finanzas-mvp-2026 --sql="SELECT client_id, auth_subject, public_transfer_code, status FROM clients"
```

Ver saldos de billeteras:

```powershell
gcloud spanner databases execute-sql finanzas-core --instance=finanzas-mvp --project=finanzas-mvp-2026 --sql="SELECT account_id, client_id, currency, current_balance_minor, status FROM wallet_accounts"
```

> Nota: `current_balance_minor` está en centavos (ej. `5000000` = $50.000 COP). Para convertir, dividí entre 100.

## 6. Cuentas de prueba ya creadas (Identity Platform)

Podés iniciar sesión en la app (modo real, no demo) con cualquiera de estas cuentas — ver también `ESTADO_APP_Y_PENDIENTES.md` en la raíz del repo para más contexto:

| Usuario | Contraseña | Rol |
|---|---|---|
| alejandro@demo.co | `NequiDemo2026!` | CLIENTE |
| laura@demo.co | `NequiDemo2026!` | CLIENTE |
| outsider@demo.co | `NequiDemo2026!` | CLIENTE |
| juanca@demo.co | `12345678` | CLIENTE |
| soporte@demo.co | `NequiDemo2026!` | SOPORTE |
| operador@demo.co | `NequiDemo2026!` | OPERADOR_FINANCIERO |
| admin@demo.co | `NequiDemo2026!` | ADMIN |
| alejo@demo.co | `NequiDemo2026!` | CLIENTE |

> `alejo@demo.co` (Alejo Villa, saldo inicial $0) se creó para `alejovilla2007@gmail.com` — corregir nombre/apellido en Spanner si no es el correcto (tabla `clients`, `client_id` `55555555-5555-4555-8555-555555555555`).

## 7. Crear o actualizar usuarios de prueba vos mismo

El repo ya trae un script para esto: `infra/seed-identity.sh`. Necesita un password mínimo de 8 caracteres:

```powershell
# En Git Bash / WSL (el script es bash, no PowerShell puro)
SEED_PASSWORD='TuPasswordDePrueba123' ./infra/seed-identity.sh
```

Esto crea/actualiza `alejandro`, `laura`, `outsider`, `soporte`, `operador` y `admin` con roles ya configurados, y al final te imprime la Web API Key pública que necesita el frontend (`EXPO_PUBLIC_IDENTITY_API_KEY`).

## 8. Correr la app frontend contra el backend real

Desde `frontend/`, el archivo `.env.local` (no versionado) ya tiene la configuración correcta apuntando al backend real. Si necesitás uno nuevo:

```powershell
cd frontend
# copiar .env.example como base y completar EXPO_PUBLIC_IDENTITY_API_KEY
npm install
npx expo start
```

## 9. Si algo da `PERMISSION_DENIED` en otro comando

Significa que ese recurso puntual necesita un rol más específico que `roles/editor` (poco común, pero puede pasar con algunos servicios de administración). En ese caso, pedile a quien tenga rol `owner` del proyecto (`juangamercam0108@gmail.com`) que agregue el rol faltante:

```powershell
gcloud projects add-iam-policy-binding finanzas-mvp-2026 --member="user:rubianon10@gmail.com" --role="ROL_FALTANTE"
```
