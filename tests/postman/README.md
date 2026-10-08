# Postman — NequiTrampa

| Archivo | Uso |
|---|---|
| `NequiTrampa.local.postman_*.json` | Los 7 servicios en local (`scripts/run-local.ps1`), cabeceras `X-Demo-*` |
| `NequiTrampa.gcp.postman_collection.json` + `NequiTrampa.gcp.postman_environment.json` | **Producción GCP vía API Gateway**, con JWT real de Identity Platform. **Generados**: no editar a mano |
| `generate_from_bruno.py` | Regenera los dos archivos GCP desde `tests/bruno` (única fuente de verdad) |

Regenerar tras cambiar las pruebas Bruno:

```bash
python tests/postman/generate_from_bruno.py
```

## Ejecutar contra GCP

1. Crea los usuarios de prueba una vez: `SEED_PASSWORD='<contraseña>' bash infra/seed-identity.sh` (imprime la Web API key, pública).
2. Importa colección y environment. En el environment completa los secretos `testPassword` y `firebaseApiKey`.
3. Ejecuta con Newman (los secretos van por `--env-var`, no en el archivo):

```bash
newman run tests/postman/NequiTrampa.gcp.postman_collection.json \
  -e tests/postman/NequiTrampa.gcp.postman_environment.json \
  --env-var testPassword='<contraseña>' --env-var firebaseApiKey='<WEB_API_KEY>'
```

Cada request lleva `X-Persona` (`client`, `outsider`, `support`, `operator`, `admin`); el script de la colección la elimina,
inicia sesión en Identity Platform (token cacheado hasta su expiración) y envía `Authorization: Bearer <JWT>`. Con `authMode=demo`
usa cabeceras `X-Demo-*` (solo local).

> Los tests crean datos reales en producción (recargas, transferencias, reversos y ajustes que se compensan, casos de soporte, auditoría).
> El WebSocket no se automatiza aquí; ver `docs/guia-frontend-api.md`.
