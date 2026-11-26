# Contratos HTTP de portadas

Diseño de fase 1. Tipos únicos en `lib/event-covers.ts`; errores reutilizan `ApiError` de `lib/api-contracts.ts`. Campos request/response camelCase. UUID en todos los identificadores. Requests JSON, salvo transferencia directa a Storage. Las rutas privadas usan `Authorization: Bearer <token>` validado con `authenticateOrganizer`.

## Convenciones

- Toda respuesta de error de la aplicación: `{ "error": "mensaje propio en español" }` y código HTTP correspondiente. Sin códigos de negocio ocultos en un 200.
- Respuestas de datos y bytes: `Cache-Control: no-store`; privadas además `private`. Nunca registrar tokens, permisos firmados ni bytes en logs.
- `coverRevision`/`expectedRevision` son UUID o `null`, nunca números o timestamps. Todos los errores de transporte/proveedor se traducen al vocabulario del producto.
- El cliente comprueba `response.ok` antes de interpretar cuerpos exitosos; para errores interpreta únicamente el esquema `ApiError` de forma defensiva. El transporte de Storage usa `{ error }` del SDK y su mensaje crudo no se presenta en UI.
- Los endpoints pequeños limitan el cuerpo JSON a 64 KiB, sin truncarlo. Esto no define un nuevo máximo de caracteres de descripción alternativa.
- Ningún endpoint acepta una URL de origen, bucket o path elegido por el cliente.

## Estado de portada

`EventCoverState` contiene `coverRevision` y `cover`. Una portada contiene siempre `imageId`, `altText`, `width`, `height`, `contentType` e `imageUrl`. `imageUrl` es `string | null`: contiene la ruta pública propia si el evento es público y vale `null` si es privado; el campo nunca se omite. Sin portada: `cover:null`; tras una eliminación puede haber revisión no nula.

### GET `/api/organizador/eventos/{eventId}/portada`

200: estado actual de portada, disponible incluso para borrador del propietario. No devuelve bytes, nombre original, rutas de Storage ni enlaces de descarga firmados. Si el evento es privado, `imageUrl:null`; el editor usa la ruta autenticada de bytes descrita abajo.

### POST `/api/organizador/eventos/{eventId}/portada/subidas`

Body: `{ expectedRevision, contentType, byteLength }`. `contentType` admite los tres MIME declarados en FR-015; longitud entre 1 y 5 242 880. Revisar propiedad y revisión antes de crear la operación.

201: `{ uploadId, uploadToken, uploadPath, uploadBucket, uploadExpiresAt, expiresAt }`. Esta es la única respuesta que entrega la capacidad firmada de escritura a un path específico. `uploadExpiresAt` refleja las 2 horas de Storage; `expiresAt` el límite de aplicación de 30 minutos. El permiso se genera con `upsert:false`. El navegador lo usa con `uploadToSignedUrl`; no hay derecho a sobrescribir el destino canónico.

La información declarada solo permite rechazos tempranos: finalizar siempre valida bytes reales. El permiso de subida no concede publicación ni asociación al evento. Si la creación del permiso falla, la intención se invalida o queda disponible para limpieza, sin tocar la portada.

### POST `/api/organizador/eventos/{eventId}/portada/subidas/{uploadId}/confirmar`

Body: `{ altText? }`. Omitido conserva la descripción propia actual; presente, incluso vacío o espacios, la reemplaza o la restablece al título derivado. El servidor usa la revisión base registrada en la intención.

200: `{ uploadId, committedRevision, state: EventCoverState }` tras validación, generación de candidato y commit. Una repetición de una operación ya comprometida no vuelve a guardar: informa `committedRevision` original y `state` vigente. El cliente distingue si una edición posterior ya sustituyó ese resultado.

409 si otro proceso mantiene la finalización activa o cambió la revisión; 410 si caducó; 422 si el archivo es inválido; 503 ante fallo transitorio anterior al commit. Si el commit ocurrió y falló la limpieza, se mantiene 200. Si se desconoce si ocurrió el commit, el cliente consulta estado antes de anunciar fallo definitivo.

### GET `/api/organizador/eventos/{eventId}/portada/subidas/{uploadId}`

200: `{ uploadId, status, committedRevision, state: EventCoverState }`. `status`: `pending`, `processing`, `committed`, `rejected` o `expired`; `committedRevision` nulo salvo éxito. Recuperar la representación de una operación terminal es una consulta exitosa, no una nueva tentativa de mutación. No devuelve errores crudos ni tokens. Para operación ajena o inexistente: 404.

### PATCH `/api/organizador/eventos/{eventId}/portada`

Body: `{ expectedRevision, altText }`. Solo modifica la descripción de una portada vigente; vacío/espacios significa descripción derivada. 200: `EventCoverState`. Revisión desactualizada: 409; ausencia de portada: 409, con mensaje para recargar el estado.

### DELETE `/api/organizador/eventos/{eventId}/portada`

Body: `{ expectedRevision }`. 200: estado sin portada con revisión vigente. Si ya estaba vacío y la revisión coincide, devolver ese estado; una revisión antigua produce 409. No borrar objetos antes de confirmar la referencia. No devuelve 204 porque la UI necesita reconciliar el estado.

### Recuperación de PATCH y DELETE sin respuesta

