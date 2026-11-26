# Modelo de datos: portadas de eventos

Diseño de fase 1, todavía sin migración aplicada. Fuente: [spec.md](spec.md), FR-001–007 y FR-015–017; decisiones en [research.md](research.md).

## Entidades y contratos compartidos

`Event` sigue siendo el agregado de negocio. Su portada es una extensión opcional; `TicketType`, `Ticket` y `Registration` conservan sus responsabilidades. No se incorpora una galería.

Los tipos nuevos se definen una vez en `lib/event-covers.ts` y se reutilizan desde API y UI:

| Tipo/campo camelCase | Significado |
| --- | --- |
| `EventCoverState.coverRevision: string \| null` | Revisión UUID opaca; `null` solo antes de la primera mutación |
| `EventCoverState.cover: EventCover \| null` | Portada guardada o ausencia |
| `EventCover.imageId: string` | UUID aleatorio del objeto canónico vigente |
| `EventCover.altText: string \| null` | Descripción propia normalizada; espacios o vacío se normalizan a `null` |
| `EventCover.width`, `height` | Dimensiones del derivado, en píxeles |
| `EventCover.contentType` | `image/webp` para la representación canónica |
| `EventCover.imageUrl: string \| null` | Campo siempre presente en una portada: ruta pública propia si el evento es público; `null` si es privado |
| `EventCoverUpload` | Estado de una operación, sin rutas ni credenciales internas salvo el permiso temporal entregado al iniciarla |

La descripción efectiva se calcula como `altText` propio o título vigente del evento, sin guardar una copia del título ni usar el nombre de archivo. No se impone una longitud de producto nueva al texto; los cuerpos HTTP se acotan como protección de transporte y no se truncan silenciosamente. Los campos de persistencia se traducen una vez en el servidor. Los nuevos contratos son camelCase; la adaptación de los tipos heredados se limita a los consumidores de portada.

## Relación `event_covers`

Extensión técnica uno a uno de `events`. No añadir columnas editables de portada a `events`: sus permisos heredados permiten escrituras directas del organizador.

| Columna de persistencia | Tipo/restricción | Propósito |
| --- | --- | --- |
| `event_id` | UUID PK/FK → `events.id`, cascade | Una fila como máximo por evento |
| `revision` | UUID NOT NULL | Nueva revisión por cada mutación exitosa |
| `image_id` | UUID nullable, único cuando presente | Identificador inenumerable de la representación actual |
| `object_path` | text nullable, único cuando presente | Ruta canónica generada por servidor |
| `alt_text` | text nullable | Descripción propia; sin espacios como único contenido |
| `width`, `height` | integer nullable, positivos | Dimensiones del derivado |
| `content_type` | text nullable | Solo `image/webp` |
| `updated_at` | timestamptz NOT NULL | Instante UTC del último cambio |

Restricción de integridad: `image_id`, `object_path`, `width`, `height` y `content_type` están presentes juntos o son todos nulos; sin imagen, `alt_text` también es nulo. La ausencia inicial no requiere fila. Quitar una portada mantiene una fila sin imagen con revisión nueva; permite distinguir un formulario viejo de un estado inicialmente vacío. No se conserva historial público de imágenes anteriores.

**RLS y grants**: SELECT de metadatos a propietario o visitante de evento publicado, mediante relación con `events`; ninguna escritura a `anon` o `authenticated`. Las políticas de lectura no conceden acceso a bytes de Storage. No exponer `object_path` en contratos de aplicación. Usar una proyección explícita en los loaders.

## Relación `event_cover_uploads`

Registro técnico de una intención de subida para un evento existente. No es una portada vigente ni una entidad Ticket o Registration.

| Columna | Tipo/restricción | Propósito |
| --- | --- | --- |
| `id` | UUID PK aleatorio | Identificador de operación |
| `event_id` | UUID FK → `events.id`, cascade | Evento destino |
| `owner_id` | UUID FK → `auth.users.id` | Identidad verificada al iniciar; no sustituye la comprobación actual de propiedad |
| `expected_revision` | UUID nullable | Estado base de la portada |
| `staging_path` | text NOT NULL UNIQUE | Ruta aleatoria inmutable, generada por servidor |
| `declared_content_type` | text NOT NULL | JPEG/PNG/WebP; ayuda al transporte, no prueba de contenido |
| `declared_byte_length` | integer, 1–5 242 880 | Longitud declarada, contrastada después con bytes reales |
| `status` | text con CHECK | `pending`, `processing`, `committed`, `rejected`, `expired` |
| `claim_token` | UUID nullable | Intento concreto de procesamiento |
| `claim_expires_at` | timestamptz nullable | Concesión máxima de procesamiento de 5 minutos |
| `candidate_image_id`, `candidate_path` | UUID/text nullable | Destino único del intento actual |
| `committed_revision` | UUID nullable | Resultado durable de la operación exitosa |
| `created_at`, `expires_at` | timestamptz NOT NULL | UTC; expiración de aplicación a los 30 minutos |
| `finished_at` | timestamptz nullable | Estado terminal |

Índices: `(event_id, created_at)`, `(status, expires_at)` y unicidad de rutas. `committed_revision` es obligatorio solo en estado `committed`. La concesión de procesamiento y candidato se asignan juntos. Reintentar tras concesión vencida usa otro candidato; nunca sobrescribe bytes canónicos.

