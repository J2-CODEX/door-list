# Casos de aceptación

## Activación

Casos para evaluar la skill; no representan pruebas ya ejecutadas.

| Solicitud | ¿Aplicar? | Resultado esperado |
| --- | --- | --- |
| “Crea una tabla de registros para este evento” | Sí | Primitivas canónicas, fechas compartidas y estados |
| “Añade una columna de correo a la tabla” | Sí | Conserva geometría; ajusta skeleton y `colSpan` |
| “Haz el formulario más compacto” | Sí | Variante existente o explícita; conserva mínimo de 48 px salvo petición que lo cambie |
| “No se ve el foco al navegar por teclado” | Sí | Corrige foco dentro del sistema |
| “Revisa por qué la carga se ve diferente en móvil” | Sí | Revisa estado y wrapper responsive |
| “Cambia la paleta de Door List a azul” | Sí | Respeta cambio explícito y actualiza fuentes afectadas |
| “Corrige el cálculo de aforo en lib/dashboard.ts” | No, sin cambio visual | Cambia lógica sin rediseñar UI |
| “La API de registros devuelve 200 cuando falla” | No, sin cambio visual | Corrige contrato HTTP |
| “Añade un índice para buscar registros” | No | Persistencia con permisos de AGENTS.md |

## Preparación reproducible

1. Usa `assets/examples/fixtures.ts`; no uses datos aleatorios, `Date.now()`, correos reales ni servicios externos.
2. Renderiza `EventPageExample` con cada `tableState`; para el formulario, `EventFormExample` con cada `state`.
3. Mantén fijos los destinos de vista previa `eventHref`, `retryHref`, `clearFiltersHref` y `previewAction`. No visites destinos con acceso a base de datos sin confirmación.
4. Compara a 390 × 844 y 1280 × 900 px, zoom 100 %, mismo navegador, fuentes cargadas y preferencia de movimiento. Congela o desactiva animaciones al capturar skeletons.
5. Si se aprueba una captura de referencia, guárdala con estado y viewport en su nombre. Generar una captura no equivale a aprobarla.

## Tabla

- `loading`: caption, tres encabezados, cinco filas skeleton y región `aria-busy="true"`; anuncia carga, sin mensaje vacío.
- `error`: mensaje propio y reintento; no dice que no haya registros; celda abarca todas las columnas.
- `empty`: encabezados, título y descripción exactos; sin CTA de crear registros manualmente.
- `filtered-empty`: mensaje de filtros y “Limpiar filtros”; acción restablece todos los filtros en producción.
- `ready`: datos de fixtures, tipo de entrada y helper de fechas; ningún dato esencial desaparece en móvil.
- `refreshing`: conserva contenido de `ready`, anuncia actualización y marca región ocupada. Comprueba también actualización de un resultado vacío.
- `refresh-error`: conserva contenido y muestra fallo con reintento; no expone mensajes del proveedor.
- Texto largo: nombre y correo del fixture no causan scroll horizontal de página; solo la tabla se desplaza.
- Columnas: celdas skeleton coinciden con encabezados; `colSpan` coincide en vacío y error.

## Formulario y página

- `default`: etiqueta visible asociada, ayuda con id, botón específico y altura mínima de 48 px.
- `invalid`: mensaje propio, `aria-invalid`, `aria-describedby` asociado al error; conserva valores.
- `pending`: “Preparando vista previa…”, envío deshabilitado; conserva estructura y valores.
- `success`: “Vista previa preparada.” sin afirmar creación de Event.
- Teclado: foco visible y orden coherente; sin botones que contienen enlaces.
- Página: un `h1`, encabezados asociados, shell único, separación de 48 px entre secciones y tarjeta de radio 16 px y padding 24 px.
- Movimiento reducido: skeleton sin pulso ni animación alternativa.

## Comprobaciones disponibles

Usa los binarios instalados, por ejemplo `node_modules/.bin/tsc --noEmit --incremental false` y ESLint sobre archivos afectados. Son análisis estáticos. Revisa scripts antes de ejecutar pruebas, builds o servidores: pueden consultar servicios aunque parezcan locales.

La validación estructural comprueba metadatos y referencias; no demuestra activación automática ni igualdad visual. Informa por separado comprobaciones estructurales, de tipos, renderizado, comportamiento y apariencia realmente realizadas.
