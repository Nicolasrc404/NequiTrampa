# Guía del MVP académico de NequiTrampa

Esta guía describe el procedimiento reproducible para levantar y demostrar el MVP académico en Windows, Android Studio y Expo Go, sin Google Cloud.

## A. Qué se está demostrando

NequiTrampa es un proyecto académico de billetera digital con dinero ficticio. El MVP permite:

- iniciar sesión con una identidad académica local;
- consultar perfil, billetera y saldo;
- realizar recargas simuladas;
- realizar transferencias ficticias;
- aplicar idempotencia básica;
- consultar movimientos y comprobantes;
- navegar entre Inicio, Movimientos y Perfil;
- conservar operaciones del Wallet local mediante JSON cuando se usa el script oficial.

La arquitectura también contiene Spanner, Firestore, Pub/Sub, Workers, Realtime, Backoffice e Identity Platform real. Esos componentes pertenecen al diseño ampliado y no son necesarios para probar localmente este MVP. No se usan bancos, pasarelas ni dinero real.

## B. Requisitos previos

El repositorio fija estas versiones o rangos para reproducir el entorno. Son referencias de compatibilidad del proyecto, no sustituyen la comprobación de la instalación local:

- .NET: proyectos con TargetFramework net10.0.
- Expo: ~58.0.19.
- React Native: 0.88.0.
- React: 19.3.0.
- TypeScript: ~6.0.3.
- expo-crypto: ~58.0.7.
- expo-secure-store: ~58.0.2.

El repositorio no fija una versión mínima de Node en un archivo de herramientas. Como mínimo, usa una versión compatible con Expo SDK 58 y la versión de npm que pueda procesar `package-lock.json`; el entorno probado para esta documentación reportó .NET SDK 10.0.403, Node v26.13.0, npm 11.20.0 y Git 2.56.0.windows.4. Esos números son versiones observadas, no una garantía de que sean obligatorias. Comprueba tu entorno:

    git --version
    dotnet --version
    node --version
    npm.cmd --version

Instala Android Studio, un emulador Android, Android SDK Platform-Tools y Expo Go. Comprueba ADB:

    $adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
    Test-Path $adb
    & $adb version
    & $adb devices -l

## C. Descargar el repositorio

Usa la rama del MVP, no main:

    git clone https://github.com/Nicolasrc404/NequiTrampa.git
    cd NequiTrampa
    git switch feature/mvp-academico-estable
    git rev-parse HEAD

Comprueba el HEAD actual de `feature/mvp-academico-estable`; esta guía no fija un SHA para evitar
confundir una versión histórica con la revisión académica vigente.

## D. Ejecutar backend local sin GCP

**Terminal 1 — raíz del repositorio (`NequiTrampa`)**

Desde esta terminal, en la raíz del repositorio:

    .\scripts\run-local.ps1 -Backend memory

El script configura Data__Backend=memory, desactiva el outbox local, desactiva tokens de identidad del Gateway y habilita la configuración demo solo para este entorno local. No necesita credenciales GCP.

El script inicia ocho procesos. La sinopsis histórica del script todavía dice “7 servicios”, pero el comportamiento actual incluye los siete servicios y el Gateway:

| Servicio | Puerto |
|---|---:|
| Wallet | 8080 |
| Profile | 8081 |
| Finance | 8082 |
| Backoffice | 8083 |
| Assistant | 8084 |
| Workers | 8085 |
| Realtime | 8086 |
| Gateway | 8087 |

Comprueba el Gateway:

    Invoke-WebRequest http://localhost:8087/health/live
    Invoke-WebRequest http://localhost:8087/health/ready

Los logs están en .local-run, incluidos Gateway.log, Wallet.log, Profile.log y archivos .err.log. Detén los servicios con:

    .\scripts\stop-local.ps1

Advertencia: sin -Backend memory, run-local.ps1 usa gcp por defecto y puede acceder a recursos reales. Para el MVP académico siempre usa -Backend memory.

## E. Persistencia de datos

