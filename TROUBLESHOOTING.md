# Bitácora de Troubleshooting y Resolución de Problemas

Este documento registra incidencias técnicas relevantes, inconsistencias arquitectónicas y su resolución en el proyecto **NequiTrampa**.

---

## 2026-09-21 12:55 - Reclasificación de Notifications y Subordinación de Access

**Componente:**
Catálogo de Servicios Web/API por Rol y Modelo de Autorización

**Descripción del error:**
En la especificación preliminar de servicios por rol, `Notifications` figuraba asignado exclusivamente bajo el rol `SOPORTE`, y `Access` se perfilaba como un microservicio independiente. Esto generaba una inconsistencia arquitectónica crítica: los clientes no podrían recibir alertas de pagos o límites excedidos bajo la política de soporte, y se introducía sobrefragmentación innecesaria para consultar roles efectivos.

**Causa raíz:**
Confusión inicial entre la responsabilidad funcional de emitir una notificación y el sujeto/rol que la consume, sumada a la asunción errónea de que cada endpoint debía constituir un microservicio aislado.

**Solución aplicada:**
1. Se reclasificó formalmente `Notifications` como **Capacidad TRANSVERSAL**, permitiendo que `CLIENTE`, `SOPORTE`, `OPERADOR_FINANCIERO` y `ADMIN` consuman y gestionen alertas según sus políticas RBAC correspondientes.
2. Se subordinó `Access` como un endpoint de capacidad (`GET /v1/me/access`) dentro del dominio `Profile`, empaquetado en `core-api`.
3. Se actualizó la matriz de endpoints y la documentación formal en `ARCHITECTURE.md` y `Resumen_Arquitectura_Servicios_Financieros_GCP.md`.

