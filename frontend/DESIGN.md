# Design System: NequiTrampa Movements

**Project ID:** `projects/7595452808345490745`  
**Proyecto Stitch:** NequiTrampa Movements Screens Replicas  
**Módulo:** Movimientos (`Movements_01`–`Movements_08`)  
**Última verificación:** 2026-10-25

---

## 0. Estado y alcance

Este documento describe el sistema visual observado en las pantallas oficiales de Stitch del módulo Movimientos. Su objetivo es servir como referencia para implementar y revisar pantallas sin inventar estilos ni contratos.

Reglas de lectura:

- **Confirmado:** valor presente en el HTML/CSS de una pantalla de Stitch.
- **Recomendación:** normalización propuesta para React Native. No es un valor de Stitch y requiere aprobación.
- **Pendiente:** información que no pudo verificarse con la evidencia disponible.

Fuentes utilizadas:

- HTML de las 8 pantallas generadas del proyecto principal.
- Capturas PNG de esas mismas pantallas.
- Capturas PNG originales `Movements_01.png`–`Movements_08.png`.
- Implementación actual en `frontend/src/`.
- Tokens actuales en `frontend/src/theme/colors.ts`.

Limitaciones:

- Las 8 capturas PNG originales no tienen HTML asociado (`htmlCode: {}`).
- El proyecto complementario `projects/4783775599735716799` (Categorías) devuelve `PERMISSION_DENIED`; no se usó.

## Proyectos Stitch disponibles

- **Principal (en uso):** `projects/7595452808345490745` — NequiTrampa Movements Screens Replicas
- **Módulo 1:** `projects/1004678761300449208` — Modulo 1
- **Complementario (sin acceso):** `projects/4783775599735716799` — NequiTrampa Categories Module (PERMISSION_DENIED)
- No existe `frontend/UX_MAPPING.md` en el repositorio.
- Las capturas no se muestrearon pixel a pixel; los valores exactos provienen del HTML/CSS.
- Varias pantallas declaran paletas ligeramente distintas entre sí. No se debe asumir que esas variaciones son intencionales.

---

## 1. Tema visual y atmósfera

La interfaz es **financiera, luminosa y tranquila**. Usa un lienzo lavanda muy claro, tarjetas blancas de bordes generosos, tinta azul-marina profunda y un magenta intenso como única acción principal. Los estados financieros positivos usan verde esmeralda; los negativos permanecen en azul-marina. Los estados de error cambian a familias cálidas: crema/ámbar para 404 y 401, y salmón para 503.

La densidad es baja y el aire es deliberado: títulos grandes, filas altas, chips tipo píldora y sombras casi imperceptibles. La jerarquía se construye con peso tipográfico y espacio, no con bordes fuertes ni gradientes.

Principios observados:

- Una sola acción primaria magenta por pantalla.
- Superficies blancas sobre fondo lavanda.
- Esquinas muy redondeadas en tarjetas y botones; píldoras completas en filtros y badges.
- Tipografía del sistema, sin fuentes personalizadas.
- Iconos de trazo, lineales, dentro de círculos pastel.
- Movimiento discreto: pulsación con reducción de escala y cambio de opacidad, sin animaciones llamativas.

---

## 2. Pantallas Stitch analizadas

| Estado | Título Stitch | Screen ID | Código |
|---|---|---|---|
| Movements_01 | Historial de Movimientos | `17280cab7e8e45b8af5e10855af4ca24` | HTML |
| Movements_02 | Sin movimientos todavía | `d3d292fb68484f329446d5e391c1bfe7` | HTML |
| Movements_03 | Skeleton de Carga | `306834af5b9c431290b15a4176c2dd1a` | HTML |
| Movements_04 | Filtrar movimientos | `a12078ae5be64ed28275067e429709bd` | HTML |
| Movements_05 | Detalle del movimiento | `6d7c1efabf7d4369a89a8a813e4d3c4d` | HTML |
| Movements_06 | Movimiento no encontrado (404) | `835483dcd08c425b9fb897d6e024d9c5` | HTML |
| Movements_07 | Tu sesión venció (401) | `9de89c036aa14283b961e7b5e7bf35f3` | HTML |
| Movements_08 | Error de Carga (503) | `45575e72317e4ed9992fb4c3b4db7a3c` | HTML |

