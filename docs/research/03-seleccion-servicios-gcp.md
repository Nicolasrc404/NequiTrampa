# Deep Search 03: Justificación de Servicios de Infraestructura en Google Cloud Platform
## Selección Arquitectónica de Componentes Serverless y Persistencia

---

## 1. Google Cloud Spanner (Núcleo Financiero Autoritativo)

### ¿Por qué Spanner y no Cloud SQL (PostgreSQL/MySQL) o AlloyDB?
* **Strict Serializability Asistida por Hardware (TrueTime)**: Los motores relacionales convencionales dependen de relojes lógicos o NTP para ordenar transacciones entre réplicas, lo que genera ventanas de vulnerabilidad a *Clock Drift* y transacciones concurrentes desordenadas. Spanner utiliza osciladores atómicos y receptores GPS en los datacenters de Google para garantizar consistencia externa real: si una transacción $T_2$ ocurre después de $T_1$, el commit timestamp de $T_2$ es estrictamente superior en cualquier réplica global.
* **Escalabilidad Horizontal sin Sharding Manual**: Cloud SQL requiere sharding manual de cuentas para escalar más allá de una sola máquina, lo que destruye las garantías transaccionales entre shards (por ejemplo, transferencias entre clientes en shards distintos). Spanner maneja sharding y transacciones distribuidas de forma transparente y atómica (Paxos de 2 fases).
* **Ausencia de Bloqueos de Lectura**: Las lecturas en Spanner no bloquean las escrituras ni viceversa, permitiendo auditorías de balances sin degradar la tasa de transferencias de la plataforma.

---

## 2. Google Cloud Firestore (Experiencia de Usuario y Proyecciones)

### ¿Por qué Firestore y no MongoDB Atlas o Bigtable?
* **Integración Serverless y Modelo de Costos**: Firestore escala a cero y ofrece un tier gratuito generoso (50.000 lecturas/día), ideal para un MVP académico, sin los costos fijos mensuales de clústeres dedicados de MongoDB Atlas o instancias de Bigtable.
* **Escuchadores Reactivos en Tiempo Real (*Snapshots*)**: La app móvil en React Native se suscribe directamente a cambios documentales, permitiendo que la interfaz se actualice de inmediato cuando el `Projection Worker` inserta un nuevo movimiento.
* **Aislamiento del Efectivo Personal**: Los movimientos de efectivo físico son registros personales de control de gastos no respaldados por reservas bancarias. Almacenarlos en Firestore evita sobrecargar Spanner con consultas analíticas o categorizaciones personales.

---

## 3. Google Cloud Run (Plataforma de Ejecución de Contenedores)

### ¿Por qué Cloud Run y no Google Kubernetes Engine (GKE) o Cloud Functions?
* **Evita Sobrecarga de Operaciones (No K8s Overhead)**: Para un equipo ágil, administrar planos de control de Kubernetes, nodos, ingress controllers y service meshes representa un gasto operativo desproporcionado. Cloud Run abstrae la infraestructura y permite desplegar contenedores OCI estándar en segundos.
* **Soporte de WebSockets y Peticiones de Larga Duración**: A diferencia de Cloud Functions (que tiene restricciones severas de timeout y conexiones bidireccionales), Cloud Run soporta WebSockets de forma nativa, permitiendo que `realtime-service` mantenga canales dúplex activos hacia los clientes móviles.
* **Escalado a Cero y Concurrencia por Instancia**: Cloud Run permite procesar hasta 80 peticiones concurrentes por contenedor y reduce a cero las instancias en reposo, optimizando drásticamente el consumo de presupuesto.

---

## 4. Google Cloud Pub/Sub (Bus de Mensajería para Transactional Outbox)

* **Desacoplamiento Fiable**: El `Outbox Worker` lee eventos atómicos confirmados en Spanner y los publica en Pub/Sub. Si Firestore o el servicio WebSocket caen temporalmente, Pub/Sub retiene los mensajes de forma persistente y garantiza entrega *at-least-once*, permitiendo a los consumidores reintentar sin comprometer la transacción original de Spanner.
* **Dead Letter Queues (DLQ)**: Permite aislar mensajes con esquemas incompatibles o fallos de procesamiento reiterados para su posterior inspección por el operador financiero.

---

## 5. Google Cloud Identity Platform (Autenticación e Identidad Administrada)

* **Separación entre Identidad y Datos de Negocio**: Identity Platform resuelve el registro, login por correo/contraseña, verificación de email y TOTP MFA, emitiendo tokens JWT firmados criptográficamente.
* **El Backend no Custodia Credenciales**: Ningún servicio de ASP.NET Core almacena contraseñas ni hashes salados; únicamente valida los claims criptográficos (`sub`, `email`, `role`) del JWT según las recomendaciones de RFC 8725.

---

## 6. Google Cloud API Gateway (Perímetro de Seguridad y Enrutamiento)

* **Validación Criptográfica Perimetral**: Inspecciona los tokens JWT en el borde de la red antes de que las peticiones lleguen a Cloud Run, mitigando ataques de denegación de servicio (DoS) por peticiones no autenticadas.
* **Punto Único de Entrada**: Oculta la topología interna de microservicios y expone un contrato público unificado bajo `/v1/...`.

---

## 7. Google Secret Manager (Custodia Criptográfica de Secretos)

* **Prohibición Absoluta de Secretos en Repositorio**: Las cadenas de conexión del emulador/instancia de Spanner, credenciales de service accounts y llaves de cifrado se inyectan en runtime mediante variables de entorno o la API de Secret Manager, asegurando cumplimiento estricto con NIST SP 800-218 y OWASP API Security.
