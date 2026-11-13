---
name: Door List
description: "La mesa del organizador: cálida, clara y práctica."
colors:
  background: "#f6f5f0"
  foreground: "#18372c"
  surface: "#ffffff"
  primary-hover: "#315444"
  accent: "#719148"
  accent-surface: "#e9eedf"
  accent-decoration: "#d8e8a4"
  accent-foreground: "#436329"
  public-accent-text: "#527436"
  chart-grid: "color-mix(in srgb, var(--foreground) 10%, transparent)"
  chart-label: "color-mix(in srgb, var(--foreground) 60%, transparent)"
  error-surface: "oklch(97.1% 0.013 17.38)"
  error-border: "oklch(50.5% 0.213 27.518)"
  error-text: "oklch(44.4% 0.177 26.899)"
typography:
  display:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "48px"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: "40px"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
    letterSpacing: "-0.025em"
  state-title:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  description:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.625
  button:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.375
  help:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.625
  table-label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
rounded:
  sm: "4px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
spacing:
  "1": "4px"
  "2": "8px"
  "2.5": "10px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    padding: "12px 20px"
  button-secondary-hover:
    backgroundColor: "color-mix(in srgb, var(--foreground) 5%, transparent)"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    padding: "12px 20px"
  button-ghost-hover:
    backgroundColor: "color-mix(in srgb, var(--foreground) 5%, transparent)"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
    height: "48px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    padding: "24px 0px"
  card-accent:
    backgroundColor: "{colors.accent-surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    padding: "24px 0px"
  badge:
    backgroundColor: "{colors.accent-surface}"
    textColor: "{colors.accent-foreground}"
    typography: "{typography.table-label}"
    padding: "4px 10px"
  navigation:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    padding: "24px"
  capacity-meter:
    backgroundColor: "color-mix(in srgb, var(--foreground) 10%, transparent)"
    height: "8px"
---

# Design System: Door List

## Overview

**Creative North Star: "La mesa del organizador"**

Door List presenta un espacio cálido, claro y práctico donde preparar encuentros
y consultar su información. El fondo crema, el verde bosque y el verde oliva
aportan cercanía; la jerarquía tipográfica y las agrupaciones mantienen el trabajo
ordenado. La metáfora describe el sistema existente, sin añadir adornos de escritorio.

Los componentes son cómodos y directos: controles amplios, formas amables y
acciones claras. La profundidad se describe como capas discretas: el color y los
bordes ordenan; las sombras acompañan. La portada conserva su escala editorial,
mientras los formularios y tablas usan una jerarquía más contenida.

**Key Characteristics:**

- Cálida, clara y práctica.
- Componentes cómodos y directos.
- Capas discretas con bordes finos y sombras suaves.
- Una familia tipográfica y una paleta de verdes sobre crema.
- Espacio cómodo para trabajar y estados con explicación textual.

Registro extraído de `app/globals.css`, `components/ui/`, `components/site-header.tsx`,
`components/dashboard-ui.tsx` y sus consumidores. Los valores ejecutables permanecen
en CSS y componentes; este archivo los documenta. Las reglas de trabajo están en
`.agents/skills/door-list-ui/`. No se certifica aquí el comportamiento de rutas conectadas.

El complemento `.impeccable/design.json` añade muestras HTML/CSS para el panel,
metadatos de profundidad, movimiento y breakpoints. Sus rampas tonales de ocho pasos
son ayudas de exploración sintetizadas en OKLCH, no colores implementados ni
autorización para ampliar la paleta de la aplicación.

## Colors

La paleta combina crema, verde bosque y verde oliva, con blanco para superficies
y rojo reservado a errores.

### Primary

- **Verde bosque** (`foreground`): texto principal, acción primaria y línea de la gráfica.
- **Verde bosque de interacción** (`primary-hover`): hover de la acción primaria.
- **Verde oliva** (`accent`): foco, indicadores y progreso; no texto pequeño sobre blanco.
- **Oliva suave** (`accent-surface`): tarjetas destacadas, avisos y badges publicados.
- **Oliva claro** (`accent-decoration`): selección de texto y geometría decorativa existente.
- **Oliva de lectura** (`accent-foreground`): texto sobre la superficie destacada.
- **Verde público existente** (`public-accent-text`): texto de acento repetido en portada
  y acceso. Es una excepción heredada, no un nuevo token CSS ni sustituto de `accent-foreground`.

### Neutral

- **Crema** (`background`): fondo global.
- **Blanco de superficie** (`surface`): campos, tarjetas, tablas y texto sobre botones primarios.
- El texto auxiliar deriva de verde bosque, habitualmente al 60 %; los bordes de tarjeta
  al 10 %, los de control al 20 % y el hover de fila al 2,5 %.