En modo `memory`, el script establece:

    Academic__Persist=true
    Academic__StorePath=.local-run\academic-wallet.json

La ruta se resuelve bajo la raíz del repositorio y el script asigna explícitamente `Academic__StorePath` cada vez que se ejecuta; por eso puede sobrescribir un valor que ya existiera en la sesión de PowerShell. `AcademicWalletStore` carga automáticamente ese archivo al iniciar Wallet y guarda allí saldos, transferencias y recargas confirmadas. Usa un archivo temporal antes de reemplazar el JSON y protege las operaciones del proceso con un lock.

El perfil académico usa AcademicProfileDataStore en memoria; no se guarda en el JSON del Wallet. El archivo conserva las operaciones y saldos después de reiniciar ordenadamente el Wallet usando el mismo StorePath. La sesión móvil se guarda aparte en SecureStore como refresh token académico.

Al reiniciar ordenadamente el backend con el mismo comando, el archivo se vuelve a cargar y las operaciones permanecen; el perfil académico, en cambio, continúa en memoria. Antes de una prueba, respalda `.local-run\academic-wallet.json` fuera del repositorio sin publicarlo. Para una prueba limpia sin borrar datos, detén los servicios, conserva el archivo existente y ejecuta el script con una copia de trabajo aislada o un repositorio temporal. No basta con definir `Academic__StorePath` en la sesión: `run-local.ps1` lo sobrescribe con `.local-run\academic-wallet.json`. Para usar otra ruta de forma compatible, inicia el servicio Wallet sin `run-local.ps1` y proporciona `Academic__Persist=true` y `Academic__StorePath=<ruta absoluta>` al proceso; no cambies el script solo para una demostración. El JSON no debe subirse a GitHub ni compartirse si contiene datos de prueba identificables.

## F. Configurar frontend

**Terminal 3 — raíz del repositorio; cambia a `frontend` una sola vez y conserva esta terminal para Metro**

    cd frontend
    npm.cmd ci

Variables relevantes:

    EXPO_PUBLIC_API_URL
    EXPO_PUBLIC_DEMO_MODE
    EXPO_PUBLIC_ACADEMIC_MODE

Configuración validada con adb reverse:

    EXPO_PUBLIC_API_URL=http://127.0.0.1:8087
    EXPO_PUBLIC_DEMO_MODE=false
    EXPO_PUBLIC_ACADEMIC_MODE=true

frontend/.env.example contiene la plantilla. frontend/.env.local está versionado en esta rama y solo contiene configuración local del Gateway, sin secretos. Cada integrante debe revisar la URL para su equipo. No modificar su seguimiento como parte de esta guía.

Todas las variables EXPO_PUBLIC_* quedan embebidas en el bundle. Nunca pongas secretos, tokens privados o credenciales de servicio allí. Reinicia Metro con --clear después de cambiar variables.

## G. Conectar Android con Gateway

**Terminal 2 — raíz del repositorio o cualquier carpeta; no detengas la Terminal 1**

Chrome del emulador alcanzaba 10.0.2.2:8087, pero fetch desde Expo Go fallaba con java.net.ConnectException. La ruta validada fue adb reverse con URL 127.0.0.1:

    $adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
    Test-Path $adb
    & $adb devices -l
    & $adb reverse tcp:8087 tcp:8087
    & $adb reverse --list

emulator-5554 fue un identificador concreto, no universal. Con varios dispositivos:

    & $adb -s emulator-5554 reverse tcp:8087 tcp:8087
    & $adb -s emulator-5554 reverse --list

Repite el reverse después de reiniciar el emulador. Un teléfono físico por USB puede usar el mismo mecanismo si aparece en adb devices; no se validó en todos los modelos. La opción -Lan existe para LAN, pero no debe exponerse el backend públicamente y la ruta LAN no sustituye la validación por reverse.

## H. Iniciar Expo Go

En la misma **Terminal 3**, que ya está ubicada en `frontend`:

    npx expo start --clear

