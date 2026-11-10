# Componentes y ejemplos canónicos

## Imports autorizados

Rutas relativas a la raíz del repositorio. Inspecciona su implementación antes de asumir props nuevas.

| Necesidad | Implementación canónica |
| --- | --- |
| Botón | `components/ui/button.tsx` → `Button` |
| Campo | `components/ui/input.tsx` → `Input` |
| Label, ayuda, error | `components/ui/field.tsx` → `Field`, `FieldLabel`, `FieldDescription`, `FieldError` |
| Tarjeta y partes | `components/ui/card.tsx` → `Card`, `CardHeader`, `CardContent`, `CardDescription` |
| Tabla y partes | `components/ui/table.tsx` |
| Badge | `components/ui/badge.tsx` |
| Select y skeleton existentes | `components/ui/registration-controls.tsx` → `NativeSelect`, `Skeleton` |
| Clases condicionales | `lib/utils.ts` → `cn` |
| Tipos del dashboard | `lib/dashboard.ts` → `OrganizerEvent`, `OrganizerTicketType`, `OrganizerRegistration` |
| Fechas de evento/registro | `lib/dates.ts` → `formatEventDate` (Ecuador) |

`registration-controls.tsx` reexporta `Input` y `Button`; no son implementaciones distintas. Sí tiene otro `Card`, con radio de 24 px y padding responsive. Para trabajo nuevo usa `ui/card.tsx`. Migra consumidores heredados solo si el cambio los afecta; conserva semántica con un `<section>` externo. No elimines exports de compatibilidad sin revisar consumidores.

`Button` todavía no tiene `variant`, `size` ni `asChild`. No inventes esas props ni anides enlaces dentro de botones. Navega con enlaces; ejecuta acciones con botones o formularios. Si hace falta otra apariencia, implementa una variante explícita en la primitiva dentro del alcance pedido.

## Tabla de registros

Lee [registrations-table.tsx](../assets/examples/registrations-table.tsx) y [fixtures.ts](../assets/examples/fixtures.ts). Es un ejemplo presentacional compatible con Server Components; las acciones se suministran como destinos GET. Un consumidor interactivo puede conectar filtros y refresh sin trasladar toda la página al cliente.

| Estado | Estructura y texto fijo |
| --- | --- |
| `loading` | Encabezados; cinco filas skeleton con tres celdas; `aria-busy`; “Cargando registros…” |
| `error` | Una celda `colSpan={3}`; “No pudimos cargar los registros”; “Volver a intentar” |
| `empty` | Una celda `colSpan={3}`; “Los primeros registros están por llegar”; “Cuando alguien se registre, lo verás aquí.”; sin CTA de creación |
| `filtered-empty` | “No hay registros con estos filtros”; “Prueba con otro nombre, correo o tipo de entrada.”; “Limpiar filtros” |
| `ready` | Filas con el tipo compartido y el helper de fecha |
| `refreshing` | Conserva filas y encabezados; `aria-busy`; “Actualizando registros…” fuera de la región ocupada |
| `refresh-error` | Conserva filas; “No pudimos actualizar los registros. Mostramos la última información disponible.”; reintento |

Usa carga inicial solo si no hay resultado previo. Con resultado previo, incluso vacío, consérvalo al actualizar. Para actualizar o mostrar un fallo de actualización de un resultado filtrado vacío, pasa `registrations={[]}` y `emptyReason="filters"`; para un vacío inicial sin registros usa `emptyReason="no-registrations"` (predeterminado). Un error inicial precede a cualquier comprobación de longitud; un resultado exitoso sin registros es vacío; sin coincidencias requiere filtros activos y una colección base no vacía.

El ejemplo recibe un estado explícito para reproducir capturas. En producción derívalo de la consulta y conserva el último resultado exitoso, incluido el motivo del vacío. No añadas un selector de estados a la UI de usuario.

Para otras columnas, deriva `colSpan` y celdas skeleton del mismo catálogo de columnas. Las cinco filas skeleton son fijas. Mantén `caption`, `scope="col"`, anuncio de carga y wrapper de scroll.

## Formulario

Lee [event-form.tsx](../assets/examples/event-form.tsx). Es un formulario GET de vista previa, sin persistencia; el destino lo suministra el consumidor. Incluye label asociado, ayuda, error propio, `aria-invalid`, `aria-describedby`, pendiente y confirmación de previsualización. Reproduce `default`, `invalid`, `pending` y `success` sin red.

En producción conecta el contrato de API o Server Action existente. Comprueba `response.ok` antes de interpretar el cuerpo, muestra mensajes propios y conserva lo escrito al fallar. El ejemplo no guarda ni confirma creación de Event.

No añadas `"use client"` solo para mostrar un campo inválido recibido del servidor. Sí corresponde para validación interactiva, estado local o handlers. No pases callbacks ordinarios de Server Components a Client Components.

## Página

Lee [event-page.tsx](../assets/examples/event-page.tsx). Compone encabezado, navegación y sección con tarjeta y tabla. Usa fixtures y tipos compartidos, sin introducir colores. No es una ruta registrada ni consulta datos.

Usa `max-w-6xl px-6 py-8 sm:px-10` y separación de 48 px entre secciones. Si el layout ya proporciona el shell, conserva uno solo: no dupliques padding ni anides `<main>`. Asocia secciones a encabezados.

## Uso de ejemplos

- Los TSX tienen imports reales del proyecto y requieren sus estilos globales y alias `@/`. Impórtalos en una vista previa local autorizada.
- Mantén fixtures y props fijos al comparar; cambia solo el estado bajo prueba. Proporciona destinos de vista previa que no accedan a datos reales. No añadas rutas de producción automáticamente.
- Tailwind puede omitir `.agents/` al detectar clases. Si faltan estilos, registra los ejemplos como fuente explícita limitada en el entorno de vista previa o cópialos a su directorio de fuentes. No interpretes la ausencia de CSS como una decisión visual.
- Al adaptar a producción pueden cambiar datos, textos del dominio, columnas y acciones. Conserva tokens, medidas, semántica y estados. No copies tipos de `lib/` ni helpers de fecha.

## Ejemplos de decisiones

- Correcto: `Card`, `CardHeader` y `CardContent`, separación externa en el consumidor. Evita reconstruir la tarjeta con `rounded-3xl bg-[#ffffff] p-8` por ruta.
- Correcto: `FieldLabel htmlFor="event-title"` con `Input id="event-title"`. Evita placeholder como única etiqueta.
- Correcto: mensaje y reintento de error. Evita que `data?.registrations ?? []` oculte el error como vacío.
- Correcto: refresh conserva registros. Evita sustituir filas existentes por skeleton en cada refetch.