Capturas originales sin código: `Movements_01.png`–`Movements_08.png` en el mismo proyecto.

Los exports miden 780 px de ancho. Los frames CSS usan anchos máximos de 390 px (detalle), 430/448 px (listado, vacío, filtros) o ancho completo (401/503). No son medidas de dispositivo físico; son referencias de composición.

---

## 3. Paleta de color

### 3.1 Base confirmada en Movements_01

Movements_01 es la referencia más completa y coincide con los tokens actuales de `colors.ts`.

| Nombre descriptivo | Hex | Rol |
|---|---|---|
| Lavender Mist | `#F3F2F8` | Fondo general de la app |
| Midnight Plum | `#190E38` | Títulos, montos negativos, texto principal |
| Electric Magenta | `#CB0067` | Acción principal, filtro activo, tab activo |
| Emerald Signal | `#00845B` | Montos positivos |
| Mint Wash | `#D6F4E8` | Fondo de avatar para ingresos y recargas |
| Deep Mint Ink | `#086C4B` | Texto/icono sobre Mint Wash |
| Rose Wash | `#FCE0EB` | Fondo de avatar para egresos |
| Rose Ink | `#9A2B59` | Texto sobre Rose Wash |
| Muted Violet Gray | `#706B82` | Texto secundario, horas, subtítulos |
| Hairline Lavender | `#F0EFF5` | Divisores y bordes suaves |
| Nav Gray | `#8C889B` | Iconos y labels inactivos del bottom nav |
| White | `#FFFFFF` | Tarjetas, píldoras inactivas, botones secundarios |

### 3.2 Variaciones confirmadas por pantalla

Stitch no declara una paleta única entre pantallas. Estas son las variaciones observadas:

| Pantalla | Fondo | Tinta principal | Magenta/acción | Otros |
|---|---|---|---|---|
| 01 | `#F3F2F8` | `#190E38` | `#CB0067` | Verdes y rosas de 3.1 |
| 02 | `#F4F4FA` | `#120E29` | `#C2005A` | Píldora activa `#181135`; lavanda `#E4E2F7`; gris `#7E7C97` |
| 03 | `#F5F4FA` | `#110D2C` | `#E21A6B` | Skeleton `#E5E2F8`; nav inactivo `#8A86A8` |
| 04 | `#F4F4FA` | `#131A2E` | `#BF165E` | Hover `#A3104F`; label `#686D82`; borde `#D8D9E8` |
| 05 | `#F4F4FA` | `#15162B` | `#C2005A` | Hover `#AB004F`; label `#69687B` |
| 06 | `#F4F4FA` | `#151335` | `#C2135D` | Hover `#AA1051`; muted `#6C728E` |
| 07 | `#F4F4FA` | `#1C1535` | `#C01358` | Hover `#A6104C`; desc `#737084` |
| 08 | `#F4F4FA` | `#1C1535` | `#BE1362` | Muted `#727488` |

**Recomendación:** conservar `colors.ts` como fuente única y tratar Movements_01 como base canónica del módulo hasta que diseño confirme otra cosa. Las diferencias entre pantallas parecen deriva de generación, no intención. No cambiar tokens sin aprobación.

### 3.3 Estados de error

**404 — Movements_06 (confirmado):**

| Nombre | Hex | Rol |
|---|---|---|
| Warm Cream | `#FDEEC6` | Círculo del icono |
| Umber Ink | `#8C6D37` | Icono de búsqueda |
| Pale Butter | `#FDF1CD` | Fondo del badge 404 |
| Amber Ink | `#A16A19` | Texto del badge 404 |
| Muted Slate | `#6C728E` | Descripción |
| Deep Indigo | `#151335` | Título |

**401 — Movements_07 (confirmado):**

| Nombre | Hex | Rol |
|---|---|---|
| Warm Cream | `#FDEEC5` | Círculo del candado |
| Antique Gold | `#B68D40` | Trazo del candado |
| Pale Butter | `#FEEDCA` | Fondo del badge 401 |
| Amber Ink | `#A47721` | Texto del badge 401 |
| Deep Indigo | `#1C1535` | Título |
| Cool Gray | `#737084` | Descripción |
| Raspberry | `#C01358` | Botón “Iniciar sesión” |
| Raspberry Pressed | `#A6104C` | Estado presionado |

