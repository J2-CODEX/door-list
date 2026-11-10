# Sistema visual de Door List

## Contrato y fuentes

Decisiones acordadas para trabajo nuevo y componentes afectados. Esta skill conserva la identidad actual y normaliza las diferencias futuras; no implica una migración ya ejecutada.

Los valores ejecutables viven en `app/globals.css` y las primitivas de `components/ui/`. Esta referencia define su uso. No crees un segundo tema en una ruta. Si se cambia una decisión del sistema, actualiza esta referencia y su implementación en el mismo cambio.

## Paleta

| Rol | Valor | Uso | Token CSS destino |
| --- | --- | --- | --- |
| Fondo | `#f6f5f0` | Fondo de página | `--background` (existente) |
| Texto principal | `#18372c` | Texto y acción primaria | `--foreground` (existente) |
| Superficie | `#ffffff` | Tarjetas, campos, tablas | `--surface` |
| Hover primario | `#315444` | Hover de acción primaria | `--primary-hover` |
| Acento | `#719148` | Foco, indicadores y decoración | `--accent` |
| Superficie destacada | `#e9eedf` | Métricas y badges | `--accent-surface` |
| Acento decorativo | `#d8e8a4` | Ilustraciones y selección | `--accent-decoration` |
| Texto de acento | `#436329` | Texto sobre superficie destacada | `--accent-foreground` |
| Texto auxiliar | Principal al 60 % | Ayudas y encabezados de tabla | Derivado de `foreground` |
| Borde suave | Principal al 10 % | Tarjetas y filas | Derivado de `foreground` |
| Borde de control | Principal al 20 % | Campos | Derivado de `foreground` |
| Fondo de encabezado/hover de fila | Principal al 2,5 % | Tablas | Derivado de `foreground` |
| Error | `red-800` de Tailwind | Mensajes propios de error | Utilidad existente |
| Campo inválido | `red-700` de Tailwind | Borde y foco de validación | Utilidad existente |

Los tokens destino salvo `background` y `foreground` aún no están centralizados al crear la skill. Si el cambio necesita uno, defínelo una sola vez en `:root` y enlázalo en `@theme inline` con `--color-<nombre>`. Usa después su utilidad semántica. No asumas que un token destino ya existe. Reutiliza `bg-white` mientras no exista `surface`. No copies los hex al JSX de una pantalla.

Texto blanco en la acción primaria. El acento y el verde claro son decorativos, no colores de texto pequeño sobre blanco. Los estados tienen texto además de color. No añadas modo oscuro, degradados u otra paleta sin petición expresa.

## Tipografía

Familia única global: `Arial, Helvetica, sans-serif`. No descargues fuentes.

| Rol | Tamaño / interlineado | Peso | Utilidades |
| --- | --- | --- | --- |
| Título de página operativa | 36/40 px; desde 640 px, 48/48 px | 600 | `text-4xl sm:text-5xl font-semibold tracking-tight` |
| Título de sección | 24/32 px | 600 | `text-2xl font-semibold tracking-tight` |
| Título de tarjeta o estado | 20/28 px | 600 | `text-xl font-semibold` |
| Párrafo principal | 16/24 px | 400 | `text-base leading-6` |
| Tabla, descripción, botón | 14/20 px | 400; botón 600 | `text-sm leading-5` |
| Label | 14/20 px | 500 | `text-sm font-medium` |
| Ayuda y encabezado de tabla | 12/16 px | 400; encabezado 500 | `text-xs leading-4` |

Excepción existente: `Input` usa 16 px en móvil y 14 px desde 640 px. Respétala para evitar zoom de campos en móvil. Para fechas usa `lib/dates.ts`; para cifras comparables, `tabular-nums`.

La portada pública conserva su escala editorial existente de 48, 60 y 72 px. No propagues títulos gigantes a formularios o tablas. El patrón operativo no autoriza rediseñar la portada.

## Espaciado y geometría

Escala para composiciones nuevas: **4, 8, 12, 16, 24, 32, 48 y 64 px**. Los tamaños de iconos y bordes no son espaciados.

| Contexto | Medida |
| --- | --- |
| Label, campo y ayuda | 8 px (`gap-2`) |
| Controles de barra / campos de formulario | 16 px (`gap-4`) |
| Encabezado y contenido de tarjeta | 24 px (`gap-6`) |
| Secciones de página | 48 px (`space-y-12` o `gap-12`) |
| Contenedor operativo | Máximo 1152 px (`max-w-6xl`), centrado |
| Padding horizontal de página | 24 px; desde 640 px, 40 px (`px-6 sm:px-10`) |
| Padding vertical de página operativa | 32 px (`py-8`) |
| Controles | Altura mínima de 48 px; radio de 12 px |
| Tarjeta | Radio de 16 px; padding de 24 px |
| Encabezado de tabla | Altura mínima de 48 px; padding horizontal de 24 px |
| Celda | Padding horizontal de 24 px y vertical de 16 px |
| Estado vacío/error de tabla | Padding vertical de 48 px; descripción a 8 px del título; acción a 24 px |

En `Card`, combina `py-6` del contenedor con `px-6` de sus partes, sin añadir otro `p-6`. Conserva `shadow-sm` en tarjetas, `shadow-xs` en controles y los bordes acordados.

Excepciones existentes: el padding horizontal del botón es 20 px y del badge es 10 px. No cambies esas medidas mediante `className` por pantalla. Una variante compacta debe definirse y documentarse en la primitiva antes de usarla.

## Responsive, foco y movimiento

- Móvil primero. Breakpoints predeterminados: `sm` 640 px, `md` 768 px, `lg` 1024 px, `xl` 1280 px.
- Barras de controles: columna en móvil, fila con wrap desde `sm`, separación de 16 px. Los campos ocupan el ancho disponible.
- La tabla conserva columnas en móvil y el `overflow-x-auto` de `Table`. El ejemplo de tres columnas tiene ancho mínimo de 640 px. El scroll queda en la tabla, no en la página.
- Nombres y correos largos pueden partirse. No ocultes datos esenciales con truncado sin alternativa accesible.
- Conserva el foco de las primitivas. Para enlaces usa `rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground`.
- Reutiliza el pulso de `Skeleton` y su `motion-reduce:animate-none`. No añadas animaciones decorativas a tablas o formularios.
- Usa encabezados reales `h1`, `h2`, `h3`; `CardTitle` por sí solo renderiza un `div`.