**RLS y grants**: SELECT solo al propietario actual del evento que coincide con `owner_id`; sin escrituras desde clientes. Proyecciones API omiten rutas, claims y credenciales. Las funciones de coordinación son ejecutables solo por `service_role`, revocando el grant implícito de PUBLIC.

## Storage

| Bucket privado | Restricciones | Acceso |
| --- | --- | --- |
| `event-cover-staging` | 5 242 880 bytes; `image/jpeg`, `image/png`, `image/webp` | Subida firmada a una ruta específica; sin lectura/listado/escritura general del navegador |
| `event-covers` | 32 MiB; `image/webp` | Escritura y descarga administrativa desde servidor; navegador recibe bytes por proxy |

Paths internos: `<eventId>/<uploadId>/<randomId>` para staging y `<eventId>/<imageId>.webp` para cada candidato. No incorporar nombres de archivo ni datos personales. Buckets y restricciones se definen en una migración nueva. No borrar objetos con SQL; usar la API de Storage.

## Mutaciones y atomicidad

Todas las funciones de commit bloquean primero `events` por `event_id`, comprueban `owner_id` contra el usuario verificado y luego bloquean la intención, cuando exista. El orden de bloqueo es consistente también en limpieza. Un proceso de imagen no mantiene una transacción abierta mientras decodifica o transfiere bytes.

1. **Inicio**: comprobar propiedad y revisión; registrar intención, generar permiso de subida. Todavía no cambia `event_covers`.
2. **Finalización**: reclamar intención con vencimiento; descargar staging con lectura acotada; validar el archivo original completo; orientar y generar WebP; almacenar candidato inmutable.
3. **Commit**: comprobar otra vez propiedad, revisión base y claim vigente; escribir portada y revisión nueva, marcar intención `committed` en una única transacción. Una repetición del mismo commit devuelve el resultado registrado.
4. **Descripción**: exigir imagen vigente y revisión coincidente; cambiar solo descripción y revisión. El `image_id` permanece.
5. **Eliminación**: comparar revisión; borrar referencia y descripción, manteniendo tombstone con revisión nueva. Un estado sin imagen puede tratarse como resultado ya vacío sin crear otra imagen.
6. **Conflicto**: responder 409, sin alterar portada; descartar candidato no referenciado mediante mantenimiento. La UI conserva sus datos locales hasta que la persona decida recargar o descartar.

La nueva portada conserva la descripción propia anterior si no se envía una edición; `altText` explícito, incluso vacío, la reemplaza. Quitar la portada borra su descripción. Un fallo anterior al commit conserva portada y descripción anteriores. Tras commit, el fallo de limpieza no altera el éxito.

## Estados de operación y mantenimiento

`pending → processing → committed`; desde `processing`, archivo inválido pasa a `rejected`, vencimiento a `expired`, y fallo transitorio permite volver a `pending` o reclamar tras caducar la concesión. El reintento puede crear otro candidato, pero solo un claim vigente puede confirmar. `committed`, `rejected` y `expired` son terminales.

La consulta de operación devuelve estado y revisión comprometida junto al estado actual de portada. Si después hubo otra edición, ambos se distinguen y la UI informa del estado vigente. Una pérdida de respuesta no implica automáticamente fracaso del guardado.

Las operaciones durables de `event_cover_uploads` corresponden únicamente a subidas. Descripción y eliminación usan la revisión de `event_covers`, sin crear una intención ni disponer de `uploadId`. Su recuperación consulta el estado actual y conserva la revisión base del intento según [Recuperación de PATCH y DELETE sin respuesta](contracts/api.md#recuperación-de-patch-y-delete-sin-respuesta); observar un estado coincidente no acredita el resultado ni la autoría de la petición perdida.

Un barrido diario usa listado de Storage para encontrar objetos de más de 3 horas que no estén referenciados por una portada actual ni por una intención activa. Debe invalidar claims expirados antes de seleccionar sus objetos para borrado; ningún commit acepta un claim invalidado. Comprobar edad del objeto, no solo de la fila: el permiso de subida de Storage sigue válido 2 horas. Los objetos antiguos sustituidos, candidatos fallidos y objetos de eventos eliminados quedan cubiertos. Mantener registros terminales al menos 24 horas para reconciliación y purgarlos después de la limpieza. Cada ejecución con acceso a datos requiere la autorización prevista en AGENTS.md; programarla es una operación de despliegue posterior.

## Migración e interfaces existentes

Planificar `supabase/migrations/20261125120000_event_cover_images.sql`: relaciones, constraints, índices, RLS/grants, buckets, funciones de coordinación y extensión aditiva de la proyección de `get_public_registration_event`. Mantener intactos sus filtros, cálculos de disponibilidad y campos existentes. Las fechas heredadas y reglas de aforo no se corrigen dentro de esta migración.

No hay backfill de imágenes. Los eventos existentes no tienen fila y presentan marcador. La nueva versión de aplicación se despliega después de aplicar la migración autorizada; una reversión de aplicación puede dejar estas tablas sin uso sin borrar datos. Nunca reescribir migraciones aplicadas.
