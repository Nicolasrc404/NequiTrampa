# Prompt Maestro — Iteración 1: Fundamento Arquitectónico y Esqueleto de Wallet-API

## Objetivo:
Establecer la arquitectura del sistema financiero, consultar el cuaderno NotebookLM "FullStack" (RFC 9110, RFC 9457, RFC 8725, OWASP), redactar ARCHITECTURE.md justificando Spanner vs. Firestore vs. SQLite y Cloud Run, e implementar la seguridad JWT con RBAC y el esqueleto de `wallet-api` en C# / ASP.NET Core 8.

## Requerimientos Clave:
1. `ARCHITECTURE.md` con justificación técnica profunda.
2. Configuración de seguridad JWT (RFC 8725) y políticas de autorización con principio Deny-by-Default.
3. Controladores para Wallet, Transfers y Recharges con `[Authorize(Roles = "CLIENTE")]`.
4. Manejo homogéneo de respuestas de error con RFC 9457 (Problem Details).
5. Documentación de contratos, OpenAPI y uso obligatorio de `Idempotency-Key`.
