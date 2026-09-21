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