Estas mutaciones no crean una intención de subida ni devuelven `uploadId`. Antes de enviarlas, el editor conserva la revisión base y el cambio solicitado; para PATCH conserva también el `imageId` de la portada que se estaba describiendo y la descripción normalizada. Una pérdida de respuesta o espera de 60 segundos inicia una consulta a GET `/api/organizador/eventos/{eventId}/portada`, sin repetir automáticamente la mutación ni consultar una operación de subida.

| Estado observado por GET | Resolución |
| --- | --- |
| PATCH: mismo `imageId` y `altText` normalizado solicitado; DELETE: `cover:null` | Mostrar el estado consultado e informar que coincide con el cambio solicitado, sin atribuirlo a la petición perdida ni afirmar su éxito. El borrador se conserva hasta descarte o aceptación explícita del estado consultado. |
| El cambio solicitado no está presente y `coverRevision` coincide con la revisión base | Informar que el resultado sigue sin confirmarse. Permitir reintento explícito con la misma revisión base y el mismo cambio solicitado; la petición original podría seguir en curso. La comparación de revisión impide que ambas mutaciones efectivas se confirmen. |
| El cambio solicitado no está presente y `coverRevision` es distinta de la revisión base | Tratarlo como conflicto; conservar borrador y ofrecer actualizar/revisar el estado vigente antes de decidir otro guardado. No adoptar automáticamente la nueva revisión para sobrescribir cambios ajenos. |
| GET falla o la sesión caduca | Conservar borrador y último estado conocido; permitir reintentar la consulta o recuperar la sesión, manteniendo deshabilitadas las mutaciones hasta obtener estado autorizado. |

La coincidencia del estado actual tampoco demuestra autoría: otra sesión pudo realizar el mismo cambio. Para PATCH, una descripción coincidente en una imagen distinta sigue el caso de conflicto. Aceptar el estado consultado o actualizarlo para otro guardado es una decisión explícita; cualquier guardado posterior conserva la comparación de revisión. No añadir registros de operación ni claves de idempotencia para estas dos mutaciones. La consulta por `uploadId` y el resultado durable siguen siendo el mecanismo de recuperación de la confirmación de una subida.

## Entrega de bytes

### GET `/api/eventos/{eventId}/portada/{imageId}`

Pública, sin Bearer. Comprobar UUID, evento publicado conforme a visibilidad existente y `imageId` igual al actual. Descargar exclusivamente la ruta canónica resuelta en servidor. 200: bytes `image/webp`, `Cache-Control:no-store`, `X-Content-Type-Options:nosniff`. No redirigir ni exponer URLs de Storage.

404 JSON propio para evento privado/inexistente, imagen ausente o referencia vieja. 503 JSON propio si Storage no entrega una imagen vigente. El componente trata cualquier error de imagen como fallback de dimensiones fijas. Un fallo nunca altera disponibilidad de reservas.

### GET `/api/organizador/eventos/{eventId}/portada/imagen/{imageId}`

Misma resolución de referencia actual, pero con autorización Bearer de propietario, incluso si el evento es borrador. 200 bytes WebP, `private,no-store`; demás errores JSON propios. El editor obtiene Blob, crea URL local y la revoca al sustituirla o desmontarse. No incluye Bearer en URLs, HTML ni almacenamiento persistente.

## Lecturas existentes

- Cartelera: ampliar su selección con la relación uno a uno de portada, en la misma consulta; evitar N+1 de metadatos o llamadas a Storage durante SSR.
- Registro: ampliar de forma aditiva `get_public_registration_event` y el mapeo de `lib/public-events.ts`, preservando filtros y disponibilidad. `PublicEventResponse` incorpora el estado de portada camelCase mediante tipos compartidos.
- Organizador: el editor consulta su estado de portada por el GET privado. No es necesario añadir bytes al listado del dashboard ni a correos/entradas.
- El título vigente se combina con `altText` al presentar; un cambio de título se refleja sin mutar la imagen ni duplicar descripción derivada.

## Códigos de error

| HTTP | Situación | Mensaje orientativo |
| --- | --- | --- |
| 400 | JSON/esquema inválido, campo inesperado | «Revisa los datos de la portada.» |
| 401 | Sesión ausente o vencida | «Inicia sesión para guardar la portada.» |
| 404 | Evento/operación sin acceso, identificador inválido o referencia vieja | «Portada no disponible.» |
| 409 | Revisión cambiada o operación activa | «La portada cambió. Actualiza su estado antes de guardar.» / «Estamos guardando esta portada.» |
| 410 | Intención vencida | «La subida caducó. Selecciona la imagen de nuevo.» |
| 413 | Archivo declarado/real demasiado grande o cuerpo de control excedido | «La imagen puede pesar como máximo 5 MiB.» / «La solicitud es demasiado grande.» |
| 415 | Formato declarado/contenido no admitido | «Usa una imagen JPEG, PNG o WebP estática.» |
| 422 | Animación, corrupción o dimensiones inválidas | «La imagen debe ser estática, legible y medir entre 600 y 6000 px por lado.» |
| 503 | Proveedor/procesamiento transitoriamente no disponible | «No pudimos guardar la portada. Conservamos la anterior; vuelve a intentarlo.» |

El mensaje de conservación se usa solo cuando se conoce que no hubo commit. Ante resultado incierto: «No pudimos confirmar el resultado. Estamos consultando el estado de la portada.»; mantener la opción de reconciliar antes de reintentar. Un error de credenciales no devuelve detalles sobre eventos ajenos.
