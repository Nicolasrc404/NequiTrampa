# Estado de la app y pendientes — sesión de pruebas en dispositivo real

> Generado durante una sesión larga de pruebas end-to-end en un teléfono físico (Android, build release) contra el backend real en GCP (`finanzas-mvp-2026`). Todo lo de las sesiones 1 y 2 quedó commiteado en `0ea6bfa` ("Rebranding a Lukas + revisión y fixes contra diseño de Figma"). La sesión 3 (módulo de registro, abajo) queda en un commit separado listo para `push`. Este archivo es el punto de retomada para la próxima sesión.

## Credenciales de prueba verificadas

Proyecto Identity Platform real: **`finanzas-mvp-2026`** (no `full-stack-2026`, ver hallazgo #6).

| Usuario | Contraseña | Rol |
|---|---|---|
| alejandro@demo.co | `NequiDemo2026!` | CLIENTE |
| laura@demo.co | `NequiDemo2026!` | CLIENTE |
| outsider@demo.co | `NequiDemo2026!` | CLIENTE |
| soporte@demo.co | `NequiDemo2026!` | SOPORTE |
| operador@demo.co | `NequiDemo2026!` | OPERADOR_FINANCIERO |
| admin@demo.co | `NequiDemo2026!` | ADMIN |

Transferencias/pagos reales ya probados movieron dinero real de prueba entre `alejandro@demo.co` y `laura@demo.co` (saldos actuales quedaron alterados, es esperado).

## ✅ Bugs encontrados y arreglados (verificados en el teléfono)

1. **Índice de Firestore faltante** (`financial_movements`: `clientId`+`occurredAt`+tiebreak `__name__` ASC) — causaba "Algo salió mal" en Movimientos. Creado en `finanzas-mvp-2026`.
2. **Navegación de catálogo Stitch en producción** (`Module1ScreenRenderer.tsx`): badge "STITCH", botón "Siguiente pantalla" y paginador de puntos quedaban visibles para usuarios reales. Ahora gateados detrás de modo demo.
3. **`BottomNav` tapado por la barra de navegación de Android** (bug intermitente de toques: a veces el sistema se quedaba con el toque en vez de la app). Arreglado con `SafeAreaProvider` + `useSafeAreaInsets()` en `BottomNav.tsx`.
4. **`nequi-profile` usaba datos de memoria (`Data__Backend=memory`)** en vez de Spanner real — mostraba "Usuario Academico" en vez del perfil real. Arreglado en el servicio desplegado **y** en `infra/deploy.sh` (traía el bug hardcodeado, así que iba a regresar en cada deploy).
5. **Backend intermitente "Your default credentials were not found"** en `nequi-finance` (carrera de credenciales en cold-start de Cloud Run). Arreglado con reintento/backoff en `src/Nequi.Shared/NequiHost.cs` (`CreateFirestoreDbWithRetry`). Desplegado y verificado.
6. **Dos proyectos GCP duplicados**: la documentación apuntaba a `full-stack-2026` pero la app real corre sobre `finanzas-mvp-2026` (gateway, Identity Platform, Spanner, todo). Sincronizado el cliente `outsider` faltante en `finanzas-mvp-2026`. Documentación actualizada (`infra/common.sh`, `README.md`, `infra/README.md`, `docs/guia-frontend-api.md`, `docs/despliegue-y-validacion-gcp.md`, `docs/firestore-smoke-test.md`, `src/Nequi.Wallet/README.md`, `src/Nequi.Workers/README.md`).
7. **Transferencias — varios bugs de navegación/datos**:
   - Botón "Revisar transferencia" navegaba de vuelta al selector de destinatario en vez de a la confirmación (`App.tsx`).
   - Se mostraba literalmente la palabra "Destinatario" como si fuera un nombre real cuando se usaba código manual (`Transfers02Screen.tsx`, `Transfers03Screen.tsx`).
   - Campo "Para" vacío mostraba un "." suelto (`Transfers01Screen.tsx`).
   - Placeholder de ejemplo de código era de estilo académico (`LAUR-5120`) en vez de formato real (`TRF-ALE-0001`).
8. **`expo-crypto` declarado en `package.json` pero nunca instalado** — el bug más grave de la sesión. Sin `crypto.getRandomValues`, **toda operación financiera que requiere `Idempotency-Key` fallaba silenciosamente antes de salir a la red** (transferencias, recargas). Instalado con `npx expo install expo-crypto`; requirió rebuild nativo completo para tomar efecto.
9. **Recargas deshabilitadas por política de entorno**: `Recharges:AllowSimulatedPaymentMethods` estaba en `false` (seguro por defecto, nunca activado para este entorno de prueba). Activado en `nequi-wallet`.
10. **Beneficiarios: cuenta de servicio sin permiso de escritura en Firestore** (`wallet-service` solo tenía `roles/datastore.viewer`). Se agregó `roles/datastore.user`.
11. **Beneficiarios/Metas/Presupuestos/Efectivo/Categorías eran completamente inalcanzables**: pantallas 100% construidas y funcionales, pero sin ningún botón/menú real que llevara a ellas. Se agregaron 5 accesos rápidos en la tarjeta de saldo de Inicio (`WalletBalanceCard.tsx`), decisión tomada junto contigo.
12. **El botón físico/gesto "Atrás" de Android cerraba la app entera** en vez de navegar a la pantalla anterior (no hay React Navigation, y `BackHandler` solo estaba cableado para un caso académico muy específico). Se agregó una pila de navegación genérica en `App.tsx` (`stateHistoryRef`) que intercepta `hardwareBackPress` en toda la app.
13. **Efecto secundario del fix #3**: al hacer `BottomNav` más alto, se rompió el cálculo de espacio reservado en pantallas con un botón de pie de página fijo calibrado al alto anterior (quedaban tapados). Arreglado en: `Budgets02Screen.tsx`, `Cash01Screen.tsx`, `Categories02Screen.tsx`.
14. **🔴 CRÍTICO — Movimientos no reflejaba NADA nuevo (transferencias, recargas, todo)**: el tópico Pub/Sub `wallet-events` existe en `finanzas-mvp-2026` y Spanner publicaba correctamente (`outbox_events.published_at` se llenaba), pero **no tenía ninguna suscripción** — nada escuchaba. `nequi-workers` llevaba 12+ horas sin ningún log de actividad. Causa: `infra/deploy.sh` solo crea las suscripciones (`workers-projection`, `workers-notifications`, `realtime-push`) cuando se despliega con target `workers`/`realtime`/`all`, y nunca se hizo así en este proyecto. Arreglado ejecutando `bash infra/deploy.sh workers` y `bash infra/deploy.sh realtime` (recrea los servicios y conecta las 3 suscripciones). **Verificado end-to-end**: una transferencia de prueba apareció en `GET /v1/movements` en menos de 8 segundos tras el fix.

## 🟡 Mismo patrón del punto 13, encontrado pero NO arreglado todavía

Estas pantallas tienen `BottomNav` + un `paddingBottom` fijo que puede quedar corto ahora que `BottomNav` es más alto. Hay que revisar cada una en el dispositivo y, si el botón queda tapado, aplicar el mismo fix (`useSafeAreaInsets` + sumar `insets.bottom` al padding fijo):

```
src/screens/analytics/Analytics01Screen.tsx .. Analytics10Screen.tsx (varias)
src/screens/recharges/Recharges08Screen.tsx
src/screens/budgets/Budgets01Screen.tsx, Budgets03Screen.tsx
src/screens/movements/Movements01Screen.tsx, Movements02Screen.tsx, Movements03Screen.tsx, Movements08Screen.tsx
src/screens/goals/Goals01Screen.tsx
src/screens/cash/Cash12Screen.tsx
src/screens/transfers/Transfers16Screen.tsx, Transfers18Screen.tsx
```

Nota: `Movements08Screen.tsx` ya se revisó visualmente y el botón "Reintentar" no se veía tapado, pero no se confirmó con `useSafeAreaInsets` explícito — vale la pena re-chequear.

## ⚠️ Nota importante sobre el hallazgo #14

Las operaciones que hiciste **antes** del fix (la transferencia de $3.000, la recarga de $300.000, el registro de efectivo de $50.000/$5.000, etc.) **nunca van a aparecer retroactivamente en Movimientos** — esos eventos de Pub/Sub ya se perdieron (no había nadie suscrito cuando se publicaron). El dinero sí se movió de verdad en Spanner (los saldos son correctos), solo el historial/proyección de esas operaciones específicas no quedó. Todo lo que hagas de ahora en adelante sí se proyecta correctamente.

Sobre el misterio de Efectivo ($50.000 escrito, $5.000 guardado): con el pipeline roto no se pudo diagnosticar bien en su momento. Vale la pena repetir la prueba ahora que el pipeline funciona, para descartar que fuera un problema real de conversión de centavos vs. un error de mi automatización de pruebas.

## 🔴 Encontrado, requiere tu decisión — no tocado

- **Borrar `full-stack-2026`**: quedó bloqueado por el harness (acción de alto impacto). Ejecuta tú mismo: `!gcloud projects delete full-stack-2026 --quiet` (recuperable 30 días por GCP si te arrepientes).
- **Notificaciones (cliente)**: el backend expone `GET /v1/notifications` y `PATCH /v1/notifications/{id}/read`, pero no existe ninguna pantalla/hook/servicio en el frontend. Funcionalidad completa por construir.
- **Conciliación (`/v1/reconciliation/**`) y Ajustes financieros (`/v1/financial-adjustments/**`)** en el backoffice: el backend los expone, pero no hay ninguna pantalla ni ruta en `BackofficeApp.tsx`. No se tocó el backoffice en esta sesión en absoluto.
- **Asistente**: deshabilitado a propósito con una alerta ("fuera del alcance del MVP académico"), aunque el backend sí tiene `/v1/assistant/summary` y `/v1/assistant/chat` listos. Parece decisión de producto ya tomada, no bug — pero confírmalo.

## ✅ Flujos probados de extremo a extremo con datos reales

| Módulo | Resultado |
|---|---|
| Login / sesión | OK — persiste, expira ~1h, se puede volver a iniciar sesión sin problema |
| Billetera (saldo) | OK — real, `CLOUD_SPANNER` |
| Movimientos | OK — real, vía Firestore/Finance |
| Perfil | OK — real, datos de Spanner (Alejandro Ramirez) |
| Transferencias | OK — transferencia real de $3.000 COP (`TRF-20261106-C17A3151470`) |
| Recargas | OK — recarga real de $300.000 COP (`RCG-20261106-396A665A7C89412E`) |
| Beneficiarios | OK — Laura agregada como beneficiaria real (`TRF-LAU-0002`) |
| Metas | OK — meta "ViajeCartagena" creada ($500.000, fecha 2027-06-30) |
| Categorías | OK — categoría "Mercado2" creada |
| Presupuestos | OK — presupuesto $200.000/mes para Mercado2, confirmado en el listado |
| Efectivo (Cash) | ⚠️ Se guardó un registro, pero por $5.000 en vez de los $50.000 escritos — repetir la prueba ahora que el pipeline de Movimientos está arreglado (ver nota arriba) |
| Movimientos (reflejo en vivo) | OK — **arreglado en esta sesión** (hallazgo #14). Verificado con una transferencia de prueba apareciendo en <8s. |

## Build / estado del repo

- Ningún cambio está commiteado (frontend, backend, infra, docs — todo en el working tree).
- El APK instalado en el teléfono de pruebas incluye TODOS los fixes del 1 al 13.
- El fix de `NequiHost.cs` (#5) solo se desplegó a `nequi-finance`. El mismo riesgo de cold-start existe potencialmente en `nequi-wallet`, `nequi-profile`, `nequi-assistant`, `nequi-backoffice` (comparten el mismo código en `Nequi.Shared`), pero no se ha observado el error ahí ni se redesplegaron.
- Cambios de IAM/env vars ya aplicados en vivo en `finanzas-mvp-2026` (ver lista de hallazgos arriba): no requieren redeploy, ya están activos.

## Siguiente paso inmediato al retomar (de la sesión 1, ver sesión 2 más abajo para el estado actual)

1. Repetir la prueba de "Registrar ingreso" en Efectivo con un monto claro (ej. $77.000) y confirmar que se guarda con el valor correcto Y que aparece reflejado donde corresponda, ahora que el pipeline de Pub/Sub funciona.
2. Revisar los botones de "Ver historial" / "Registrar gasto" dentro de Efectivo.
3. ~~Repasar visualmente contra Figma las pantallas ya probadas~~ → **hecho en la sesión 2 (ver abajo), cobertura 100% de los 30 módulos de Figma.**
4. Decidir sobre los 3 puntos de la sección 🔴 (borrado de proyecto, Notificaciones, Conciliación/Ajustes).
5. Opcional: redesplegar el fix de `NequiHost.cs` al resto de servicios `gcp`-backend si quieres cubrir el mismo riesgo de cold-start en todos lados.
6. Revisar `nequi-backoffice` — nunca se desplegó con wiring de suscripciones en esta sesión (no aplica, no publica eventos), pero confirma si el personal interno (soporte/operador/admin) también depende de Movimientos/Notificaciones para su trabajo diario.

---

# Sesión 2 (2026-11-07/08) — Rebranding "Lukas" + revisión completa contra Figma

> Esta sesión corrió en **dos consolas de Claude Code en paralelo** sobre el mismo repo: esta (revisión/reporte contra Figma) y otra (`nequitrampa-1e`, implementación + pruebas en el celular). Se coordinaron por mensajería entre sesiones. Nada de lo de abajo está commiteado todavía — sigue en el working tree.

## Rebranding "Lukas"

- Logo/ícono nuevo aplicado en `frontend/assets/` (icon, adaptive foreground/background/monochrome, favicon, splash) a partir del isotipo solo (sin texto) que diste. Fondo de marca `#0A0C0F`.
- `app.json`: `name`/`slug` → **Lukas**. Proyecto Android regenerado con `expo prebuild --clean` (ya no vale editar `android/` a mano, se regenera desde `app.json` — y `android/` sigue gitignored, no se commitea).
- `applicationId`/`namespace` Android se mantuvo `com.nequitrampa.app` (no se pidió cambiarlo).
- Quedaban 2 textos "NequiTrampa" visibles en UI (header de Analytics, subtítulo del login de backoffice) → corregidos a "Lukas".
- `frontend/.env.example`: corregido un comentario desactualizado que decía que la API key de Identity Platform venía de `full-stack-2026` (es `finanzas-mvp-2026`).

## Backend GCP — verificado, sin problemas

Proyecto real: **`finanzas-mvp-2026`** (confirmado otra vez, coincide con `infra/common.sh` y el hallazgo #6 de la sesión 1). Gateway Cloud Run responde correctamente (401 esperado sin token en `/v1/*`), Identity Platform API key válida. `gcloud` autenticado contra el proyecto correcto. No hizo falta corregir nada de conectividad.

## Usuario de prueba nuevo

Se creó una cuenta CLIENTE real y completa (Identity Platform + fila en Spanner `clients` + `wallet_accounts`), siguiendo el mismo mecanismo que `infra/seed-identity.sh` (uid = `idp-sub-juanca`, no corrido el script completo para no resetear las contraseñas de los demás):

| Campo | Valor |
|---|---|
| Correo | `juanca@demo.co` |
| Contraseña | `12345678` |
| Nombre | Juan Camilo Pedraza |
| Rol | CLIENTE |
| `client_id` | `44444444-4444-4444-8444-444444444444` |
| `auth_subject` | `idp-sub-juanca` |
| Código de transferencia | `TRF-JUA-0004` |
| Saldo inicial | $50.000 COP |

Probada end-to-end en el celular real por la otra sesión: login, billetera confirmada por el backend, todo OK.

## Revisión Figma ↔ código — cobertura 100% (30 módulos)

Metodología: comparación screenshot de Figma vs lectura de código fuente real, módulo por módulo (no solo frames aislados). Archivo fileKey de Figma: `TRTCtOwpFcBUB1oLOZ0Ael` ("nequi falso").

### 🔴 Hallazgos críticos

1. **Login real ≠ diseño de Figma.** `SessionGate.tsx` (el que ven los usuarios reales, conecta a `sessionManager.signIn()`) tenía un layout genérico, distinto al diseño de Figma. El componente que sí coincidía visualmente (`AccessForm.tsx` / pantalla `Access_01`) **solo era alcanzable cuando `EXPO_PUBLIC_DEMO_MODE=true`** (`App.tsx:287`) — en un build real (demo apagado) era literalmente inalcanzable, sin autenticación real conectada. El propio código lo admitía: *"La pantalla real de login queda BLOQUEADA hasta contar con diseño en Stitch."* → **Ya se unificó** (`SessionGate.tsx` modificado, 88+/48- líneas) por la otra sesión, validado en el celular.
2. **`Configuration` (9 pantallas) y `Projection Status` (5 pantallas) eran código muerto.** Ambos son wrappers de 1 línea sobre `Module1ScreenRenderer` con servicio real conectado al backend, pero sin ninguna ruta/botón que navegara ahí. → **Ya arreglado**: se agregaron 2 botones en Perfil (gateados por rol: Configuration solo ADMIN, Projection Status para SOPORTE/OPERADOR/ADMIN), validado que la ruta es genuinamente alcanzable en producción.
3. **`WalletBalanceCard` (tarjeta de Inicio) se desviaba fuerte de Figma**: diseño muestra 3 botones (Enviar/Recargar/Extracto); el código tenía 8 (parche histórico de la sesión 1, hallazgo #11, para hacer alcanzables Beneficiarios/Metas/Presupuestos/Efectivo/Categorías, que **Figma no contempla en ningún lado** — ni en Inicio ni en Perfil, confirmado explícitamente). → **Ya resuelto**: `WalletBalanceCard.tsx` recortado a 3 botones + nuevo componente `WalletQuickAccess.tsx` para los 5 accesos extra, validado en el celular con datos reales.
4. **Falta paso de confirmación (bottom-sheet) en Recargas y Beneficiarios**, mismo patrón UX en los dos: Figma muestra un sheet "Confirma tu recarga" / "¿Agregar a [nombre]?" con ícono, título, cuerpo y 2 botones (primario magenta, secundario outline) antes de ejecutar la acción; el código saltaba directo al resultado. → **Ya en desarrollo**: nuevo componente `ConfirmSheet.tsx` compartido, specs exactas (copy, colores, estructura) ya documentadas y pasadas a la otra sesión; `Recharges01Screen.tsx` y `Beneficiaries04Screen.tsx` ya tienen cambios en curso.
5. **Transfers — pantalla huérfana con copy incorrecto activo**: `Transfers10Screen.tsx` tiene el copy exacto de Figma para el error 422 "Límite superado"; la app solo navega a `Transfers11Screen.tsx` (copy distinto). Pendiente de corregir (un solo `setCurrentState` en `App.tsx`).

### 🟡 Notable

- Budgets: alertas automáticas (80%/excedido) no se disparan solas según el `health` real — pendiente, requiere decisión de diseño.
- Confirmado sin construir (backend listo, sin pantalla): **Reconciliation**, **Notifications** (ya sabíamos), + nuevos: **Sync** (offline de Efectivo), **Voice** (borradores de efectivo por voz), **Audit** como log global (solo existe por operación), **Support Cliente** (el cliente final no puede ver/crear sus propios casos de soporte, solo el backoffice).
- Bug de padding (`BottomNav` sin `useSafeAreaInsets`): **ya corregido** en Budgets01/02/03, Transfers16/18, Analytics01-10, Movements01/02/03/08, Goals01, Cash12, Recharges08, Categories01.

### 🟢 Sin hallazgos relevantes

Movements, Beneficiaries (lista/buscador), Cash (estados principales), Categories (resto), la mayoría de Transfers (formulario, comprobante, historial), Profile, Goals, Analytics, parser de montos COP (`utils/money.ts`, se descartó como causa del bug de "$50.000 guardado como $5.000" de la sesión 1 — no está en el frontend).

### Pantallas huérfanas confirmadas (pasada final, además de Configuration/Projection Status/Transfers10)

- **🔴 `Recharges_09`/`Recharges_10` — bug funcional real, no solo de Figma.** `Recharges09Screen.tsx` renderiza directamente `<RechargeEmptyView />` sin condición: el historial de recargas SIEMPRE muestra "vacío" sin importar los datos reales, porque nunca llama a `rechargesService.list()` (ya existe, `GET /v1/recharges`, listo para usar). `Recharges10Screen.tsx` (la variante "Historial vacío" real de Figma) queda sin usar. **Pendiente de construir**: la vista de lista real con fetch/loading/error, y recién ahí `Recharges_10` tiene sentido como su estado vacío genuino.
- **🟡 `Cash_06` "Revisa los datos (400)"** — el trigger existe (`App.tsx`, caso `'validation'` del submit de Efectivo) pero el código usa `Alert.alert()` en vez de navegar ahí, porque `Cash06Screen.tsx` es estático/demo (monto y error hardcodeados) y no recibiría el mensaje real. Para arreglarlo bien hay que agregarle props dinámicas a `Cash06Screen.tsx` primero.
- **🟢 `Movements_06` "Detalle no encontrado" y `Transfers_21` "Detalle ajeno"** — estructuralmente inalcanzables por diseño: ambos detalles reciben el objeto completo desde la lista ya cargada en memoria, nunca hacen fetch-by-id, así que un 404/403 es imposible con la arquitectura actual. Solo tendrían sentido si en el futuro se agrega deep-linking a un movimiento/transferencia específico. No requiere acción.

### Decisiones de producto pendientes (no son bugs, requieren que decidas)

- Patrón de navegación definitivo para los 5 módulos antes inalcanzables — ya resuelto con `WalletQuickAccess` (ver abajo), pero Figma no lo diseñó así. Confirmar que te gusta el patrón elegido.
- Qué hacer con "eliminar presupuesto": Figma lo diseña, el backend no tiene DELETE de presupuestos.
- Habilitar o no el Asistente (sigue apagado a propósito, decisión ya tomada, solo recordatorio).
- Si construir o no la lista real de Recargas ahora (`Recharges_09`, ver arriba) — es el único hallazgo de hoy con impacto funcional real, no solo visual.

## Lo que quedó efectivamente implementado y validado hoy (sesión 2)

Todo en el working tree, nada commiteado. La otra sesión (`nequitrampa-1e`) implementó y probó en el celular real con la cuenta `juanca@demo.co`:

- **Login unificado con Figma**: `SessionGate.tsx` reescrito con el diseño real de Access_01 (ícono, título, subtítulo, texto legal) + botón y pantalla stub de "Olvidé mi contraseña" (agregado por esta sesión).
- **`WalletBalanceCard.tsx` recortado a 3 botones** (Enviar/Recargar/Extracto, como Figma) + nuevo `WalletQuickAccess.tsx` para los 5 accesos que antes la saturaban.
- **Configuration y Projection Status ya alcanzables**: 2 botones nuevos en Perfil (gateados por rol) en `Module1ScreenRenderer.tsx`.
- **`ConfirmSheet.tsx` (nuevo, compartido)**: bottom-sheet de confirmación ya conectado en `Recharges01Screen.tsx` y `Beneficiaries04Screen.tsx`, validado end-to-end (recarga real de $300.000 confirmada en Movimientos).
- **`RechargeAmountPills` conectado** al formulario real de Recargas.
- **Bug de Transfers10/11 arreglado** (`App.tsx`): ahora navega al copy correcto del error 422.
- **Filtro de "Prioridad" en Support Management** (`CasesListScreen.tsx`, backoffice) — implementado client-side porque el backend no lo soporta como filtro de servidor.
- **Cuenta de prueba nueva**: `juanca@demo.co` / `12345678` (Juan Camilo Pedraza, CLIENTE, saldo $50.000 COP), creada en Identity Platform + Spanner (`clients` + `wallet_accounts`), probada end-to-end real.
- Todo el bug de padding (`BottomNav`) ya corregido en las pantallas que estaban pendientes.

## Sesión 3 — Módulo de registro ("Registrarme")

Pedido directo del usuario: auto-registro de clientes nuevos desde la app. No existía en absoluto (ni frontend ni backend, ni siquiera `/v1/auth/register`). Diseñado por una sesión, implementado y desplegado por esta.

**Decisión de seguridad**: el auto-registro público de Identity Platform sigue desactivado (confirmado con un test que devuelve `ADMIN_ONLY_OPERATION`). El backend crea el usuario con su propia cuenta de servicio — mismo mecanismo que `infra/seed-identity.sh` y `IdentityAdmin` de Backoffice. El cliente nunca habla directo con Identity Platform para crear cuentas.

**Backend** (`Nequi.Profile`):
- `POST /v1/auth/register` (`RegisterController.cs`, `[AllowAnonymous]`) — valida email/password/nombre (422), chequea duplicado contra Identity Platform (409), crea la identidad (`IdentityRegistrar.cs`) y el cliente en Spanner (`ProfileDataStore.CreateClientAsync`, transacción `clients` + `wallet_accounts`, con rollback del usuario de Identity Platform si falla la escritura en Spanner). Devuelve 201 con el `ProfileDto` completo.
- Gateway: ruta `/v1/auth` agregada al cluster `profile` (`Nequi.Gateway/Program.cs`).
- **IAM aplicado en producción**: se agregó `roles/firebaseauth.admin` a `profile-service@finanzas-mvp-2026.iam.gserviceaccount.com` (antes solo lo tenía `admin-service`). Sin esto el endpoint daba 500.
- Bug encontrado y corregido durante las pruebas: crear un usuario con `localId` explícito **no** es `accounts:signUp` (eso da 404 fuera del cliente público) — es un POST directo a `.../accounts` sin sufijo, igual que hace `seed-identity.sh`.
- **Validado end-to-end contra el backend real** (`curl` directo al gateway): registro exitoso (201, con `transferCode` y `walletId` generados), duplicado correctamente rechazado (409), y login inmediato con la cuenta recién creada (200, token real de Identity Platform).
- `nequi-profile` y `nequi-gateway` ya redeployados en Cloud Run con estos cambios — **en producción, no solo en el working tree**.

**Frontend**:
- `services/session/registration.ts` (nuevo): cliente HTTP sin autenticar (`skipAuth`) contra `/v1/auth/register`.
- `SessionGate.tsx`: nueva pantalla "Crea tu cuenta" (Nombre/Apellido/Correo/Contraseña/Confirmar), link "¿No tienes cuenta? Regístrate" en el login. Al registrarse con éxito, llama a `sessionManager.signIn()` automáticamente (no hace falta loguearse de nuevo). Reusa el mismo lenguaje visual que el resto del gate (ícono circular, card blanca, botón magenta). Figma no tiene ningún frame de registro — diseño nuevo sobre el sistema visual existente, no hay mockup de referencia que contrastar.
- Validado visualmente en el celular (la pantalla renderiza bien); el flujo de fondo quedó probado por `curl` contra el backend real, no se alcanzó a probar el submit completo desde la UI del celular en esta sesión (el dispositivo se desconectó repetidamente).

**Pendiente de esta sesión**:
1. Probar el submit completo desde la UI del celular (crear cuenta → auto-login → ver Inicio con saldo $0) — el backend ya está validado, falta solo el último tramo de la UI real.
2. Decidir si el username generado (`local-part del email`, con sufijo numérico si choca) necesita algún criterio distinto — hoy es automático, no lo elige el usuario.
3. No hay página de "verificar correo" — `emailVerified` se marca `true` directo al crear (mismo criterio que `seed-identity.sh`, no es un bug nuevo).

## Siguiente paso inmediato al retomar (sesión 4)

1. Probar el registro end-to-end desde el celular (ver arriba) para cerrar la sesión 3.
2. Decidir si se construye la lista real de Recargas (`Recharges_09`, hallazgo 🔴 de la sesión 2) — es trabajo de tamaño mediano, no un one-liner.
3. Agregar "Olvidé mi contraseña" con lógica real (hoy sigue como stub visual sin backend).
4. Props dinámicas en `Cash06Screen.tsx` si se quiere reemplazar el `Alert.alert()` del error 400 de Efectivo.
5. Alertas automáticas de Budgets (80%/excedido) — requiere decisión de diseño.
6. Confirmar que el patrón de `WalletQuickAccess` es el definitivo (o rediseñarlo).
7. Módulos backend-listos-sin-pantalla, si se quieren construir: Reconciliation, Notifications, Sync, Voice, Audit global, Support Cliente.
8. Seguir pendientes de la sesión 1 (Efectivo con monto claro, borrado de `full-stack-2026`, cold-start en otros servicios, `nequi-backoffice`).