- `chart-grid` y `chart-label` conservan las mezclas de CSS de la gráfica.

Los errores conservan los valores de Tailwind instalados: `error-text` corresponde
a rojo 800, `error-border` a rojo 700 y `error-surface` a rojo 50. No forman otro acento de marca.

**The Semantic Color Rule.** Reutiliza los roles de CSS y las variantes canónicas; no introduzcas colores literales por pantalla.

## Typography

**Display Font / Body Font:** Arial, Helvetica, sans-serif. Una sola familia local,
sin descargas. Los pesos y tamaños organizan el contenido; las cifras comparables
usan números tabulares.

### Hierarchy

- **Display:** título de portada; parte del rol `display` y crece a 60 px desde `sm`
  y 72 px desde `lg`. Es una escala editorial existente.
- **Headline:** título operativo; parte de `headline` y crece a 48/48 px desde `sm`.
- **Title:** encabezados de sección; **state-title:** títulos de estados y tarjetas.
- **Body:** párrafo principal. **Description:** descripciones de tarjetas.
- **Button:** acciones. **Label:** etiquetas de `FieldLabel`.
- **Help:** ayudas de `FieldDescription`. **Table-label:** encabezados de tabla y badges.

Los valores del frontmatter corresponden a las primitivas actuales. Las ayudas
y labels de `Field` usan interlineados distintos del resumen antiguo de la skill.
`Input`, `Textarea` y `NativeSelect` usan 16 px en móvil y 14 px desde `sm`; conserva
esa excepción para los campos móviles.

**The Single Family Rule.** Conserva Arial, Helvetica, sans-serif y diferencia roles con escala y peso, sin añadir familias por pantalla.

## Layout

El contenedor operativo está centrado y tiene un máximo de 1152 px. El padding
horizontal es de 24 px y pasa a 40 px desde `sm`; el vertical operativo es de 32 px.
Reutiliza el shell cuando lo proporciona el layout, sin duplicar márgenes ni `<main>`.

El ritmo base usa pasos de 4, 8, 12, 16, 24, 32, 48 y 64 px. Los pasos de 10 y 20 px
del frontmatter registran excepciones reales de badges y botones; 40 px corresponde
al margen horizontal responsive. No convierten estas excepciones en una nueva escala.

Label, campo y ayuda se agrupan con 8 px; controles con 16 px; partes de tarjeta con
24 px; secciones operativas con 48 px. La tarjeta distribuye su padding entre el
contenedor vertical y sus partes horizontales: no añadas otro padding completo.

Móvil primero. Los puntos de cambio son `sm` 640 px, `md` 768 px, `lg` 1024 px y
`xl` 1280 px. Las barras de controles pasan de columna a fila con wrap desde `sm`.
Las tablas conservan columnas y desplazan horizontalmente su propio contenedor.
Los textos largos pueden partirse; no ocultes datos esenciales mediante truncado.

## Elevation & Depth

**Capas discretas.** El contraste entre crema, blanco y oliva suave establece
la jerarquía. Los bordes finos delimitan; las sombras suaves acompañan esa separación.
El panel lateral es una capa modal y admite mayor elevación y fondo atenuado.

### Shadow Vocabulary

- **Control** (`shadow-xs`): `0 1px 2px 0 rgb(0 0 0 / 0.05)`.
- **Tarjeta** (`shadow-sm`): `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`.
- **Panel lateral** (`shadow-2xl`): `0 25px 50px -12px rgb(0 0 0 / 0.25)`.

El botón ghost no lleva sombra. La portada aumenta la sombra de tarjetas al hacer
hover; el formulario de acceso tiene una sombra local más amplia. Son tratamientos
observados de sus consumidores, no el valor por defecto de la tarjeta compartida.

**The Discrete Layers Rule.** Usa la superficie y el borde para ordenar; reserva la elevación fuerte para el panel lateral existente.

## Shapes

Los controles usan el radio `xl`; las tarjetas compartidas, `2xl`; los enlaces
con outline, `sm`. Badges y medidores son cápsulas de extremos completamente redondos.
Los bordes de tarjetas y campos son de 1 px con las opacidades semánticas indicadas.

El radio `3xl` pertenece a contenedores públicos y a la tarjeta heredada de
`registration-controls.tsx`. Para nuevas tarjetas operativas usa `ui/card.tsx`.
Registrar la excepción no autoriza migrar todas las pantallas.

## Components

### Buttons

