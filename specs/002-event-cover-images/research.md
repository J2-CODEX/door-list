# Investigación: imágenes de portada en eventos

**Fecha**: 2026-11-25. **Base**: [spec.md](spec.md), código y dependencias instaladas. Investigación de fase 0, sin conexiones a base de datos ni instalación de paquetes.

## 1. Integración con la aplicación existente

**Decision**: Mantener App Router y las páginas públicas como Server Components. La edición se incorpora en `app/organizador/page.tsx`, cuyo formulario existente ya necesita cliente. Añadir un editor local a esa ruta y una presentación compartida con una hoja cliente mínima para detectar fallos de imagen.

**Rationale**: La cartelera consulta `events` directamente; el registro usa `lib/public-events.ts` y `get_public_registration_event`. Ambas páginas son `force-dynamic`. El detalle del dashboard consulta asistentes y no es actualmente un editor. Cambiarlo de función ampliaría el alcance.

**Alternatives considered**: Hacer cliente toda la cartelera; crear otra pantalla de edición; mover el formulario completo al servidor. Se descartan por coste y alcance innecesarios.

## 2. Versiones y documentación del framework

**Decision**: Diseñar para Next.js **16.4.5**, React **19.3.1**, TypeScript **5.9.3**, Tailwind **4.3.4** y Supabase JS **2.119.0**, verificados en `node_modules`. Usar Node.js para procesamiento nativo de imágenes; el entorno local observado es Node **26.10.0**, y las pruebas existentes requieren Node 22.18 o posterior compatible con las dependencias.

**Rationale**: La versión instalada difiere del rango declarado en `package.json`. Se consultó la documentación oficial distribuida en `node_modules/next/dist/docs/`: Route Handlers, `Image`, runtime y configuración de Server Actions. Los GET de Route Handlers no se almacenan por defecto, pero se fijará además `no-store` en datos mutables. `params` es asíncrono. El límite predeterminado de 1 MB de Server Actions no configura las cargas de Route Handlers.

**Alternatives considered**: Basarse en el rango de `package.json`, usar Server Actions para el archivo, confiar en defaults de caché. Se descartan.