**Archivos modificados:**
- [ARCHITECTURE.md](file:///c:/Users/Lenovo/Nequi/NequiTrampa/ARCHITECTURE.md)
- [Resumen_Arquitectura_Servicios_Financieros_GCP.md](file:///c:/Users/Lenovo/Nequi/NequiTrampa/Resumen_Arquitectura_Servicios_Financieros_GCP.md)
- [README.md](file:///c:/Users/Lenovo/Nequi/NequiTrampa/README.md)

**Validación realizada:**
Revisión cruzada con los principios de mínimo privilegio de OWASP, semántica RFC 9110 y consulta técnica en el cuaderno de NotebookLM (`FullStack`), confirmando que las notificaciones son multi-rol y que `Access` forma parte del ciclo de vida de la identidad del usuario autenticado.

**Prevención futura:**
No clasificar servicios como pertenecientes a un único rol si el evento de negocio impacta a múltiples actores. Distinguir siempre entre *Dominio Funcional*, *Rol* y *Unidad Física de Despliegue*.

---

## 2026-09-21 12:58 - Detección de Ausencia de Esquemas Físicos Locales en el Árbol del Repositorio

**Componente:**
Estructura de Persistencia (`database/spanner/`, `database/firestore/`, `database/sqlite/`)

**Descripción del error:**
Las directrices operativas del proyecto establecen una jerarquía de fuentes basada en archivos locales (`database/spanner/01_schema.sql`, etc.), pero una inspección profunda del árbol de trabajo en la rama `main` confirmó que la carpeta `database/` no existe físicamente en este repositorio local.

**Causa raíz:**
De acuerdo con el `README.md` original, los esquemas SQL y scripts de despliegue residen actualmente en carpetas hermanas del proyecto o en ramas separadas de infraestructura GCP, sin haber sido copiados aún al árbol de trabajo de `NequiTrampa`.

**Solución aplicada:**
1. Se documentó formalmente la discrepancia en la sección de auditoría de `ARCHITECTURE.md`.
2. Se validaron los invariantes y dominios de datos mediante la documentación técnica congelada y consultas activas a las fuentes del cuaderno NotebookLM (`d19ab39c-c75e-4722-9e7b-2ff7ca8cfa5e`).
3. Se priorizó en el Roadmap la importación y sincronización de los DDLs de Spanner como paso previo indispensable antes de sustituir los mocks de `wallet-api`.

**Archivos modificados:**
- [ARCHITECTURE.md](file:///c:/Users/Lenovo/Nequi/NequiTrampa/ARCHITECTURE.md)
- [TROUBLESHOOTING.md](file:///c:/Users/Lenovo/Nequi/NequiTrampa/TROUBLESHOOTING.md)

**Validación realizada:**
Búsqueda exhaustiva por comando PowerShell en el sistema de archivos local y verificación en el cuaderno de NotebookLM, identificando los contratos y tipos de datos requeridos (`NUMERIC` para dinero).

**Prevención futura:**
No asumir que la estructura de base de datos está presente en el repositorio local sin una verificación física con comandos de sistema de archivos. Documentar siempre cualquier gap entre la documentación y el código real.

---

## 2026-09-22 - Application Default Credentials (ADC) no configuradas en entorno local

**Componente:**
SDKs de Google Cloud (`Google.Cloud.Spanner.Data`, `Google.Cloud.Firestore`) en ejecución local de `Nequi.Wallet` y `Nequi.Workers`.

**Descripción del error:**
Al ejecutar los servicios localmente con `Data__Backend=gcp`, la llamada a Cloud Spanner o Firestore fallaba con excepciones de autenticación indicando que no se encontraron credenciales por defecto de aplicación (ADC).

**Causa raíz:**
La máquina de desarrollo no contaba con una sesión activa de Application Default Credentials para autenticarse contra Google Cloud.

**Solución aplicada:**
Ejecutar en la terminal el comando estándar de autenticación:
```bash
gcloud auth application-default login
```
Seleccionando la cuenta autorizada sobre los proyectos `full-stack-2026` y `fullstack-d3be5`.

**Archivos modificados:**
Ninguno en código. Comando operativo `gcloud auth application-default login`.

**Validación realizada:**
Ejecución local de los servicios con `Data__Backend=gcp`, confirmando apertura de conexión a Spanner y Firestore.

**Prevención futura:**
Documentar `gcloud auth application-default login` como paso obligatorio de preparación en el entorno local antes de interactuar con backends de GCP reales.

---

## 2026-09-22 - Puerto 8080 ocupado por instancia previa provocando respuestas MOCK inesperadas

**Componente:**
Entorno de desarrollo local / Asignación de puertos de `Nequi.Wallet`.

**Descripción del error:**
Al realizar peticiones de prueba esperando la respuesta autoritativa de Cloud Spanner (`expectedSourceAuthority = CLOUD_SPANNER`), el servicio respondía con `sourceAuthority = MOCK_IN_MEMORY`.

**Causa raíz:**
Un proceso previo o contenedor de `Nequi.Wallet` continuaba en ejecución en segundo plano escuchando en el puerto 8080 con `Data__Backend=memory`, interceptando las solicitudes antes de que la nueva instancia conectada a Spanner pudiera atenderlas.

**Solución aplicada:**
Identificar y detener el proceso que ocupaba el puerto 8080 en el sistema operativo antes de reiniciar la aplicación con `Data__Backend=gcp`.

**Archivos modificados:**
Ninguno (gestión de procesos en el host).

**Validación realizada:**
Invocación a `GET /v1/wallet/balance` retornando exitosamente `sourceAuthority: CLOUD_SPANNER`.

**Prevención futura:**
Verificar que el puerto 8080 esté libre antes de iniciar nuevas instancias y corroborar en los logs de inicio de ASP.NET Core el modo de persistencia activo.

---

## 2026-09-22 - Suscripciones Push de Cloud Pub/Sub hacia Cloud Run responden HTTP 403 Forbidden

**Componente:**
Google Cloud Pub/Sub, Cloud Run (`nequi-workers`), Google Cloud IAM.

**Descripción del error:**
Los eventos publicados en el topic `wallet-events` no eran procesados por `nequi-workers`. Las suscripciones push registraban errores `403 Forbidden` y los mensajes no entregados eran derivados a la Dead Letter Queue (`wallet-events-dlq`).

**Causa raíz:**
El servicio Cloud Run fue desplegado como privado (`--no-allow-unauthenticated`). Para invocar endpoints protegidos, la suscripción push requiere autenticación OIDC. Faltaba otorgar el rol `roles/run.invoker` a la service account de push (`pubsub-push-invoker`), y el Service Agent de Pub/Sub del proyecto (`service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com`) requería el rol `roles/iam.serviceAccountTokenCreator` sobre la service account de push para poder emitir los tokens OIDC con audiencia del servicio Cloud Run.

**Solución aplicada:**
1. Otorgar permiso `roles/run.invoker` a `pubsub-push-invoker` sobre el servicio Cloud Run `nequi-workers`.
2. Configurar las suscripciones push con `--push-auth-service-account` y `--push-auth-token-audience` apuntando a la URL base de Cloud Run.
3. Otorgar `roles/iam.serviceAccountTokenCreator` al Service Agent de Pub/Sub sobre la service account de push.

**Configuración afectada:**
- IAM del servicio Cloud Run `nequi-workers`
- Suscripción push `workers-projection`
- Suscripción push `workers-notifications`
- Service Account `pubsub-push-invoker`
- Service Agent de Pub/Sub (`service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com`)

**Validación realizada:**
Publicación de un evento en `wallet-events` y verificación en logs de Cloud Run de la recepción push con HTTP `204 NoContent`.

**Prevención futura:**
Verificar que toda suscripción push hacia Cloud Run privado cuente con la cadena completa de permisos IAM (Service Agent como Token Creator y Service Account como Run Invoker) junto con el audience correspondiente.

---

## 2026-09-23 - Envelope incorrecto en publicación manual a Pub/Sub debido a quoting de PowerShell

**Componente:**
PowerShell, publicación en topic `wallet-events`, endpoint `/internal/pubsub/projection`.

**Descripción del error:**
Al ejecutar pruebas manuales de publicación con `gcloud pubsub topics publish` desde PowerShell, `Nequi.Workers` registraba envelope malformado al intentar extraer el `DomainEvent`.

**Causa raíz:**
PowerShell procesa y desescapa las comillas dobles internas en cadenas JSON enviadas como argumentos de línea de comandos, alterando la sintaxis del JSON antes de entregarlo a la API de GCP y corrompiendo el campo `message.data`.

**Solución aplicada:**
Publicar mediante la API REST de Pub/Sub asegurando que la carga útil viaje con el campo `message.data` codificado en Base64.

**Archivos modificados:**
Ninguno en código. Técnica validada para scripts de prueba y llamadas HTTP.

**Validación realizada:**
`PushEnvelope.TryReadEvent` decodificó exitosamente el `DomainEvent` serializado en Base64 sin fallos de parseo.

**Prevención futura:**
Evitar el envío de cadenas JSON crudas con comillas complejas directamente desde PowerShell; utilizar siempre la estructura Base64 requerida por el contrato de Pub/Sub.

---

## 2026-09-23 - published_at en outbox_events no garantiza por sí mismo que Firestore ya esté proyectado

**Componente:**
Cloud Spanner (`outbox_events`), Outbox Worker, Cloud Firestore (`financial_movements`).

**Descripción del error:**
Tras confirmarse una transacción en Spanner y quedar registrado el timestamp en `published_at` dentro de `outbox_events`, una lectura inmediata en Firestore podía no encontrar todavía el documento proyectado.

**Causa raíz:**
El campo `published_at` en Spanner certifica que el `OutboxDispatcher` publicó exitosamente el evento en el topic de **Cloud Pub/Sub**. A partir de ese punto, la entrega vía suscripción push hacia `Nequi.Workers` y la subsiguiente escritura en Cloud Firestore operan de manera asíncrona desacoplada bajo consistencia eventual.

**Solución aplicada:**
Documentar con claridad que `published_at` certifica la publicación en el bus de mensajería y que el pipeline Spanner -> Pub/Sub -> Workers -> Firestore es eventualmente consistente. Se verificaron eventos concretos de prueba confirmando su posterior persistencia en Firestore.

**Archivos modificados:**
Documentación técnica del flujo y arquitectura.

**Validación realizada:**
Verificación en Firestore de eventos concretos de prueba proyectados en `financial_movements` y `notifications` tras la recepción del push en Workers.

**Prevención futura:**
No diseñar clientes ni pruebas que asuman consistencia transaccional inmediata entre Spanner y Firestore; el Read Model debe tratarse siempre bajo el paradigma de consistencia eventual.

---

## 2026-09-23 - Fallos de parseo en Bruno CLI provocados por codificación UTF-8 con BOM en archivos .bru

**Componente:**
Bruno CLI (`bru`), archivos de prueba `.bru` en `tests/bruno/`.

**Descripción del error:**
Al ejecutar `bru run` en la colección de pruebas, el CLI fallaba abruptamente indicando un error de sintaxis en la primera línea (`meta {`).

**Causa raíz:**
Algunos archivos `.bru` fueron guardados con Byte Order Mark (UTF-8 BOM), introduciendo los bytes invisibles `EF BB BF` al inicio del archivo, no soportados por el lexer de Bruno CLI.

**Solución aplicada:**
Convertir y guardar los archivos `.bru` bajo codificación UTF-8 estricta sin BOM.

**Archivos modificados:**
- Archivos `.bru` en [tests/bruno/](tests/bruno/)

**Validación realizada:**
Ejecución de `bru run` reconociendo y parseando todas las solicitudes sin errores léxicos.

**Prevención futura:**
Asegurar que los editores y scripts de tooling guarden siempre archivos de configuración y pruebas en UTF-8 sin BOM.

---

## 2026-09-23 - Fallos de invocación de Bruno CLI por sintaxis de ruta y directorio de ejecución

**Componente:**
Herramienta de pruebas Bruno CLI (`bru` / `bru.cmd`).

**Descripción del error:**
Al ejecutar la colección desde la línea de comandos se observaron dos errores distintos según la sintaxis y ubicación:
1. Dentro de `tests/bruno`, ejecutar:
   ```bash
   bru.cmd run . --env gcp
   ```
   produjo una ejecución vacía con `Requests: 0, Tests: 0, Assertions: 0`.
2. Desde la raíz del repositorio, ejecutar:
   ```bash
   bru.cmd run .\tests\bruno\ --env gcp
   ```
   produjo el error del CLI:
   `You can run only at the root of a collection`.

**Causa raíz:**
Bruno CLI exige posicionarse exactamente en el directorio raíz de la colección donde residen `bruno.json` y la carpeta `environments/`, y no requiere pasar el argumento de ruta `.` para ejecutar la colección completa.

**Solución aplicada:**
Posicionarse en el directorio `tests/bruno` y ejecutar sin el argumento `.`:
```bash
cd tests/bruno
bru.cmd run --env gcp
```

**Archivos modificados:**
- [tests/bruno/README.md](tests/bruno/README.md)

**Validación realizada:**
Ejecución exitosa de los 18 requests de la suite completa con salida `Requests: 18/18 PASS`.

**Prevención futura:**
Documentar con precisión el comando CLI validado (`cd tests/bruno` seguido de `bru.cmd run --env <entorno>`) y evitar pasar rutas relativas como argumento posicional en Bruno CLI.

---

## 2026-09-23 - Prueba de comprobante ajeno en GCP devolvía 200 OK debido a usuario participante

**Componente:**
`TransfersController` (`GET /v1/transfers/{id}/receipt`), `tests/bruno/transfers/get-transfer-receipt-forbidden.bru`.

**Descripción del error:**
El test diseñado para verificar la denegación de acceso a comprobantes de transferencias ajenas (`403 Forbidden`) respondía con `200 OK` en el entorno GCP.

**Causa raíz:**
En el entorno GCP, la variable `clientUser2` estaba asignada inicialmente a `idp-sub-laura`, quien fue precisamente la destinataria legítima de la transferencia previa (`TRF-LAU-0002`). La regla de negocio de autorización por recurso establece que un comprobante de transferencia es accesible tanto por el cliente emisor como por el cliente receptor (`origin == sub || dest == sub`). Al ser participante, `idp-sub-laura` tenía autorización legítima para consultar el comprobante.

**Solución aplicada:**
Configurar `clientUser2` en el entorno GCP (`tests/bruno/environments/gcp.bru`) con un cliente ajeno a la transacción (`idp-sub-outsider`), el cual no es emisor ni receptor, validando de forma rigurosa la denegación por recurso (`403 Forbidden`).

**Archivos modificados:**
- [tests/bruno/environments/gcp.bru](tests/bruno/environments/gcp.bru)

**Validación realizada:**
Ejecución en Bruno contra Cloud Spanner confirmando respuesta `403 Forbidden` (`code=FORBIDDEN`).

**Prevención futura:**
En pruebas de autorización basada en recursos (Resource Authorization), asegurar que los actores de prueba negativos sean identidades completamente externas a las entidades involucradas en el recurso.
