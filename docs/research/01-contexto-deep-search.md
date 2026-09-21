# Deep Search 01: Contexto de Negocio, Objetivos y Modelo de Datos Financiero
## Proyecto NequiTrampa — Arquitectura Financiera sobre Google Cloud Platform

---

## 1. Contexto y Objetivos del Proyecto

**NequiTrampa** es una plataforma financiera digital de dinero simulado (moneda única: **COP**), diseñada con estándares de grado bancario y principios de **Clean Architecture**, **Domain-Driven Design (DDD)** y **Zero Trust Security**.

El propósito central de la arquitectura es demostrar la **estricta separación de responsabilidades entre la verdad contable inmutable y la experiencia de usuario dinámica**, garantizando que los fallos de red o de componentes visuales jamás corrompan la integridad matemática del dinero.

### Objetivos Fundamentales:
1. **Consistencia Contable Absoluta**: Cumplimiento del principio de partida doble ($\sum \Delta = 0$) en transacciones monetarias y saldos estrictamente no negativos (`current_balance >= 0`).
2. **Inmutabilidad Financiera**: Prohibición terminante de mutaciones directas (`PATCH /wallet/balance`) o eliminaciones (`DELETE /transfers/{id}`). Toda corrección se realiza vía operaciones formales compensatorias (`REVERSAL`, `ADMIN_ADJUSTMENT`).
3. **Idempotencia Distribuida**: Protección contra cobros dobles o reintentos automáticos de red mediante el encabezado `Idempotency-Key` evaluado a nivel de base de datos.
4. **Principio de Mínimo Privilegio (PoLP)**: Separación estricta de funciones entre los 4 roles del sistema (`CLIENTE`, `SOPORTE`, `OPERADOR_FINANCIERO`, `ADMIN`). Ningún rol tiene superpoderes que mezclen administración con contabilidad.
5. **Aislamiento de IA y Voz**: La IA generativa (Gemini / Vertex AI) y el procesamiento de voz (Speech-to-Text) operan exclusivamente en modo consultivo y de borrador; carecen de permisos IAM y endpoints de mutación financiera.

---

## 2. Separación de Persistencias: Spanner vs. Firestore vs. SQLite

La arquitectura define tres planos de almacenamiento, cada uno con una función técnica insustituible:

```
+-------------------------------------------------------------------------------+
| PLANO 1: NÚCLEO FINANCIERO AUTORITATIVO (Google Cloud Spanner)                |
| - Verdad contable y matemática.                                               |
| - Consistencia externa global con Strict Serializability (TrueTime).          |
| - Ledger por partida doble (LedgerOperations, LedgerEntries).                 |
| - Saldos oficiales inmutables y límites diarios transaccionales.              |
| - Idempotencia persistente y Transactional Outbox.                            |
+---------------------------------------+---------------------------------------+
                                        | Transactional Outbox -> Pub/Sub
                                        v
+-------------------------------------------------------------------------------+
| PLANO 2: EXPERIENCIA Y PROYECCIONES DE LECTURA (Google Cloud Firestore)       |
| - Vistas desnormalizadas y optimizadas para lectura de UI.                    |
| - Proyecciones de movimientos (financial_movements).                          |
| - Catálogo y categorías personalizadas (categories).                          |
| - Metas de ahorro y presupuestos de gasto (budgets, goals).                   |
| - Registro de efectivo personal (cash_movements, cash_balance).               |
| - Evolución documental de casos de soporte (SupportCases, messages).          |
+---------------------------------------+---------------------------------------+
                                        | Sincronización Parcial Offline
                                        v
+-------------------------------------------------------------------------------+
| PLANO 3: CACHÉ LOCAL Y COLA OFFLINE (SQLite en Dispositivo Móvil)             |
| - Almacenamiento local embebido en el teléfono.                               |
| - Caché de lectura: categorías, presupuestos y "último saldo sincronizado".   |
| - Cola de eventos offline: gastos de efectivo físico (cash_sync_queue).       |
| - REGLA: Nunca autoriza transferencias ni recargas críticas en modo offline.  |
+-------------------------------------------------------------------------------+
```

---

## 3. Fuentes Técnicas Consultadas en NotebookLM (FullStack)

Para estructurar las decisiones técnicas, se consultaron activamente las 42 fuentes indexadas en el cuaderno **FullStack** (`d19ab39c-c75e-4722-9e7b-2ff7ca8cfa5e`):
* **RFC 9110**: Semántica HTTP y uso estricto de códigos de respuesta.
* **RFC 9457**: Problem Details for HTTP APIs (`application/problem+json`).
* **RFC 8725**: JSON Web Token Best Current Practices (validación estricta de algoritmos, emisor, audiencia y expiración).
* **OWASP Top 10 API Security Risks (2023)** y **OWASP ASVS 5.0**: Controles de autorización por objeto (BOLA), autenticación rota y prevención de fugas de información interna.
* **Designing Data-Intensive Applications (DDIA)** de Martin Kleppmann: Modelos de concurrencia serializable, consenso distribuido y el patrón Transactional Outbox.
* **Google SRE Book**: Principios de confiabilidad, monitoreo y resiliencia en sistemas distribuidos.
