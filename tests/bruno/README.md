# Colección de Pruebas Automatizadas en Bruno / Postman
## Validación de Consumo API (40% de la Rúbrica Académica)

Esta colección contiene las solicitudes HTTP para validar tanto los caminos felices (*happy paths*) como los escenarios de error controlado bajo **RFC 9457 (Problem Details)** y seguridad **RFC 8725**.

---

## 1. Estructura de la Colección

```
tests/bruno/
├── bruno.json
├── environments/
│   ├── local.json          # URL: http://localhost:5000 o https://localhost:7001
│   └── gcp.json            # URL: https://wallet-api-xxxx.run.app
│
├── health/
│   ├── get-health-live.bru # 200 OK (Liveness)
│   └── get-health-ready.bru# 200 OK (Readiness parcial/dependencias)
│
├── authorization/
│   ├── get-wallet-unauthorized.bru # 401 Unauthorized (Sin JWT o token inválido)
│   └── get-wallet-forbidden.bru    # 403 Forbidden (Rol no autorizado, ej. SOPORTE en transferencias)
│
├── wallet/
│   ├── get-wallet.bru      # 200 OK
│   └── get-balance.bru     # 200 OK (Saldo oficial Spanner)
│
├── transfers/
│   ├── post-transfer-success.bru               # 201 Created
│   ├── get-transfers.bru                       # 200 OK
│   ├── get-transfer-by-id.bru                  # 200 OK
│   ├── get-transfer-receipt.bru                # 200 OK
│   ├── post-transfer-no-idempotency.bru        # 400 Bad Request (Falta Idempotency-Key)
│   ├── post-transfer-limit-exceeded.bru        # 422 Unprocessable (Monto > $2.000.000 COP)
│   ├── post-transfer-idempotency-conflict.bru  # 409 Conflict (Misma clave, payload distinto)
│   └── post-transfer-inactive-destination.bru  # 422 Unprocessable (Destino inactivo)
│
└── recharges/
    ├── post-recharge-success.bru               # 201 Created
    ├── get-recharges.bru                       # 200 OK
    └── post-recharge-no-idempotency.bru        # 400 Bad Request
```

---

## 2. Parámetros de Entorno y Variables Seguras

> [!IMPORTANT]
> Ningún token JWT real ni secreto se versiona en el repositorio.
> Las variables `jwtTokenCliente` y `jwtTokenSoporte` se configuran en runtime o mediante el entorno local de Bruno.