Abre el proyecto en Expo Go dentro del emulador. Usa r en Metro para recargar. --clear evita reutilizar el bundle y la configuración anteriores. Detén Metro con Ctrl+C. Si hay varias instancias, usa el identificador correcto con -s. DevTools no es requisito; si se abre en blanco, valida mediante Expo Go, Metro y .local-run.

## I. Credenciales académicas

Con EXPO_PUBLIC_ACADEMIC_MODE=true en Development, el cliente usa academicIdentityPlatform, no Identity Platform ni GCP. Solo las cuentas del catálogo académico pueden iniciar sesión.

Ejemplo no productivo:

    Correo: laura@demo.local
    Contraseña: DemoLaura123!

También están disponibles `carlos@demo.local` / `DemoCarlos123!` y `sofia@demo.local` / `DemoSofia123!`. `ana@demo.local` / `DemoAna123!` existe en el catálogo, pero su cuenta está inactiva y debe rechazarse. Un correo inexistente o una contraseña incorrecta muestran un mensaje genérico. El token es sintético y el backend local restringe las cabeceras demo al catálogo cuando se inicia con `run-local.ps1 -Backend memory`; el modo académico está bloqueado fuera de Development.

## J. Recorrido funcional

1. Ejecuta run-local.ps1 -Backend memory.
2. Configura adb reverse y abre Expo Go.
3. Inicia sesión con datos ficticios.
4. En Inicio consulta el saldo. Un usuario nuevo empieza con 1.250.000 COP, pero el valor depende del JSON existente.
5. Abre Perfil y vuelve a Inicio.
6. Realiza una recarga simulada y verifica el saldo.
7. Abre Movimientos.
8. Vuelve a Inicio y pulsa Transferir.
9. Escribe 10000 y verifica que se muestre 10.000 COP.
10. Selecciona un destinatario permitido, por ejemplo `CARL-9941`; también están disponibles `LAUR-5120`, `SOFI-3307` y la cuenta inactiva `ANA-3092` para comprobar rechazos.
11. Revisa la confirmación y confirma una sola vez.
12. Comprueba éxito, saldo y movimiento.
13. Abre el comprobante. En modo académico, Volver al inicio lleva a Wallet y Ver movimientos lleva a Movements_01.
14. Comprueba filtros Todos, Enviados y Recargas.
15. Abre el detalle de un movimiento.
16. Cierra sesión.

10.000 COP equivalen a 1.000.000 de centavos. Los importes usan enteros de centavos; no trates el saldo inicial como valor universal.
El historial académico recorre páginas de hasta 100 transferencias y combina las recargas del endpoint académico; no sustituye la proyección Firestore de la arquitectura ampliada.

## K. Compilación y pruebas automáticas

Frontend — **Terminal 4**, una terminal nueva abierta en la raíz del repositorio:

    Push-Location frontend
    npm.cmd run typecheck
    npm.cmd run test:unit
    Pop-Location

El resultado local de la última validación frontend de esta rama fue typecheck correcto y 292 pruebas unitarias aprobadas, 0 fallidas y 0 omitidas. Incluye contratos, sesión, idempotencia, movimientos académicos y navegación.

Backend — **Terminal 5**, una terminal nueva abierta en la raíz del repositorio:

    dotnet restore
    dotnet build Nequi.slnx -c Release
    dotnet test Nequi.slnx -c Release
    dotnet test tests/Nequi.Tests/Nequi.Tests.csproj --filter "FullyQualifiedName~WalletTests"

Durante las pruebas funcionales con Android, termina primero el recorrido y detén el backend después de guardar la evidencia. En Windows, los servicios .NET en ejecución pueden mantener DLL abiertas dentro de `bin` u `obj` y bloquear una compilación posterior. Para una compilación limpia, desde una terminal nueva en la raíz ejecuta:

    .\scripts\stop-local.ps1
    dotnet build Nequi.slnx -c Release
    dotnet test Nequi.slnx -c Release

La suite focalizada Wallet reportó 7 aprobadas. La suite completa histórica reportó 193 aprobadas, 1 fallida y 43 omitidas; el fallo fue ambiental por permisos de Windows Event Log en GatewayRouteTests.HealthEndpoints_ArePublic. Las omitidas requieren Spanner Emulator. No se debe presentar ese resultado histórico como suite completa aprobada.