**503 — Movements_08 (confirmado):**

| Nombre | Hex | Rol |
|---|---|---|
| Blush Salmon | `#FCE0DB` | Círculo del icono |
| Brick Rose | `#C54B43` | Icono y texto del badge 503 |
| Pale Blush | `#FCE1DC` | Fondo del badge 503 |
| Deep Indigo | `#1C1535` | Título |
| Cool Gray | `#727488` | Descripción |
| Raspberry | `#BE1362` | Botón “Reintentar” |

**Pendiente crítico:** `colors.ts` usa para 401 lavanda/violeta (`#EDE9FE`, `#5B21B6`, `#FCE0EB`, `#9A2B59`) y para 503 rosa/ámbar (`#FCE7F3`, `#FDF1CD`, `#A16A19`). Ambos divergen del HTML generado. Verificar contra las capturas originales antes de modificar tokens.

---

## 4. Tipografía

**Familia confirmada:** pila del sistema, sin fuente descargada.

```text
-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
"Segoe UI", Roboto, Helvetica, Arial, sans-serif
```

| Rol | Tamaño | Peso | Line-height | Notas |
|---|---|---|---|---|
| Título de listado (01/02/03) | 30 px | 800 | 36 px | `tracking-tight` (−0.025 em) |
| Título 503 (08) | 26 px | 700 | 32 px | Encabezado de pantalla |
| Título de detalle (05/06) | 22 px | 700 | 28 px | Alineado con botón atrás |
| Título de filtros (04) | 24 px | 700 | 32 px | — |
| Título de estado 404 | 26 px | 700 | 1.375 | Centrado |
| Título de estado 401 | 28 px (32 px en sm) | 700 | 1.25 | Centrado |
| Título de estado 503 | 23 px | 700 | 1.25 | Centrado, máx. 280 px |
| Título de sección “Hoy” | 20 px | 700 | 28 px | — |
| Texto de fila | 16 px | 700 | 1.375 | Movimiento |
| Hora de fila | 13 px | 400 | 20 px | Muted |
| Monto de fila | 16 px | 700 | 24 px | Verde si positivo, tinta si negativo |
| Monto de detalle | 34 px (36 px en sm) | 700 | 1.25 | — |
| Subtítulo/estado de detalle | 14–14.5 px | 500 | 20–21 px | Muted |
| Etiqueta de fila de detalle | 15 px | 400 | 22 px | Muted |
| Valor de fila de detalle | 15 px | 700 | 22 px | Tinta |
| Descripción 404 | 17 px | 400 | 1.625 | Muted, máx. 280 px |
| Descripción 401 | 17 px | 400 | 1.625 | Muted, máx. 280–320 px |
| Descripción 503 | 15 px | 400 | 1.625 | Muted, máx. 310 px |
| Descripción vacío | 16 px | 400 | 1.625 | Muted, máx. 280 px |
| Label de formulario | 14 px | 500 | 20 px | `#686D82` |
| Input | 16 px | 400 | 24 px | Tinta |
| Píldora activa 01 | 15 px | 500 | — | — |
| Píldora inactiva 01 | 15 px | 400 | — | — |
| Píldora 02/04 | 14 px | 600 | — | — |
| Botón principal 02 | 18 px | 600 | — | — |
| Botón principal 04 | 16 px | 600 | — | — |
| Botón principal 05/06 | 16/17 px | 600/700 | — | — |
| Botón principal 07/08 | 17 px | 500/600 | — | — |
| Badge 404/401 | 14 px | 700 | — | — |
| Badge 503 | 12 px | 700 | — | — |
| Nav 01/02/03 | 12 px | 400/600 | — | Activo semibold |
| Nav 08 | 11 px | 500/600 | — | Activo semibold |

**Recomendación:** mantener `fontWeight` de React Native entre `'400'`, `'500'`, `'600'`, `'700'` y `'800'`. No introducir una fuente externa sin aprobación.

---

## 5. Geometría, profundidad y espaciado

### 5.1 Radios

