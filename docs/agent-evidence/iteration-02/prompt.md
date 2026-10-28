# Prompt Maestro — Iteración 2: Corrección y Formalización del Catálogo de Servicios Web/API por Rol

## Objetivo:
Auditar el estado real del repositorio, corregir inconsistencias del catálogo preliminar, diferenciar estrictamente Dominio Funcional de Rol y Unidad de Despliegue Físico, producir la matriz exhaustiva de endpoints con políticas de autorización, y generar los planes de prueba y deployment para alcanzar el nivel EXCELENTE de la rúbrica.

## Requerimientos Específicos:
1. Reclasificar `Notifications` como servicio TRANSVERSAL (fuera de SOPORTE).
2. Subordinar `Access` a `Profile/Identity` (`GET /v1/me/access`) sin asumir `sub == clientId` ciegamente.
3. Agrupar `Support Management` con escalación integrada.
4. Agrupar `Financial Operations` con Ledger Inquiry y Financial Audit Inquiry.
5. Mantener los cuatro roles congelados (`CLIENTE`, `SOPORTE`, `OPERADOR_FINANCIERO`, `ADMIN`) con separación de funciones.
6. Producir matriz completa con columnas: Dominio, Endpoint, HTTP, Rol, Policy, Resource Check, Persistencia Backend, Persistencia Local, Estado, Evidencia.
7. Evitar la proliferación de microservicios: consolidar en 4 APIs Cloud Run (`core-api`, `wallet-api`, `backoffice-api`, `assistant-api`) + `workers`.
8. Documentar contradicciones sin ocultarlas (ej. ausencia física de `database/` en árbol local).