Acciones cómodas y directas. `Button` y `buttonStyles` ofrecen `primary`, `secondary`
y `ghost`. Comparten altura mínima de 48 px, separación interna de 8 px y la geometría
del frontmatter. El primario usa fondo bosque y texto blanco; el secundario,
blanco con borde bosque al 20 %; el ghost, fondo transparente y sin sombra.
Secundario y ghost cambian a bosque al 5 % en hover.

El foco es un anillo de 3 px en oliva al 40 %. Deshabilitado conserva la forma,
reduce opacidad al 50 % y bloquea interacción. Navega con enlaces estilizados mediante
`buttonStyles`; ejecuta acciones con botones. No hay API `size` ni `asChild`.

### Cards / Containers

`Card` separa apariencia (`tone`: `default`, `accent`) y distribución (`layout`:
`default`, `table`, `notice`). El contenedor aplica padding vertical; `CardHeader`
y `CardContent` añaden 24 px horizontales. `table` elimina separación y padding
inferior; `notice` centra con 48 px verticales. `CardTitle` es un `div`: usa encabezados
reales para la jerarquía de la página.

### Inputs / Fields

Campos blancos con altura de 48 px, borde bosque al 20 %, sombra de control y radio
compartido. El placeholder usa bosque al 40 %. Al enfocar, el borde pasa a oliva y
aparece un anillo de 3 px al 25 %. `aria-invalid` activa borde rojo y, en `Input` y
`NativeSelect`, cambia el anillo de foco a rojo al 20 %. `Textarea` conserva su diferencia de foco existente.
`Textarea` tiene una altura mínima de 96 px y permite redimensionar verticalmente.

Asocia labels visibles, ayudas y errores con ids. Conserva lo escrito al fallar y
describe el error con texto propio. El placeholder no sustituye al label.

### Badges

Etiquetas compactas y redondeadas. `default` combina oliva suave y oliva de lectura;
`secondary`, bosque al 5 % con texto al 65 %; `outline`, borde al 15 %. `EventStatus`
acompaña el punto de estado con «Publicado» o «Borrador». El estado no depende solo del color.

### Navigation

Cabecera blanca, borde inferior suave y marca «door list» con punto oliva.
El logo usa 20 px y peso 700. Los enlaces del panel son de 14 px; el activo lleva
subrayado oliva separado 8 px. La navegación permite wrap. El foco de los enlaces
usa outline bosque de 2 px y separación de 4 px.

### Tables and Query States

Encabezados con altura de 48 px, texto auxiliar y fondo bosque al 2,5 %; celdas con
24 px horizontales y 16 px verticales. Mantén caption y encabezados semánticos.
Distingue carga inicial, error, vacío, sin coincidencias, contenido, actualización
y fallo de actualización. Al actualizar conserva el último resultado, incluso vacío.
El skeleton pulsa durante 2 s y desactiva el pulso con movimiento reducido.

### Capacity and Registration Chart

`CapacityMeter` usa una pista de 8 px y relleno oliva, cifras tabulares y descripción
accesible de plazas. La gráfica usa línea bosque de 2 px, rejilla suave, etiquetas
de 12 px y altura de 288 px; su tabla desplegable permite consultar los mismos datos.
La línea y el tooltip no animan los datos.

### Sheet

Panel lateral derecho con alto del viewport dinámico, ancho completo en móvil y
máximo de 576 px desde `sm`. Fondo bosque al 30 % con desenfoque suave; cabecera
y pie con padding de 24 px y pie adaptado al área segura.

La entrada combina fade de 200 ms y desplazamiento de 300 ms con
`cubic-bezier(0.22, 1, 0.36, 1)`; la salida usa 150 y 200 ms respectivamente.
Con movimiento reducido se eliminan estas animaciones. Las transiciones de color
de las primitivas conservan los 150 ms y la curva predeterminada de Tailwind.

## Do's and Don'ts

### Do:

- **Do** reutiliza CSS semántico y componentes de `components/ui/`.
- **Do** conserva controles cómodos, foco visible y labels asociados.
- **Do** mantén el último resultado durante una actualización y explica sus errores.
- **Do** conserva el scroll horizontal dentro de la tabla y permite partir texto largo.
- **Do** comprueba movimiento reducido y acompaña los estados con texto.

### Don't:

- **Don't** añadas otra paleta, degradados, modo oscuro o fuentes sin petición expresa.
- **Don't** propagues la escala editorial de portada a formularios y tablas.
- **Don't** cambies colores, padding interno o tipografía de controles desde cada consumidor.
- **Don't** conviertas un error de consulta en un estado vacío.
- **Don't** anides enlaces dentro de botones ni uses placeholders como única etiqueta.