| Elemento | Radio confirmado |
|---|---|
| Píldoras, badges, avatares, círculos de icono | Completo (`9999`) |
| Tarjetas de lista (01) | 24 px (`rounded-3xl`) |
| Tarjeta skeleton (03) | 32 px |
| Tarjetas de detalle (05) | 28 px |
| Botones principales | 16 px (`rounded-2xl`) en 02/04/06/07/08 |
| Botón principal 05 | 18 px |
| Inputs | 16 px |
| Botón atrás | Círculo perfecto, 44 px (05/06) o 48 px (02/04) |

### 5.2 Sombras

Todas son muy suaves:

- Tarjetas: `shadow-sm` (0 1 2 rgba(0,0,0,.05)) o `0 2 12 rgba(0,0,0,.02–.03)`.
- Botón atrás: `0 2 8 rgba(0,0,0,.04)`.
- CTA 05: `0 4 14 rgba(194,0,90,.22)`.
- El resto de CTAs usa `shadow-sm`, sin glow magenta.
- Bottom nav: borde superior de 1 px y sombra ligera.

**Recomendación:** evitar `elevation` alto y halos magenta en todos los botones. La implementación actual aplica glow magenta a varios CTAs; Stitch solo lo confirma en 05.

### 5.3 Espaciado y composición

- Padding horizontal: 20 px en listado/detalle; 24 px en vacío, filtros y 401; 32 px en el contenido del 503.
- Padding superior: 40 px (01/04), 48 px (02/03/06), 64 px (08), 80 px (07).
- Padding inferior: 24 px (05/06/07/08), 32 px (01/02/03/04/05).
- Separación header → contenido: 24–28 px en listados; 64 px en 404.
- Separación entre tarjetas: 16 px.
- Filas de lista: padding vertical 14–16 px; detalle: 17 px.
- Filas de detalle: 17 px vertical; divisor de 1 px.
- Gap de filtros: 10 px; `flex-wrap` habilitado en 01/02/04.
- Área táctil mínima: 44×44 px. Los botones atrás de 44 px cumplen justo; no reducirlos.

---

## 6. Reglas de componentes

### Header

- Título a la izquierda, acción “Filtrar” a la derecha cuando aplica.
- Listados: 30 px, peso 800, tinta, tracking cerrado.
- Detalle/filtros: 22–24 px, peso 700.
- “Filtrar”: 16–17 px, peso 600, magenta.
- No incluir logo ni avatar en este módulo.
- En 404/401/503, el header puede desaparecer o reducirse según el estado; 06 conserva botón atrás.

### Filter pills

- Forma de píldora completa.
- Activa: fondo tinta/magenta oscuro, texto blanco, peso 500–600.
- Inactiva: fondo blanco, texto tinta, peso 400–600, sombra leve.
- Altura visual: 40–44 px.
- Padding: 20–24 px horizontal; 8–10 px vertical.
- En 01, la píldora activa usa padding horizontal ligeramente mayor (24 px) que las inactivas (20 px); no es una regla consistente.
- No usar borde; la separación depende de la sombra y el contraste de fondo.

### Tarjeta de lista y fila de movimiento

- Tarjeta blanca, radio 24–30 px, padding vertical 8–12 px, borde hairline y sombra suave.
- Fila: avatar de 48 px, gap 14 px, título 16 px/700, hora 13 px/400, monto 16 px/700.
- Avatar de ingreso/recarga: Mint Wash con icono `+` o inicial verde.
- Avatar de egreso: Rose Wash con inicial rosa.
- Divisor de 1 px con margen horizontal de 12–16 px; no debe tocar los bordes.
- El monto positivo es verde; el negativo es tinta, no rojo.
- No mostrar estados financieros confirmados sin respuesta del backend.

### Bottom navigation

- Fondo blanco, borde superior hairline, 4 tabs: Inicio, Movimientos, Asistente, Perfil.
- Altura visual: 56–64 px más safe area.
- Iconos de 22–24 px, trazo 1.8; activo con trazo 2–2.2.
- Label de 11–12 px; activo semibold, inactivo regular/medium.
- Activo en magenta; inactivos en gris.
- Presente en 01, 02, 03 y 08. Ausente en 04, 05, 06 y 07.
- No agregar tabs nuevas en este módulo.

### Tarjetas de detalle