No ejecutes Bruno/Newman con entorno GCP. No se incluyen pruebas automatizadas iOS, Web o Android.

## L. Problemas conocidos y soluciones

| Problema | Causa | Solución | Estado |
|---|---|---|---|
| adb no reconocido | Platform-Tools no está en PATH | Usar la ruta explícita del SDK | Resuelto en la guía |
| Gateway no iniciado | Procesos no levantados | Ejecutar run-local con memory | Resuelto |
| Puertos ocupados | Procesos anteriores | Detener procesos propios y revisar PIDs | Operativo |
| DLL bloqueadas | Un servicio usa bin/binarios | Detener servicios propios antes de compilar | Limitación ambiental |
| Timeout Expo Go | Ruta distinta a navegador | adb reverse y 127.0.0.1:8087 | Corregido |
| API URL incorrecta | localhost/10.0.2.2 no coincide | Usar URL según reverse | Corregido |
| Reverse perdido | Reinicio del emulador | Repetir adb reverse | Operativo |
| DevTools en blanco | Herramienta no necesaria | Usar Expo Go y Metro | No bloqueante |
| Sesión restaurada | SecureStore conserva refresh token | Usar Logout para probar login | Esperado |
| Skeletons infinitos | Movimientos dependía de clientId previo | Servicio académico carga Wallet directamente | Corregido |
| Tabs sin respuesta | Faltaban callbacks | Navegación centralizada en App.tsx | Corregido |
| crypto ausente | Hermes/Expo Go sin Web Crypto global | expo-crypto y error controlado | Corregido |
| HTTP 422 monto inválido | Monto vacío o cero | Introducir monto positivo | Corregido |
| Profile 500 en memory | Dependencia directa de SpannerDb | AcademicProfileDataStore | Corregido |
| Historial vacío | Finance/Firestore no lee Wallet memory | Combinar transfers/recharges en modo académico | Corregido para MVP |
| Cancelaciones al resolver clientId | Cambio de identidad durante carga | Descartar respuestas tardías | Mitigado |
| SafeAreaView deprecado | Warning de plataforma | No actualizar Expo solo por warning | Pendiente |
| Avisos de Expo | Sugerencias de versiones nuevas | No actualizar masivamente sin PR compatible | Pendiente |

## M. Seguridad y límites

- Usa cuentas, nombres y destinatarios ficticios.
- No uses tarjetas, cuentas bancarias, dinero real ni GCP.
- No publiques tokens, refresh tokens, logs sensibles ni JSON de persistencia.
- No uses Math.random para idempotencia.
- El modo memory/JSON no ofrece durabilidad ni seguridad de producción.
- La autenticación académica está restringida a Development y es deliberadamente simplificada.

## N. Checklist de aceptación

- [ ] Repositorio clonado.
- [ ] Rama feature/mvp-academico-estable seleccionada.
- [ ] npm ci completado.
- [ ] Backend memory iniciado.
- [ ] Gateway healthy.
- [ ] ADB conectado.
- [ ] adb reverse activo.
- [ ] Expo Go abierto.
- [ ] Login académico exitoso.
- [ ] Wallet funcionando.
- [ ] Recarga exitosa.
- [ ] Transferencia exitosa.
- [ ] Saldo actualizado.
- [ ] Movimientos visibles y filtrables.
- [ ] Comprobante consultable.
- [ ] Navegación del comprobante correcta.
- [ ] Logout correcto.
- [ ] Typecheck y pruebas unitarias ejecutados.

## Estado y alcance

La rama contiene un MVP académico funcional validado manualmente en Android según la validación del equipo y con pruebas frontend automatizadas. No es una aplicación bancaria real ni está lista para producción. Spanner, Firestore, Workers, Pub/Sub, Identity Platform real, iOS/Web, offline complejo y capacidades empresariales permanecen fuera del recorrido mínimo.
