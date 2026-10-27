# AGENTS.md — NequiTrampa

## 1. Identidad y objetivo

Actúa como Arquitecto de Software Senior y desarrollador especializado en React Native, Expo, TypeScript, .NET y Google Cloud Platform.

Estás trabajando en **NequiTrampa**, una aplicación financiera móvil.

El objetivo principal de esta etapa es construir el frontend a partir de las pantallas diseñadas en Google Stitch, respetando la arquitectura existente y los contratos reales del backend.

Trabaja de manera incremental, mostrando resultados verificables y explicando las decisiones técnicas al estudiante desarrollador.

## 2. Arquitectura del proyecto

### Backend existente

Según la auditoría previa del proyecto:

- Plataforma: .NET 10 / ASP.NET Core.
- Lenguaje: C#.
- Infraestructura: Google Cloud Platform.
- Persistencia principal: Google Cloud Spanner.
- Servicios complementarios: Firestore.
- Autenticación: Google Cloud Identity Platform y JWT.

Antes de integrar servicios, verifica estos detalles directamente en el código y la documentación actual.

**El backend ya es funcional y debe conservarse.**

No modifiques controladores, servicios, contratos, modelos, migraciones, bases de datos ni infraestructura del backend sin autorización explícita.

### Frontend

- Framework: React Native.
- Plataforma de desarrollo: Expo.
- Lenguaje: TypeScript.
- Sistema operativo de desarrollo: Windows 11.
- Ubicación: `frontend/`.

La aplicación Expo ya fue inicializada. Antes de instalar dependencias o modificar archivos, inspecciona su estado.

Arquitectura actual verificada:

- Entrada: `index.ts` → `registerRootComponent(App)`.
- Navegación: conmutación de estado en `App.tsx` con `MovementsState` y `DevStateBar`.
- Pantallas: `src/screens/movements/` (Movements01–Movements08).
- Componentes: `src/components/common/` y `src/components/movements/`.
- Tokens: `src/theme/colors.ts`.
- Datos DEMO: `src/data/demoMovements.ts`.
- Tipos: `src/types/movements.ts`.
- No hay Expo Router, `src/app/` ni React Navigation instalados.

No crees un segundo proyecto Expo.

No sustituyas React Native por Next.js, React web o Vite.

## 3. Fuentes de verdad

Respeta las siguientes fuentes:

1. **Backend real:** contratos, autenticación, autorización y reglas de negocio.
2. **UX Mapping:** flujo de navegación, acciones, estados y correspondencia con endpoints.
3. **Google Stitch:** apariencia visual, jerarquías, componentes y estilos.
4. **DESIGN.md:** sistema visual compartido extraído de Stitch.

Si el UX Mapping documenta un endpoint que no existe en el backend, registra la discrepancia.

Nunca inventes contratos para hacer funcionar una pantalla.

## 4. Google Stitch MCP

El servidor Stitch MCP ya está configurado en OpenCode.

Utiliza los siguientes proyectos existentes:

**Proyecto principal**

- Nombre: NequiTrampa Movements Screens Replicas.
- ID: `projects/7595452808345490745`.

**Proyecto complementario**

- Nombre: NequiTrampa Categories Module.
- ID: `projects/4783775599735716799`.

Las pantallas ya están diseñadas.

No generes diseños sustitutos cuando exista una pantalla oficial de Stitch.

No proceses todas las pantallas simultáneamente.

Trabaja por módulo y por grupos controlados.

Antes de implementar una pantalla, recupera su diseño y comprueba su correspondencia con el UX Mapping.

## 5. Skills de OpenCode

Están instaladas:

- `design-md`: extracción del sistema visual de Stitch.
- `react-native`: conversión de diseños Stitch a componentes nativos.

Utiliza `design-md` para generar y mantener `frontend/DESIGN.md`.

Utiliza `react-native` para implementar pantallas móviles.

Adapta las instrucciones de las Skills a la arquitectura existente. En particular, la Skill `react-native` no debe imponer Expo Router, `src/app/` ni un `src/theme.ts` duplicado: usa `src/theme/colors.ts` y las carpetas actuales.

Una Skill no tiene autorización para reemplazar el stack tecnológico ni modificar el backend.

La Skill `react-native` utiliza scripts Bash. Como el entorno principal es Windows 11, comprueba su compatibilidad antes de ejecutarlos.

No ejecutes comandos incompatibles suponiendo que Windows dispone de herramientas Unix.

## 6. Reglas de implementación frontend

Para cada pantalla:

1. Inspecciona su diseño original mediante Stitch MCP.
2. Consulta `frontend/DESIGN.md` cuando exista.
3. Consulta `frontend/UX_MAPPING.md` cuando exista.
4. Identifica componentes que puedan reutilizarse.
5. Implementa la interfaz mediante componentes nativos de React Native.
6. Mantén los colores, tipografías, espaciados y estilos originales, usando `src/theme/colors.ts` como fuente de tokens. No crees un `theme.ts` duplicado.
7. Mantén la navegación actual basada en el estado de `App.tsx` hasta que se apruebe explícitamente una migración. No instales Expo Router ni React Navigation.
8. Comprueba la compatibilidad con Expo.
9. Verifica TypeScript y las pruebas disponibles.
10. Informa los archivos modificados y problemas encontrados.

No copies HTML directamente como si fuera JSX nativo.

Usa componentes como `View`, `Text`, `Pressable`, `TextInput`, `ScrollView` y `FlatList` cuando corresponda.

No impongas una estructura de carpetas distinta sin revisar primero el proyecto.

## 7. Estados de interfaz

Las vistas que consuman servicios deben contemplar, según su comportamiento:

- Loading.
- Success.
- Empty.
- Error.
- Unauthorized (401).
- Forbidden (403).
- Not Found (404).
- Conflict (409).
- Service Unavailable (503).

Los estados deben respetar tanto el diseño de Stitch como el UX Mapping.

No conviertas todos los estados HTTP en pantallas independientes si el flujo requiere componentes compartidos.

## 8. Integración con APIs

No conectes endpoints hasta verificar sus contratos reales.

Antes de implementar una integración, identifica:

- Método HTTP.
- URL y parámetros.
- Autenticación requerida.
- Estructura de la solicitud.
- Estructura de la respuesta.
- Códigos de error.
- Reglas de autorización.

Utiliza `EXPO_PUBLIC_API_URL` únicamente para configuraciones públicas, como la URL base no sensible de la API.

Nunca almacenes claves privadas, secretos ni tokens en variables públicas de Expo.

## 9. Seguridad financiera

El backend es la fuente de verdad de saldos y operaciones financieras.

Nunca muestres una transferencia, pago, recarga o movimiento como confirmado sin una respuesta válida del backend.

Respeta los mecanismos existentes de autenticación, autorización e idempotencia.

No permitas dobles envíos accidentales.

No registres credenciales, JWT completos ni información financiera sensible en logs.

No almacenes secretos en el código fuente.

Las validaciones del frontend no reemplazan las validaciones del backend.

## 10. Datos de demostración

Mientras se implementan las pantallas visuales, se permite utilizar datos DEMO.

Condiciones:

- Deben estar claramente identificados.
- No deben confundirse con operaciones reales.
- No deben ejecutar operaciones financieras.
- Deben poder sustituirse por los servicios reales posteriormente.
- El modo de demostración no debe quedar habilitado accidentalmente en producción.

## 11. Git y protección del repositorio

La rama de trabajo actual es `Nicolas-frontend/integracion`.

Antes de modificar código, comprueba la rama y el estado de Git. No cambies de rama ni asumas que `feature/frontend-stitch` está activa sin autorización explícita.

No ejecutes `git push`, `git reset`, `git clean`, operaciones destructivas ni merges sin autorización.

No realices commits automáticamente.

Concentra los cambios de implementación en `frontend/`, salvo autorización explícita.

La lectura del backend para conocer contratos está permitida. Su modificación no.

## 12. Metodología de trabajo

Trabaja módulo por módulo.

No implementes todas las pantallas en una sola operación.

Antes de cada incremento:

1. Explica brevemente el objetivo.
2. Identifica los archivos afectados.
3. Señala cualquier riesgo.
4. Implementa únicamente lo solicitado.
5. Ejecuta comprobaciones.
6. Presenta resultados verificables.

No afirmes que una funcionalidad está terminada si no has podido comprobarla.

## 13. Documentación y troubleshooting

Registra errores técnicos relevantes y soluciones en `TROUBLESHOOTING.md`.

Formato:

`Fecha | Capa | Problema | Causa | Solución`

Conserva la documentación existente.

## 14. Regla final

La prioridad del proyecto es conseguir un frontend móvil fiel a los diseños de Stitch, reutilizable y conectado progresivamente al backend .NET existente.

No reinventes funcionalidades, tecnologías, contratos ni reglas de negocio.

Si falta información, inspecciona primero el repositorio, Stitch y el UX Mapping.

**No sacrifiques la integridad del backend para acelerar la implementación visual.**

## INSPECCIONAR Y REUTILIZAR ANTES DE IMPLEMENTAR

Antes de implementar cualquier funcionalidad, el agente debe revisar las
implementaciones existentes, las carpetas del proyecto y los patrones
arquitectónicos aplicables. Debe reutilizar y extender la estructura actual
siempre que sea posible. Solo puede crear carpetas, servicios, hooks,
componentes o abstracciones nuevos cuando haya verificado que no existe una
alternativa adecuada. Está prohibido introducir estructuras paralelas o
duplicadas sin justificación técnica.