- Dos tarjetas blancas separadas por 16 px.
- Resumen: radio 28 px, padding vertical 28 px, contenido centrado.
- Detalle: radio 28 px, filas de 17 px verticales, divisor hairline.
- Etiqueta muted a la izquierda; valor en tinta a la derecha, peso 700.
- No truncar valores financieros; permitir ajuste de línea o reducir tipografía antes que ocultar dígitos.

### Botones

- Primario: magenta, texto blanco, ancho completo, altura 56 px, radio 16–18 px, peso 600–700.
- Secundario: fondo transparente, borde 1 px, texto magenta, misma altura/radio.
- Estado presionado: reducir escala a ~0.98–0.99 o bajar opacidad; sin cambio de layout.
- Deshabilitado: no confirmado en Stitch. Si se implementa, usar opacidad reducida y `disabled`, sin inventar un color nuevo.
- No apilar más de una acción primaria magenta por pantalla.

### Inputs y formulario

- Fondo blanco, borde 1 px `#D8D9E8`, radio 16 px, padding 16 px horizontal / 14 px vertical.
- Texto 16 px tinta; placeholder `#737A8C`.
- Label 14 px/500 `#686D82`, separación de 6 px.
- Focus: anillo de 2 px magenta (`#BF165E`), borde transparente.
- Separación entre campos: 16 px.
- Footer de acciones separado del formulario por 32 px.
- Teclado numérico para monto; no formatear como confirmado hasta validar con backend.

### Skeleton

- 7 filas.
- Tarjeta blanca radio 32 px, padding 16/12 px, divisor `#F3F4F6`.
- Avatar 48 px; línea de título 14 px de alto; línea secundaria 10 px; píldora de monto 14×58 px.
- Color `#E5E2F8` con pulso de opacidad 1 → 0.55 → 1 cada 1.8 s.
- No mostrar texto, cifras ni estados financieros durante la carga.

### Estados vacío y error

- Círculo de icono de 96 px (112 px en 401), icono de trazo 28–40 px.
- Badge de código: píldora pastel, texto 12–14 px/700.
- Título centrado, 23–28 px/700.
- Descripción centrada, 15–17 px/400, ancho máximo 280–310 px.
- Una sola acción de recuperación.
- Copys confirmados:
  - Vacío: “Sin movimientos todavía” / “Cuando muevas dinero, cada operación aparecerá aquí.” / “Recargar”.
  - 404: “Movimiento no encontrado” / “No encontramos esta operación. Puede que aún se esté actualizando tu historial.” / “Volver a movimientos”.
  - 401: “Tu sesión venció” / “Inicia sesión de nuevo para ver tus movimientos.” / “Iniciar sesión”.
  - 503: “No pudimos cargar tus movimientos” / “El servicio no está disponible por ahora. Tu saldo y tu dinero no se afectan.” / “Reintentar”.
- No mostrar un movimiento como confirmado si la API falló.

### DevStateBar

`DevStateBar` es una herramienta de desarrollo, no parte del sistema visual de producto. Usa cromo oscuro (`#0F0926`, `#1E153E`) y no debe replicarse en pantallas finales ni en producción.

---

## 7. Mapa de estados de interfaz

| Estado | Contenido | Navegación | Acción | Notas |
|---|---|---|---|---|
| 01 Historial | Header, filtros, “Hoy”, tarjeta con 6 movimientos | Bottom nav | Filtrar / abrir detalle | Estado por defecto con datos DEMO |
| 02 Vacío | Header, filtros, círculo lavanda, copy, CTA | Bottom nav | Recargar | No hay tarjeta de lista |
| 03 Carga | Header, filtros, 7 skeletons | Bottom nav | Filtrar | Sin cifras ni textos de fila |
| 04 Filtros | Header con atrás, pills, 3 inputs, 2 CTAs | Sin bottom nav | Aplicar / Limpiar | Pantalla completa, no modal confirmado |
| 05 Detalle | Header con atrás, 2 tarjetas, CTA | Sin bottom nav | Volver | Monto, estado, referencia, fecha, tipo, saldo |
| 06 404 | Header con atrás, icono de búsqueda, badge, copy, CTA | Sin bottom nav | Volver | Estado de movimiento inexistente |
| 07 401 | Icono candado, badge, copy, CTA | Sin bottom nav | Iniciar sesión | Sin header |
| 08 503 | Header, icono wifi desconectado, badge, copy, CTA | Bottom nav | Reintentar | El saldo no se ve afectado |

