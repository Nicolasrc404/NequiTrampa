# Nequi.Wallet (wallet-api)

Pendiente (otra tarea). Contenedor de despliegue: `wallet-api`.

Escribe transferencias/recargas en Spanner **y el evento en `outbox_events` en la misma transaccion**. El Outbox Worker (`Nequi.Workers`) lo publica a Pub/Sub. Contrato del evento: `Nequi.Shared/Events/DomainEvent.cs` (un evento por cliente afectado, `amountCents` con signo, COP). Usa `RequireIdempotency()` de `Nequi.Shared`.
