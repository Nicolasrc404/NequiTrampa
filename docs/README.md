# Documentación de NequiTrampa

Índice de la documentación del repositorio. Cada sección enlaza la fuente de
verdad correspondiente; **no** se duplican contenidos aquí.

---

## 1. Estado del proyecto (AS-IS verificado)

| Documento | Alcance |
|---|---|
| [README principal](../README.md) | Visión general, estado por componente, proyectos GCP, reglas de dominio |
| [Arquitectura](../ARCHITECTURE.md) | Justificación técnica y análisis arquitectónico profundo |
| [Guía de despliegue y validación en GCP](despliegue-y-validacion-gcp.md) | Flujo E2E, multi-proyecto, IAM/OIDC, scripts, resultados Bruno |

## 2. Servicios

| Documento | Alcance |
|---|---|
| [Nequi.Wallet](../src/Nequi.Wallet/README.md) | Microservicio transaccional financiero (Spanner autoritativo) |
| [Nequi.Workers](../src/Nequi.Workers/README.md) | Pipeline asíncrono post-Spanner (outbox, proyecciones, notificaciones, reportes) |

## 3. Infraestructura

| Documento | Alcance |
|---|---|
| [Scripts de infraestructura](../infra/README.md) | `setup.sh`, `deploy.sh`, `cloudbuild.yaml`, `smoke-test.sh`, multi-proyecto |

## 4. Base de datos

| Documento | Alcance |
|---|---|
| [Cloud Spanner](../database/spanner/README.md) | Esquema `finanzas-core`: 7 tablas, invariantes financieros, inmutabilidad del ledger |

## 5. Pruebas

| Documento | Alcance |
|---|---|
| [Smoke testing Firestore](firestore-smoke-test.md) | Prueba sintética de las proyecciones en Firestore |
| [Suite Bruno](../tests/bruno/README.md) | Requests HTTP automatizados contra los servicios en GCP |

## 6. Operación

| Documento | Alcance |
|---|---|
| [Troubleshooting](../TROUBLESHOOTING.md) | Bitácora de incidentes y soluciones |

---

## 7. Evidencia histórica e investigación

| Directorio | Estado | Instrucción |
|---|---|---|
| [`agent-evidence/`](agent-evidence/) | Snapshots históricos por iteración de agentes | **NO modificar** |
| [`research/`](research/) | Decisiones de selección tecnológica y contexto | **NO modificar** |

Estos directorios documentan el proceso; el estado vigente y verificado se
refleja exclusivamente en los documentos AS-IS de las secciones 1 a 6.