Estados HTTP no representados en este set: 403 y 409. No crear pantallas nuevas para ellos sin UX Mapping y contrato verificados.

---

## 8. Reglas de reutilización

- Reutilizar `Header`, `FilterPills`, `TransactionItem`, `SkeletonRow`, `BottomNav` y los estilos de `SafeAreaView` existentes.
- Mantener `src/theme/colors.ts` como única fuente de tokens. No crear `src/theme.ts` ni una paleta paralela.
- Extraer un componente compartido solo cuando al menos dos pantallas lo necesiten.
- No copiar el HTML de Stitch como JSX; traducir a `View`, `Text`, `Pressable`, `TextInput`, `ScrollView` y `FlatList`.
- No introducir Expo Router, React Navigation ni una nueva estructura de carpetas.
- Mantener la navegación por estado de `App.tsx`.
- Los iconos de Stitch son SVG propios. En React Native se aproximan con `@expo/vector-icons`; aceptar diferencias menores de trazo y no afirmar paridad pixel-perfect.
- No duplicar colores de estado en cada pantalla; si se normalizan, hacerlo en `colors.ts` con aprobación.
- No usar los estilos de `DevStateBar` en UI de producto.

---

## 9. Diferencias frente al frontend actual

La estructura actual ya sigue el flujo de Stitch. Las diferencias son principalmente de tokens y medidas.

| Elemento | Stitch confirmado | Implementación actual | Impacto / recomendación |
|---|---|---|---|
| Fondo global | `#F3F2F8` en 01; `#F4F4FA` en 02/04–08; `#F5F4FA` en 03 | `#F3F2F8` | Deriva entre pantallas. Mantener 01 como base; no cambiar sin decisión |
| Tinta | `#190E38` en 01; `#110D2C`–`#1C1535` en otras | `#190E38` | Diferencia sutil; validar contraste y unificar |
| Magenta | `#CB0067` en 01; `#BE1362`–`#E21A6B` en otras | `#CB0067` | La app ya usa la base de 01; no propagar variantes sin aprobación |
| Título de listado | 30 px / 800 | 28 px / 800 | Aumentar a 30 px si se busca fidelidad a 01–03 |
| “Filtrar” | 16–17 px / 600 | 16 px / 600 | Correcto |
| Píldora activa | 14–15 px / 500–600; fondo `#190E38`/`#111727`/`#110D2C` | 14 px / 600; fondo `#190E38` | Aceptable; unificar tamaño según pantalla |
| Tarjeta de lista | Radio 24 px; sombra `shadow-sm`; borde hairline | Radio 30 px; sombra más amplia; borde `rgba(240,239,245,.7)` | Reducir radio/sombra para acercarse a 01 |
| Fila de movimiento | 16 px / 700; hora 13 px; avatar 48 px | 15.5 px / 700; hora 13 px; avatar 48 px | Subir título y monto a 16 px |
| Avatar de ingreso | 20 px / 700 en recarga; 18 px / 700 en transferencia | 18 px / 700 | Diferencia menor |
| Bottom nav | Iconos 24 px; labels 12 px; borde `gray-100/90` | Iconos 22 px; labels 11 px; borde lavanda | Subir iconos/labels para 01–03; 08 ya usa 22/11 |
| Skeleton | Color `#E5E2F8`; radio 32 px; pulso 1.8 s; filas 16 px vertical | `#E5E7EB`/`#F3F4F6`; radio 30 px; pulso 1.4 s; filas 14 px | Alinear color, radio, timing y padding |
| Círculo vacío | `#E4E2F7`; icono 28 px | `#EDE9FE`; icono 32 px | Corregir color y tamaño |
| Copy vacío | Descripción 16 px; line-height 1.625; máx. 280 px | 16 px; line-height 22; máx. 290 px | Ajustar line-height/ancho |
| CTA vacío | 18 px / 600; radio 16 px; sombra suave | 17 px / 700; radio 18 px; glow magenta | Alinear tipografía, radio y sombra |
| Filtros: atrás | 48×48 px | 44×44 px | Subir a 48 px en 04 |
| Filtros: título | 24 px / 700 | 22 px / 800 | Alinear a 24/700 |
| Filtros: labels | 14 px / 500 `#686D82` | 14 px / 600 `#706B82` | Bajar peso y usar gris confirmado |
| Filtros: inputs | Borde `#D8D9E8`; texto 16/400 | Borde `#E5E7EB`; texto 16/500 | Alinear borde y peso |
| Filtros: botones | Radio 16 px; primario 16/600; secundario borde `#D8D9E8` | Radio 18 px; primario 16/700; borde `#F0EFF5` | Alinear radio, peso y borde |
| Detalle: sombra CTA | `0 4 14 rgba(194,0,90,.22)` | `0 4 10 rgba(203,0,103,.25)` | Diferencia menor; no crítico |
| Detalle: labels | `#69687B` | `#706B82` | Diferencia menor |
| 404: descripción | 17 px | 16 px | Subir a 17 px |
| 404: CTA | 17 px / 700; alto 56 px; radio 16 px | 16 px / 700; padding 16; radio 18 px | Alinear |
| 401: paleta | Crema/ámbar (`#FDEEC5`, `#B68D40`, `#FEEDCA`, `#A47721`) | Lavanda/violeta (`#EDE9FE`, `#5B21B6`, `#FCE0EB`, `#9A2B59`) | **Divergencia crítica**; verificar captura original antes de cambiar |
| 401: composición | Círculo 112 px; título 28/32; descripción 17 px | Círculo 108 px; título 30; descripción 16.5 px | Alinear si se confirma la pantalla |
| 401: botón | 17 px / 500; radio 16 px | 16 px / 700; radio 18 px | Alinear si se confirma la pantalla |
| 503: paleta | Salmón (`#FCE0DB`, `#C54B43`, `#FCE1DC`) | Rosa/ámbar (`#FCE7F3`, `#FDF1CD`, `#A16A19`) | **Divergencia crítica**; verificar captura original |
| 503: título | 26 px / 700; `#1C1535` | Header 28 px / 800; `#190E38` | Alinear |
| 503: descripción | 15 px | 15.5 px | Diferencia menor |
| 503: badge | 12 px / 700 | 13 px / 800 | Diferencia menor |
| 503: CTA | 17 px / 600; radio 16 px | 16.5 px / 700; radio 18 px | Alinear |
| Botones en general | Radio 16–18 px; sombra suave | Radio 18 px; glow magenta | Unificar por pantalla, no globalmente |
| Safe area | Padding inferior 24–32 px + safe area | `SafeAreaView` + padding manual | Verificar en dispositivos con notch |