Fuentes: [Route Handlers 16.4.5](https://github.com/vercel/next.js/blob/v16.4.5/docs/01-app/03-api-reference/03-file-conventions/route.mdx), [Image 16.4.5](https://github.com/vercel/next.js/blob/v16.4.5/docs/01-app/03-api-reference/02-components/image.mdx), [Server Actions 16.4.5](https://github.com/vercel/next.js/blob/v16.4.5/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.mdx).

## 3. Transporte del archivo completo de 5 MiB

**Decision**: Transferencia directa mediante una autorización de subida a un bucket privado de staging. La API recibe JSON pequeño para iniciar y finalizar; el archivo no atraviesa el cuerpo de una función de Next.js. El servidor descarga después ese objeto, valida sus bytes y genera un objeto canónico en otro bucket privado.

**Rationale**: Admite exactamente 5 242 880 bytes sin depender de límites de multipart del proveedor de hosting. No se reduce el límite de producto ni se convierte el transporte firmado en prueba de validez de la imagen. La ruta y el identificador de operación los genera el servidor; no acepta rutas arbitrarias del cliente. `upsert:false` evita sobrescritura del archivo de staging.

**Alternatives considered**: Multipart a Next.js, bucket público, subida directa a la ubicación definitiva. El primero requiere controlar la capacidad de recepción del hosting; los demás exponen archivos sin validar o eluden la visibilidad del evento.

Fuentes: [Standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [createSignedUploadUrl](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl), [uploadToSignedUrl](https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl).

## 4. Validación de contenido y dependencia de imagen

**Decision**: Declarar `sharp` **0.35.5** como dependencia directa durante implementación, manteniendo su versión ya presente de forma transitiva. No instalarla en esta fase. Validar el tamaño original antes de decodificar, identificar el formato por contenido y exigir JPEG, PNG o WebP estático. Inspeccionar estructura de contenedor PNG/WebP para detectar animación; decodificar completamente con política estricta y límite de 36 000 000 píxeles. Aplicar orientación EXIF y comprobar ambas dimensiones de la imagen orientada: 600–6000 px inclusivos. Rechazar archivos vacíos o corruptos, sin confiar en nombre, extensión o MIME declarado.

**Rationale**: `metadata()` por sí solo no decodifica todos los píxeles ni acredita integridad. La detección de páginas de sharp no basta para APNG: reconocer `acTL` recorriendo chunks PNG con tamaños acotados, y animación WebP mediante estructura RIFF/`ANIM`/`ANMF`, sin buscar cadenas arbitrariamente. El límite de dimensiones admite como máximo 36 MP. Procesar una imagen por operación y presupuestar al menos 512 MiB de memoria para el proceso de finalización; medir el consumo con el caso máximo antes de desplegar y limitar concurrencia por proceso.

**Alternatives considered**: Validación solo en navegador; validar cabeceras solamente; depender de sharp transitivo; aceptar una primera página de una animación. No satisfacen FR-015 o dejan una dependencia frágil.

Fuentes: [Sharp metadata](https://sharp.pixelplumbing.com/api-input/#metadata), [Sharp constructor](https://sharp.pixelplumbing.com/api-constructor/), [PNG specification](https://www.w3.org/TR/png-3/), [WebP container](https://developers.google.com/speed/webp/docs/riff_container).

## 5. Original y representación almacenada

**Decision**: Conservar el original solo temporalmente en staging. Generar WebP estático orientado y sin metadatos, con lado mayor de hasta 2400 px, sin ampliar imágenes menores. Comenzar con calidad 85 y reducir hasta 60 si el resultado excede 8 MiB; el límite técnico del bucket canónico es 32 MiB, de modo que un original válido no se rechaza por el límite de 5 MiB aplicado equivocadamente al derivado. Una avería de procesamiento se informa como fallo recuperable, sin sustituir la portada guardada.

**Rationale**: Los 5 MiB son un límite del archivo admitido, no una garantía de tamaño al recodificar. El derivado reduce la transferencia pública y elimina metadatos personales; el recorte de presentación sigue siendo centrado y no destructivo. El canal alfa se conserva.

**Alternatives considered**: Servir el original con EXIF; usar la misma restricción de 5 MiB para entrada y salida; generar muchas variantes desde el principio. Se descartan por privacidad, rechazo incorrecto de entradas válidas y complejidad.

## 6. Aislamiento de persistencia y permisos

**Decision**: Añadir `event_covers` como extensión técnica uno a uno de `Event`, y `event_cover_uploads` para operaciones duraderas. Escrituras solo desde el servidor mediante funciones restringidas a `service_role`; RLS habilitado. Reutilizar `authenticateOrganizer` para validar el token y la propiedad; comprobar de nuevo el propietario bajo bloqueo del evento en el commit. El cliente administrativo vive en `lib/supabase/` con `server-only` y una clave sin prefijo público.

**Rationale**: `events` ya concede INSERT y UPDATE de tabla a usuarios autenticados. Añadir columnas de portada permitiría escribirlas saltándose la validación de imágenes. Una relación separada evita ampliar o migrar todos esos permisos heredados. Las nuevas tablas no introducen una galería ni sustituyen las entidades Event, TicketType, Ticket o Registration.

**Alternatives considered**: Columnas nuevas y API como única barrera; revocar permisos de tabla y reotorgar cada columna antigua; un bucket abierto. La primera es insegura; la segunda modifica un contrato más amplio sin necesidad.

Fuentes: [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [Private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).

## 7. Concurrencia, reintento y limpieza

**Decision**: Revisión opaca UUID de portada, inicialmente `null`. Cada cambio exitoso obtiene otra revisión, incluso al quitar la imagen; conservar una fila sin objeto como tombstone. Toda mutación compara `expectedRevision` bajo bloqueo de `Event`. Las operaciones de subida tienen identificador UUID, expiración de 30 minutos y estado consultable; la finalización usa una concesión de procesamiento con token de intento y vencimiento, y su commit es idempotente. Un conflicto devuelve 409.

**Rationale**: Detecta formularios desactualizados sin mezclar cambios de imagen con aforo u otros campos. Un resultado de red incierto puede reconciliarse mediante GET, sin afirmar un fallo de guardado que realmente terminó. Para subidas se consulta la operación durable por `uploadId`; descripción/eliminación no crean esa operación y consultan el estado actual, conservando borrador y revisión base según [contrato API](contracts/api.md#recuperación-de-patch-y-delete-sin-respuesta), sin atribuir autoría a un estado observado coincidente. Se sube el candidato antes de cambiar la referencia, y se elimina el objeto anterior después del commit. Una limpieza fallida no convierte un guardado confirmado en error.

**Alternatives considered**: Última escritura gana; eliminar el original antes de sustituir; estado de operación solo en memoria. Pierden cambios, imágenes o capacidad de recuperar operaciones interrumpidas.

La URL de subida de Supabase dura 2 horas, aunque la operación de aplicación expire antes. La limpieza diaria considera la edad del objeto, espera al menos 3 horas, invalida atómicamente intentos expirados y comprueba referencias activas antes de eliminar. Cada intento de procesamiento tiene destino canónico único; un trabajador con concesión vencida no puede confirmar. El barrido de buckets también encuentra objetos cuyo evento ya se eliminó. La activación del mantenimiento requiere autorización de acceso a la base de datos y Storage; no se programa ni ejecuta durante el plan.

## 8. Lectura pública, visibilidad y caché

**Decision**: Servir bytes por una ruta propia de imagen que comprueba en cada petición el estado público y la referencia vigente; `Cache-Control: no-store`, sin redirecciones firmadas ni optimizador de Next.js. Usar `Image` con `unoptimized`, marco fijo y fallback cliente. La URL incluye un identificador aleatorio del objeto actual; las referencias antiguas devuelven 404. La vista privada recibe bytes tras autorización Bearer, como Blob de vida local.

**Rationale**: Una URL firmada conserva acceso hasta caducar y una URL pública no aplica RLS al descargar. El proxy mantiene privados los borradores y deja de servir imágenes sustituidas. El optimizador no reenvía headers de autenticación y su caché no tiene invalidación directa. Las páginas y metadatos permanecen dinámicos, sin llamadas a Storage en el camino crítico del registro.

**Alternatives considered**: Bucket público; URL firmada en HTML; optimización cacheada del proxy mutable. No garantizan la visibilidad y frescura acordadas. Un visitante puede conservar bytes ya recibidos; esto no implica actualización retroactiva de páginas o descargas anteriores.

Fuente: [Serving downloads](https://supabase.com/docs/guides/storage/serving/downloads).

## 9. Creación y gestión de la portada

**Decision**: Dos guardados explícitos: los datos del evento conservan su operación existente; la portada tiene «Guardar portada», «Quitar portada» y «Descartar cambios». Al crear, permitir seleccionar archivo y descripción localmente, pero guardar primero el evento y obtener su ID. Mantener el panel abierto si hay portada pendiente, con «Evento creado. Guarda ahora la portada.»; no iniciar publicación ni guardar imagen implícitamente. Si no hay selección pendiente, el formulario conserva su cierre habitual. Al editar, la portada y los demás campos se guardan por separado, sin reiniciar los campos del formulario al refrescar metadatos.

**Rationale**: La imagen nunca se vuelve requisito para crear o publicar y un fallo de imagen no se presenta como fallo del evento. Evita una falsa transacción entre la edición heredada, Storage y PostgreSQL. Los borradores de portada son locales; cerrar el panel los descarta y no modifica la portada persistida. No se añade herramienta de recorte ni drag-and-drop especializado.

**Alternatives considered**: Un guardado aparentemente atómico de todo; exigir volver a abrir el evento para elegir imagen; descartar la selección al cerrar automáticamente el panel. Generan estados engañosos o pérdida de trabajo.

## 10. Dirección visual y accesibilidad

**Decision**: Marco 16:9 uniforme en cartelera, registro y previsualización, recorte centrado. Título, fecha y reserva fuera de la imagen. Marcador «Sin imagen de portada» en superficie oliva suave, sin imagen rota. Reutilizar Card, Field, Input, Textarea, Button y Sheet; documentar solo el nuevo patrón de portada. Mantener 375/1440 px como aceptación y sumar 390/1280 px como referencia del sistema.

**Rationale**: Cumple FR-008–013 sin superposiciones que dependan de cada fotografía. Labels, ayuda y error quedan asociados; estado anunciado de forma no intrusiva; errores anunciados una vez; foco vuelve a una acción estable cuando desaparece el control usado. No se impone nueva longitud de texto alternativo ni se trunca lo esencial: texto vacío o espacios usa el título vigente. La descripción propia se conserva al sustituir salvo edición explícita y se borra al quitar la portada. Se cubre ampliación de texto y movimiento reducido en los controles afectados; no se declara conformidad global del producto.

**Alternatives considered**: CTA sobre fotografía, proporciones variables, crop manual, rediseño general y certificación de accesibilidad de todo el producto. No son necesarios para esta función.

Referencias locales: `PRODUCT.md`, `DESIGN.md`, `.agents/skills/door-list-ui/`; [contrato de UI](contracts/ui.md).

## Resultado de fase 0

Las incógnitas técnicas del plan quedan resueltas por las decisiones anteriores. La configuración del entorno, aplicación de migraciones, declaración efectiva de sharp y validación en una base autorizada son trabajo de implementación y despliegue, no investigaciones pendientes. La checklist personalizada sigue siendo propiedad del revisor: este plan no evalúa ni marca sus casillas.