**Conclusión:** la implementación actual es estructuralmente fiel. Antes de tocar estilos, decidir si se normaliza a Movements_01 o se respeta la paleta específica de cada pantalla. No mezclar ambas estrategias.

---

## 10. Verificaciones pendientes

1. Confirmar con diseño si la paleta canónica es la de Movements_01 o si cada estado conserva su variante.
2. Verificar las capturas originales `Movements_01.png`–`Movements_08.png` para 401 y 503, porque el HTML generado contradice los tokens actuales.
3. Confirmar la existencia y los contratos reales de los endpoints antes de conectar cualquier pantalla.
4. Crear o validar `UX_MAPPING.md`; no existe en el repositorio.
5. Confirmar medidas de safe area y comportamiento en dispositivos de 360–430 px de ancho.
6. Confirmar si 403 y 409 requieren estados propios en Movimientos; no están en este set.
7. Confirmar la intención de los iconos: los SVG de Stitch no son idénticos a Feather/Ionicons.
8. Confirmar si el 503 debe conservar el bottom nav y si el tab activo debe ser Movimientos.
9. Confirmar si el detalle debe usar 390 px como frame de referencia o adaptarse al ancho real.
10. Confirmar formatos de fecha, moneda y locale con el backend y el UX Mapping.

---

## 11. Regla final

Stitch manda en apariencia; el backend manda en verdad financiera. Ninguna pantalla debe mostrar una operación como confirmada, ni alterar saldos, sin una respuesta válida del backend. Este documento no autoriza cambios en `colors.ts`, navegación, contratos ni backend; solo describe el sistema visual y las diferencias observadas.
