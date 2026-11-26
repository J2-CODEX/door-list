---
description: "Implementation tasks for optional event cover images"
---

# Tasks: Imágenes de portada en eventos

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md), [contracts/ui.md](contracts/ui.md) y [quickstart.md](quickstart.md), desde `specs/002-event-cover-images/`.

**Prerequisites**: diseño disponible; aplicar `AGENTS.md` y `.specify/memory/constitution.md`. Feature resuelta: `002-event-cover-images`; rama real: `features/imagenes-en-eventos`.

**Tests**: se incluyen las validaciones previstas por los escenarios y SC-001–009 de la especificación y concretadas en plan/quickstart. Escribir primero las pruebas de cada historia y comprobar su fallo por el comportamiento pendiente; las pruebas locales usan dobles sin conexiones. No ejecutar integración real durante la generación de tareas.

**Organization**: tareas por historia; los fundamentos contienen únicamente contratos, permisos y coordinación compartidos. Ninguna tarea se considera realizada por existir este documento.

## Format: `[ID] [P?] [Story] Description`

- Cada tarea empieza con `- [ ]`, un ID secuencial y rutas exactas relativas a la raíz.
- `[P]` identifica trabajo en archivos distintos que puede ejecutarse simultáneamente una vez satisfechos los prerrequisitos indicados en Dependencias.
- `[US1]`, `[US2]` y `[US3]` corresponden a las historias de `spec.md`; las fases compartidas no llevan etiqueta de historia.
- Las citas `data-model.md: Entity.field` remiten al modelo de esta carpeta. Para persistencia, `event_covers` y `event_cover_uploads` son las relaciones canónicas y conservan snake_case; los contratos de aplicación son camelCase.

## Path Conventions

App Router en `app/`; editor exclusivo en `app/organizador/`; UI compartida en `components/`; lógica y tipos en `lib/`; cliente privilegiado en `lib/supabase/`; esquema solo en `supabase/migrations/`; fixtures/harness solo en `tests/`. No añadir rutas productivas de demostración ni portadas en emails o entradas.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: preparar dependencias y muestras reproducibles sin alterar el producto.

- [X] T001 Verificar las versiones instaladas con `package.json`, `package-lock.json` y `node_modules/next/package.json`, consultar la documentación oficial de esa versión en `node_modules/next/dist/docs/` antes de escribir código Next.js y registrar referencias de Route Handlers, Image, params asíncronos, runtime Node y caché en `specs/002-event-cover-images/quickstart.md`; antes de cualquier UI, leer `.agents/skills/door-list-ui/SKILL.md`, `PRODUCT.md` y `DESIGN.md`.
- [X] T002 Preparar la declaración directa de sharp 0.35.5 en `package.json` y solicitar confirmación explícita antes del comando de instalación que actualiza `package-lock.json`; conservar la versión acordada en `specs/002-event-cover-images/research.md` y no añadir SDK de subida ni editor de imágenes.
- [X] T003 Crear un generador reproducible y manifiesto en `tests/fixtures/event-covers/generate.mjs` y `tests/fixtures/event-covers/README.md`, con archivos estáticos JPEG/PNG/WebP, límites exactos de bytes y cada dimensión, corrupción de píxeles, cero bytes, formato renombrado, APNG/WebP animado, EXIF y alfa; añadir muestras horizontal/vertical/cuadrada, círculo y marcas de centro/bordes, blanco/negro/alto contraste/texto y títulos cortos/largos según `specs/002-event-cover-images/quickstart.md`, asegurando que los archivos de peso exacto siguen siendo contenedores válidos.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: contratos únicos, almacenamiento privado y coordinación segura para las tres historias.

**Gate**: completar esta fase antes de implementar historias. Preparar migración y pruebas SQL es trabajo local; aplicarlas o ejecutarlas exige confirmación explícita. La migración nueva se termina y revisa antes de su primera aplicación, sin reescribir migraciones ya aplicadas.

- [X] T004 [P] Definir tipos de estado, portada, requests/responses y operación, constantes y helper de alternativa/normalización en `lib/event-covers.ts`, reutilizando `ApiError` de `lib/api-contracts.ts`; implementar las definiciones canónicas de `data-model.md`: `EventCoverState.coverRevision`, `EventCoverState.cover`, `EventCover.imageId`, `EventCover.altText`, `EventCover.width`, `EventCover.height`, `EventCover.contentType` y `EventCover.imageUrl`, y la proyección de `EventCoverUpload` sin claims/rutas internas fuera del permiso de inicio; no duplicar tipos ni persistir la alternativa derivada del título.
- [X] T005 [P] Crear `event_covers` con integridad conjunta, tombstone, índices, grants de columnas/proyección y RLS de propietario/evento publicado en `supabase/migrations/20261125120000_event_cover_images.sql`, implementando las definiciones de `data-model.md`: `event_covers.event_id`, `event_covers.revision`, `event_covers.image_id`, `event_covers.object_path`, `event_covers.alt_text`, `event_covers.width`, `event_covers.height`, `event_covers.content_type` y `event_covers.updated_at`; impedir escrituras de anon/authenticated y exposición pública del path, sin añadir columnas de portada a `events`.
- [X] T006 Añadir `event_cover_uploads`, integridad de estados/claim/candidato y resultado durable, índices, grants y RLS solo del propietario actual coincidente en `supabase/migrations/20261125120000_event_cover_images.sql`, implementando las definiciones de `data-model.md`: `event_cover_uploads.id`, `event_cover_uploads.event_id`, `event_cover_uploads.owner_id`, `event_cover_uploads.expected_revision`, `event_cover_uploads.staging_path`, `event_cover_uploads.declared_content_type`, `event_cover_uploads.declared_byte_length`, `event_cover_uploads.status`, `event_cover_uploads.claim_token`, `event_cover_uploads.claim_expires_at`, `event_cover_uploads.candidate_image_id`, `event_cover_uploads.candidate_path`, `event_cover_uploads.committed_revision`, `event_cover_uploads.created_at`, `event_cover_uploads.expires_at` y `event_cover_uploads.finished_at`.
- [X] T007 Definir los buckets privados, límites y políticas de `data-model.md`, sección Storage, en `supabase/migrations/20261125120000_event_cover_images.sql`; permitir únicamente la capacidad firmada para staging, sin lectura/listado general del navegador ni escritura directa al bucket canónico, y generar paths sin nombres de archivo ni datos personales.
- [X] T008 Implementar funciones de inicio, claim, commit idempotente, cambio de descripción, eliminación y expiración/selección segura para limpieza en `supabase/migrations/20261125120000_event_cover_images.sql`, siguiendo `data-model.md`, secciones Mutaciones y Estados: bloquear Event antes de intención, revalidar propietario/revisión/claim al confirmar, conservar tombstone y resultado durable, invalidar intentos vencidos y revocar EXECUTE a PUBLIC/anon/authenticated, otorgándolo solo a service_role; no mantener transacciones durante decodificación o transferencia.
- [X] T009 [P] Implementar cliente administrativo y adaptador de Storage con `server-only`, sesión no persistente y validación de configuración en `lib/supabase/storage-admin.ts`; usar `SUPABASE_SERVICE_ROLE_KEY` solo en servidor, permisos de subida con `upsert:false`, descargas acotadas y eliminación por API de Storage, sin conexiones al importar ni credenciales en contratos/logs.
- [X] T010 Ampliar aditivamente la proyección de `get_public_registration_event` con metadatos de portada en `supabase/migrations/20261125120000_event_cover_images.sql`, preservando campos, filtros, calendario y cálculo de disponibilidad existentes, sin lectura de bytes de Storage ni backfill de imágenes.
- [X] T011 Preparar comprobaciones transaccionales con datos ficticios y rollback en `tests/event-covers-rls.sql` para lectura de propietario/publicado, denegación a ajeno/puerta, paths protegidos, escrituras directas prohibidas, grants de funciones y buckets privados; incluir carreras de revisión y claims invalidados sin ejecutar el archivo ni aplicar la migración hasta contar con autorización de base de datos.

**Checkpoint**: contratos y migración revisables; almacenamiento y funciones con permisos explícitos. La aplicación real de la migración se valida en T049.

---

## Phase 3: User Story 1 - Dar identidad visual al evento (Priority: P1) — MVP de gestión

**Goal**: guardar una portada opcional y descripción propia o derivada, recuperar ambas al reabrir y crear/publicar sin imagen.

**Independent Test**: en un evento editable, guardar JPEG/PNG/WebP válidos con y sin alternativa propia y reabrir el editor. Admitir exactamente 5 242 880 bytes y dimensiones 600/6000; rechazar 5 242 881 bytes, 599/6001, animación, corrupción y otros formatos. Los fallos conservan datos del evento y estado guardado. Sin imagen sigue siendo posible crear/publicar conforme a las reglas vigentes. Verificar gestión con fixtures sin datos; confirmar persistencia en entorno autorizado mediante T049.

### Tests for User Story 1

- [X] T012 [P] [US1] Escribir pruebas de bytes reales en `tests/event-cover-validation.test.mjs` usando `tests/fixtures/event-covers/` para todos los límites por lado/peso, formatos por contenido, contenedores animados, truncado de píxeles, EXIF/alfa y metadatos eliminados; comprobar normalización/alternativa del título y generación de WebP según `specs/002-event-cover-images/research.md`, sin red.
- [X] T013 [P] [US1] Escribir pruebas con reloj, persistencia y Storage simulados en `tests/event-cover-state.test.mjs` para inicio/claim/finalización, expiración, reintento con candidato nuevo, idempotencia, revisión opaca, pérdida de respuesta y conservación del estado previo ante fallo precommit; comprobar que un fallo de limpieza postcommit mantiene éxito y que el trabajador con claim vencido no confirma.
- [X] T014 [P] [US1] Escribir pruebas de contrato de GET privado, inicio, consulta de operación, confirmación y bytes privados en `tests/event-cover-api.test.mjs`, con dobles de autenticación/transportes y sin conexiones: validar esquemas/cuerpos acotados, propietario, sesión vencida, UUID, MIME/peso declarados frente a bytes, HTTP y `{ error }`, `no-store`, permiso limitado al staging y ausencia de secretos/paths en respuestas ajenas al inicio; comprobar presencia y valor público/privado de `EventCover.imageUrl` según su definición canónica en `data-model.md`.
- [X] T015 [P] [US1] Crear el harness aislado en `tests/fixtures/cover-preview/app/layout.tsx`, `tests/fixtures/cover-preview/app/page.tsx` y `tests/fixtures/cover-preview/next.config.ts`, junto con casos de gestión en `tests/e2e/event-cover-ui.spec.mjs`; reutilizar editor/componentes/estilos reales con datos y red simulados, y comprobar ayuda previa, etiquetas, creación con selección local, cancelación del selector, errores, progreso, sesión vencida, incertidumbre y conservación de campos a 375/1440 px; impedir imports de loaders/Supabase reales y red externa.
- [X] T016 [P] [US1] Preparar escenarios de alta y reapertura en `tests/e2e/event-cover-flow.spec.mjs`, protegidos por `RUN_E2E_DB_TESTS=1` y configuración explícita de entorno de pruebas; cubrir evento sin imagen, creación una sola vez con selección pendiente, guardado explícito posterior, formatos/límites y usuario sin permiso, sin capturar credenciales o datos personales ni ejecutar integración todavía.

### Implementation for User Story 1

- [X] T017 [US1] Implementar validación completa y transformación en `lib/event-cover-validation.ts` conforme a FR-015 y `specs/002-event-cover-images/research.md` §§4–5: lectura acotada, formato por contenido, parser estructural PNG/RIFF para animación, decodificación estricta completa con sharp, orientación y dimensiones, WebP sin metadatos con alfa, reducción de tamaño/calidad acordada y límite de concurrencia por proceso; diferenciar archivo inválido de avería transitoria sin restringir límites de producto.
- [X] T018 [US1] Implementar lecturas/proyecciones, inicio, consulta durable y finalización de portada en `lib/event-cover-service.ts`, inyectando transportes para las pruebas, reutilizando `authenticateOrganizer` de `lib/supabase/organizer.ts` y los tipos de `lib/event-covers.ts`; validar propiedad, usar las funciones de coordinación, subir candidato antes del commit y limpiar después, distinguir commit desconocido de fallo confirmado y devolver estado actual junto a revisión comprometida en reintentos.
- [X] T019 [US1] Implementar GET de estado en `app/api/organizador/eventos/[eventId]/portada/route.ts`, POST de intención en `app/api/organizador/eventos/[eventId]/portada/subidas/route.ts` y GET de operación en `app/api/organizador/eventos/[eventId]/portada/subidas/[uploadId]/route.ts`, conforme a `specs/002-event-cover-images/contracts/api.md`; reutilizar servicio, schemas y errores, limitar JSON sin truncar y rechazar campos inesperados, paths o URLs elegidos por cliente.
- [X] T020 [US1] Implementar POST de confirmación con runtime Node en `app/api/organizador/eventos/[eventId]/portada/subidas/[uploadId]/confirmar/route.ts`, delegando validación/coordinación al servicio; preservar semántica de `altText` omitido frente a explícito y mapear 409/410/413/415/422/503 sin revelar errores del proveedor ni convertir limpieza fallida tras commit en error de guardado.
- [X] T021 [US1] Implementar bytes privados del propietario en `app/api/organizador/eventos/[eventId]/portada/imagen/[imageId]/route.ts`, con comprobación de referencia vigente y propiedad incluso en borrador, respuesta WebP `private,no-store` y `nosniff`, sin redirecciones, paths del cliente ni enlaces firmados de descarga.
- [X] T022 [US1] Crear el marco compartido y marcador en `components/event-cover.tsx`, aplicando `.agents/skills/door-list-ui/SKILL.md` y `specs/002-event-cover-images/contracts/ui.md`: 16:9 estable, superficie oliva suave, «Sin imagen de portada», decoración aria-hidden y ausencia de anuncios duplicados; resolver alternativa desde `lib/event-covers.ts` y mantener título/fecha/acciones fuera de la fotografía.
- [X] T023 [US1] Crear la hoja cliente mínima en `components/event-cover-image.tsx` con Image `unoptimized`, recorte centrado, dimensiones reservadas y fallback que oculta la imagen rota y se reinicia al cambiar imageId; permitir que `components/event-cover.tsx` sirva como composición compartida sin convertir páginas públicas en Client Components.
- [X] T024 [US1] Implementar selección, descripción, Blob privado/local y guardado explícito en `app/organizador/event-cover-editor.tsx` con primitivas existentes y tipos compartidos; comprobar `response.ok`, usar subida firmada del SDK, revocar URLs Blob, anunciar estados/errores una sola vez, conservar selección/campos tras fallo y reconciliar operación tras 60 segundos o resultado incierto sin prometer reversión; incluir descarte local, foco visible y recuperación de sesión conforme al contrato UI.
- [X] T025 [US1] Integrar el editor en `app/organizador/page.tsx` sin formularios anidados: seleccionar antes de crear, obtener y conservar el ID una sola vez, mantener el panel abierto con «Evento creado. Guarda ahora la portada.» y guardar portada aparte; al editar conservar campos y selección pendiente tras guardar datos, permitir publicación sin imagen y cerrar/descartar solo estado local según `specs/002-event-cover-images/contracts/ui.md`, sin asociación/publicación implícita.

**Checkpoint**: alta y recuperación del estado guardado operativas en el editor, con pruebas locales de validación/gestión. La presentación pública se entrega con US2.

---

## Phase 4: User Story 2 - Reconocer el evento al descubrirlo y reservar (Priority: P1)

**Goal**: misma portada y alternativa vigente en cartelera y registro, con geometría estable y reserva independiente de Storage.

**Independent Test**: ejecutar matriz SC-001–006 en ambas composiciones a 375/1440 px: marco 16:9 con tolerancia de 1 px, cambio de altura total de tarjeta y desplazamientos de contenido de 0 px, círculo sin deformar, centro conservado y recorte simétrico. Probar retraso de 5 s/fallo, títulos largos, alternativas propias/vacías/espacios/cambio de título y controles accesibles. Los datos de reserva siguen disponibles aunque falle Storage.

### Tests for User Story 2

- [X] T026 [P] [US2] Añadir contratos de proxy público y lecturas de metadatos a `tests/event-cover-api.test.mjs`: evento privado, referencia vieja/ausente e ID inválido producen 404; Storage inaccesible produce 503 propio sin romper la lectura de registro; bytes WebP sin redirección y con `no-store`/`nosniff`, selección explícita sin paths, una consulta de metadatos por superficie y nuevos campos camelCase conservando el contrato previo.
- [X] T027 [P] [US2] Ampliar `tests/e2e/event-cover-ui.spec.mjs` con la matriz completa SC-001–006 para cartelera/registro, mediciones de alturas/posiciones antes y después de 5 s y fallo, círculo/marcas de recorte, fallback/alternativa, contraste y teclado; incluir 375/1440 px y adicionalmente 390×844/1280×900, texto al 200 %, movimiento reducido y controles de 48 px.
- [X] T028 [P] [US2] Añadir a `tests/e2e/event-cover-flow.spec.mjs` escenarios de navegación cartelera→registro que comprueben estado/alternativa vigentes sin republicación, borradores y cambio de visibilidad, ausencia de imagen y continuidad de publicación/reserva/entradas de SC-008; mantener la protección opt-in y no ejecutar contra datos sin autorización.

### Implementation for User Story 2

- [X] T029 [US2] Extender `lib/events.ts`, `lib/registration.ts`, `lib/api-contracts.ts` y `lib/public-events.ts` con `EventCoverState` importado, proyecciones y traducción única de persistencia conforme a `data-model.md`, sección Entidades y contratos compartidos; preservar el serializado/deserializado existente y los campos/cálculos previos, sin copiar tipos ni helpers de fecha y sin descargar imágenes en loaders.
- [X] T030 [US2] Implementar `app/api/eventos/[eventId]/portada/[imageId]/route.ts` y la resolución pública correspondiente en `lib/event-cover-service.ts`: comprobar visibilidad y referencia actual en cada petición, descargar solo el objeto resuelto por servidor y entregar WebP `no-store`/`nosniff`, con JSON propio 404/503 según `specs/002-event-cover-images/contracts/api.md`, sin optimizador cacheado ni URL firmada de descarga.
- [X] T031 [US2] Ampliar la consulta única y tarjetas de `app/page.tsx` con relación de portada/proyección explícita y `components/event-cover.tsx`; conservar Server Component dinámico, filtros y helpers de fecha vigentes, datos/CTA fuera de la foto, altura uniforme, título completo y reserva habilitada según sus reglas independientemente de la carga de imagen.
- [X] T032 [US2] Integrar `components/event-cover.tsx` antes del resumen en `app/eventos/[eventId]/registro/page.tsx`, usando el loader ampliado y conservando Server Component dinámico, formulario, disponibilidad y ventanas existentes; no añadir `use cache`, ISR, espera de Storage ni invalidaciones manuales como requisito para nuevas visitas.
- [X] T033 [US2] Ampliar `tests/fixtures/cover-preview/app/page.tsx` con composiciones completas de tarjetas y registro que reutilicen marco, primitivas, resumen y estilos reales, con fixtures de estados de disponibilidad y respuestas simuladas; mantener fuera los imports de páginas/loaders conectados y contrastar las composiciones con `app/page.tsx` y `app/eventos/[eventId]/registro/page.tsx` para que las pruebas de geometría no se limiten a una imagen aislada.
- [X] T034 [US2] Ejecutar la matriz aislada de `tests/e2e/event-cover-ui.spec.mjs` con el harness revisado y documentar medidas, capturas ficticias y resultados SC-001–006 en `specs/002-event-cover-images/validation.md`; corregir desviaciones en `components/event-cover.tsx`, `components/event-cover-image.tsx`, `app/page.tsx` o `app/eventos/[eventId]/registro/page.tsx`, sin iniciar servidor conectado ni aprobar la checklist del revisor.

**Checkpoint**: descubrimiento y registro muestran el mismo contrato vigente; imagen ausente/lenta/fallida conserva geometría e información esencial. US1 + US2 forman el primer incremento público completo.

---

## Phase 5: User Story 3 - Mantener actualizada la portada (Priority: P2)

**Goal**: sustituir, editar descripción y quitar con control de revisión, recuperación y limpieza segura; nuevas visitas reflejan cada commit.

**Independent Test**: partir de una portada guardada, sustituir conservando descripción salvo edición explícita, modificar descripción propia/derivada y quitar; reabrir después de cada operación y comprobar nuevas visitas sin republicar. Conflicto/fallo conserva lo guardado y los campos locales; ajeno/puerta obtiene 0 mutaciones. Un resultado incierto se consulta antes de reintentar. Verificar coordinación con dobles y persistencia/permisos reales mediante T049.

### Tests for User Story 3

- [X] T035 [P] [US3] Ampliar `tests/event-cover-state.test.mjs` para sustitución, descripción omitida/presente/vacía, edición sin cambiar imageId, eliminación con tombstone, eliminación ya vacía, conflicto entre sesiones, propietario cambiado y respuesta perdida tras commit; distinguir revisión comprometida original de estado actual tras otra edición y comprobar que solo un commit gana; para PATCH/DELETE probar petición original retrasada frente a reintento explícito con la misma revisión base conforme a `specs/002-event-cover-images/contracts/api.md`, sección Recuperación de PATCH y DELETE sin respuesta.
- [X] T036 [P] [US3] Añadir contratos PATCH/DELETE y sustitución a `tests/event-cover-api.test.mjs`, cubriendo revisión ausente/desactualizada, ausencia de portada, permisos/rol de puerta, 409 sin cambios, respuesta de estado para eliminación y conservación del éxito ante fallo de limpieza; asegurar `{ error }`, HTTP, límites JSON y ausencia de filtrado de credenciales; simular respuesta perdida por separado en ambos métodos y comprobar recuperación mediante GET de estado, sin crear intención ni requerir `uploadId`, según `specs/002-event-cover-images/contracts/api.md`.
- [X] T037 [P] [US3] Extender `tests/e2e/event-cover-flow.spec.mjs` con sustitución/descripción/eliminación persistentes, nuevas visitas tras cada commit (SC-009), referencia vieja 404, carrera entre dos sesiones, permisos directos rechazados y conservación de resultados de aforo/reserva/entradas antes/después (SC-007–008), manteniendo entorno ficticio y ejecución opt-in autorizada.
- [X] T038 [P] [US3] Ampliar `tests/e2e/event-cover-ui.spec.mjs` para «Guardar descripción», «Quitar portada», selección conservada tras 409, actualizar/descarte explícitos, foco cuando desaparece una acción, cierre del panel y sesión vencida; con harness/dobles cubrir por separado las cuatro respuestas de consulta tras PATCH/DELETE sin respuesta definidas en `specs/002-event-cover-images/contracts/api.md`, sección Recuperación de PATCH y DELETE sin respuesta, incluyendo coincidencia lograda por otra sesión, descripción coincidente en imagen distinta, reintento con revisión original y petición aún en curso; comprobar anuncios neutrales, borrador conservado hasta decisión explícita, mutaciones deshabilitadas si falla la consulta y demás campos sin reiniciarse.
- [X] T039 [P] [US3] Crear `tests/event-cover-cleanup.test.mjs` con reloj/listado/persistencia/Storage simulados para limpieza repetible, edad del objeto, referencias vigentes, intenciones activas, invalidación atómica de claims, candidato huérfano, evento eliminado, subida tardía y retención terminal conforme a `data-model.md`, sección Estados de operación y mantenimiento; no abrir conexiones.

### Implementation for User Story 3

- [X] T040 [US3] Completar en `lib/event-cover-service.ts` las mutaciones de descripción/eliminación y la sustitución sobre revisión, usando las funciones de coordinación y las definiciones de `data-model.md`: `EventCover.altText`, `EventCoverState.coverRevision` y `EventCoverState.cover`; conservar descripción al omitirla, borrar descripción al quitar, reconocer estado ya vacío y limpiar referencias antiguas solo después de commit sin convertir fallos de limpieza en fallos de guardado.
- [X] T041 [US3] Añadir PATCH y DELETE a `app/api/organizador/eventos/[eventId]/portada/route.ts` conforme a `specs/002-event-cover-images/contracts/api.md`, reutilizando autenticación, validación acotada y servicio; devolver estado vigente y 409 ante revisión distinta/edición sin imagen, sin inventar éxito HTTP 200 para errores de negocio.
- [X] T042 [US3] Completar sustitución, guardado de descripción, eliminación, actualización por conflicto y reconciliación en `app/organizador/event-cover-editor.tsx`, con el estado y foco del contrato UI; para PATCH/DELETE sin respuesta implementar la consulta de estado sin `uploadId` y los cuatro resultados de `specs/002-event-cover-images/contracts/api.md`, sección Recuperación de PATCH y DELETE sin respuesta, conservando la revisión original para reintento explícito y sin anunciar éxito propio por coincidencia; mantener selección/descripción local hasta descarte o aceptación explícita del estado consultado, sin adoptar automáticamente otra revisión para sobrescribir, y actualizar únicamente portada en `app/organizador/page.tsx` sin borrar campos pendientes ni añadir otro diálogo de confirmación.
- [X] T043 [US3] Implementar `scripts/cleanup-event-covers.mjs` usando las funciones restringidas y API de Storage: barrer ambos buckets y respetar edad, referencias, intenciones, claims y retención de `data-model.md`, sección Estados de operación y mantenimiento; cubrir eventos eliminados y objetos tardíos, no borrar `storage.objects` con SQL, no conectar al importar y no ejecutar/programar todavía el mantenimiento.
- [X] T044 [US3] Ejecutar las pruebas locales de coordinación/limpieza y gestión en `tests/event-cover-state.test.mjs`, `tests/event-cover-cleanup.test.mjs` y `tests/e2e/event-cover-ui.spec.mjs`; registrar en `specs/002-event-cover-images/validation.md` los resultados de revisión, recuperación, foco y conservación de campos, dejando explícita la persistencia real pendiente de T049.

**Checkpoint**: ciclo completo de mantenimiento comprobable con fixtures; mantenimiento operativo preparado, pendiente de autorización/configuración real.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: revisión visual obligatoria, recursos de procesamiento, evidencia y validación integrada.

- [X] T045 Aplicar el skill `.agents/skills/impeccable/SKILL.md` y `.agents/skills/door-list-ui/SKILL.md` a la implementación renderizada de `app/organizador/event-cover-editor.tsx`, `app/page.tsx` y `app/eventos/[eventId]/registro/page.tsx`; revisar todos los estados/anchos, contraste, foco, texto al 200 %, teclado y lector de pantalla del contrato UI, corregir hallazgos dentro del alcance y registrar evidencia automatizada/humana y pendientes en `specs/002-event-cover-images/validation.md`, sin marcar `specs/002-event-cover-images/checklists/ux.md` como aprobada.
- [X] T046 [P] Medir memoria/tiempo y límite de concurrencia de `lib/event-cover-validation.ts` con fixtures de 6000×6000 px en `tests/event-cover-validation.test.mjs`, sin red, y documentar resultados/presupuesto de memoria y duración exigidos al hosting en `specs/002-event-cover-images/quickstart.md`; ajustar recursos/implementación si hace falta sin reducir límites de producto.
- [X] T047 [P] Documentar el patrón compartido de portada, marcador, recorte, alternativas y estados de gestión en `.agents/skills/door-list-ui/references/component-patterns.md`, contrastando con `components/event-cover.tsx`, `components/event-cover-image.tsx` y `app/organizador/event-cover-editor.tsx`; conservar tokens, primitivas y escalas ajenos al cambio.
- [X] T048 Ejecutar typecheck sin emisión, lint, los cuatro archivos Node de portada (incluido `tests/event-cover-cleanup.test.mjs`) y listado Playwright indicados en `specs/002-event-cover-images/quickstart.md`, tras revisar que sus imports no conecten a servicios; registrar comandos/resultados en `specs/002-event-cover-images/validation.md`, corregir errores y comprobar que las pruebas opt-in no se ejecutan al listar; revisar acceso a datos antes de considerar build o pruebas heredadas.
- [ ] T049 Preparar la revisión final de `supabase/migrations/20261125120000_event_cover_images.sql`, `tests/event-covers-rls.sql` y `tests/e2e/event-cover-flow.spec.mjs`, solicitar confirmación explícita del entorno/alcance antes de cualquier comando de base de datos y, solo tras obtenerla, aplicar la migración nueva antes de ejecutar la aplicación, verificar RLS/grants/buckets y ejecutar integración opt-in, prueba de limpieza y escenarios de `specs/002-event-cover-images/quickstart.md`; registrar SC-007–009, continuidad SC-008 y permisos en `specs/002-event-cover-images/validation.md`, dejando la tarea pendiente si no hay autorización.
- [X] T050 Actualizar `specs/002-event-cover-images/quickstart.md` y `specs/002-event-cover-images/validation.md` con comandos efectivos, configuración de secretos solo servidor, procedimiento de mantenimiento diario, validación de recursos, orden migración→aplicación y reversión sin borrar datos; comprobar trazabilidad FR-001–017/SC-001–009, separar resultados obtenidos de pendientes y dejar programación/despliegue del barrido como operación posterior explícitamente autorizada.

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Setup T001 → T002 → T003
                  │
                  v
Foundational {T004, T005→T006→T007→T008→T010→T011, T009}
                  │
                  v
US1 P1: T012–T025 ──────────────────┐
       │                           │
       v                           v
US2 P1: T026–T034              US3 P2: T035–T044
       └────────────┬──────────────┘
                    v
Polish T045–T050; T049 exige autorización del entorno
```

- Setup establece documentación/versiones/dependencia y fixtures; T003 usa sharp después de T002. No instalar por efecto lateral de generar fixtures.
- En fundamentos, T004, la cadena de migración y T009 trabajan en archivos distintos. T006–T008 y T010 editan la misma migración y se ejecutan en ese orden. T011 usa el esquema/funciones ya preparados. Todas las historias requieren fundamentos completos.
- US1: T012–T016 pueden escribirse simultáneamente con fixtures/fundamentos listos. T017 usa T012; T018 usa T004/T008/T009/T017 y pruebas T013; T019–T021 usan el servicio y T014. T022 precede a T023; ambos alimentan T024. T024 requiere los endpoints y T015; T025 integra T024 y satisface los casos de creación de T016. Primero comprobar fallos esperados de las pruebas locales, nunca acceder a datos para forzar una prueba roja.
- US2: las pruebas T026–T028 pueden prepararse juntas. T029 precede a la integración de páginas; T030 requiere servicio de US1. T031/T032 requieren T029 y los componentes de US1; las lecturas públicas no esperan al proxy. T033 prepara composiciones para T027 y T034 ejecuta la matriz tras completar implementación/harness. T010 ya aporta la proyección SQL.
- US3: T035–T039 pueden escribirse juntas después de US1; T040 usa sus contratos de estado/API y precede a T041/T042; T043 usa T039 y funciones de T008. T044 requiere implementación y suites locales listas. US3 no depende de US2 para gestionar en privado; comprobar actualización pública en T049 requiere ambas historias.
- Para entrega secuencial, seguir P1 US1 → P1 US2 → P2 US3. US1 es un MVP de gestión; el MVP público recomendado incluye US1 + US2. La feature completa requiere las tres historias y validación final.
- T045–T047 pueden ejecutarse a la vez con las historias terminadas: evidencia visual en `validation.md`, recursos en `quickstart.md`/prueba Node y patrón en la referencia del skill. T048 sigue a correcciones; T049 usa la versión final de migración/aplicación y un entorno autorizado; T050 consolida resultados de todos.

### Permissions and Validation Gates

- Redactar estas tareas no autoriza instalaciones ni accesos a base de datos. T002 y T049 deben obtener confirmación explícita conforme a `AGENTS.md`; una bandera de pruebas no sustituye la autorización.
- Se puede preparar código, migración, SQL de verificación, pruebas con dobles y revisión de archivos antes de pedir autorización. No pedir aprobación para un diseño aún sin concretar.
- Un servidor/build que consulte datos también cuenta como acceso a datos. El harness revisado no consulta Supabase ni requiere credenciales reales.
- Las comprobaciones SQL son pruebas versionadas con rollback; los cambios de esquema se realizan exclusivamente por migración, nunca mediante SQL suelto. La limpieza elimina objetos con API de Storage.
- La tarea T049 valida el entorno de pruebas autorizado; publicar/desplegar o activar una programación real del barrido no queda autorizado por generar `tasks.md`.

### Parallel Opportunities

Los marcadores `[P]` son oportunidades dentro de su fase y con los prerrequisitos satisfechos, no instrucciones de iniciar agentes ni promesas de independencia entre todas las fases. T045 puede compartir una ola con T046/T047 sin que se editen los mismos archivos. Los cambios simultáneos en una misma suite/servicio entre US2 y US3 deben serializarse.

## Parallel Example: User Story 1

Con fundamentos y fixtures completos, preparar simultáneamente:

```text
T012: tests/event-cover-validation.test.mjs
T013: tests/event-cover-state.test.mjs
T014: tests/event-cover-api.test.mjs
T015: tests/fixtures/cover-preview/app/page.tsx + tests/e2e/event-cover-ui.spec.mjs
T016: tests/e2e/event-cover-flow.spec.mjs (solo preparación opt-in)
```

Después del servicio T018, los handlers T019–T021 pueden repartirse por archivos; T022→T023 puede avanzar junto a ellos antes de integrar T024/T025. No paralelizar T022 y T023 como si fueran independientes.

## Parallel Example: User Story 2

Tras US1, preparar T026 (API), T027 (matriz UI) y T028 (flujo real opt-in) en archivos distintos. Una vez terminado T029, integrar cartelera T031 y registro T032 simultáneamente; preparar el proxy T030 en otra ola que no coincida con modificaciones del mismo servicio por US3. Ejecutar T034 después de T033 y las integraciones.

## Parallel Example: User Story 3

Tras US1, preparar T035 (estado), T036 (API), T037 (flujo real opt-in), T038 (UI) y T039 (limpieza) simultáneamente, sin escritores de US2 en esas suites. Con las pruebas listas, T043 (script de limpieza) puede avanzar junto a T040→T041→T042 (gestión), porque usa las funciones de coordinación ya completadas en T008.

---

## Implementation Strategy

### MVP First

1. Completar Setup y fundamentos como cambios locales revisables.
2. Completar US1 y validar archivos, estados y editor con dobles/fixtures: MVP de gestión.
3. Añadir US2, también P1, para que la portada aporte valor público en cartelera y registro.
4. Validar el incremento en un entorno autorizado siguiendo el procedimiento de T049; no asumir que las pruebas con fixtures acreditan persistencia o RLS real. Para validar un incremento antes de US3, aplicar solo una versión final revisada de su migración; cualquier ampliación posterior de esquema exige otra migración nueva.

### Incremental Delivery

1. US1 habilita creación/alta opcional sin afectar publicación, aforo ni datos pendientes.
2. US2 añade presentación pública estable y alternativa accesible; reserva independiente de bytes.
3. US3 añade mantenimiento, conflictos, recuperación y limpieza segura.
4. Cerrar revisión visual, pruebas locales e integración autorizada con evidencia por SC. Despliegue y programación se tramitan después según autorización del entorno.

### Scope and Completion Notes

- No corregir en esta feature las discrepancias heredadas de zona horaria o snake_case documentadas en `plan.md`; tampoco modificar reglas de aforo, Registration, TicketType o Ticket.
- Conservar la revisión y alternativa guardadas hasta commit; descripción/eliminación también comparan revisión. No prometer reversión ante un commit incierto.
- No introducir máximos de caracteres nuevos, galerías, crop manual, caché compartida de imágenes o sincronización de páginas abiertas.
- `specs/002-event-cover-images/checklists/ux.md` sigue siendo propiedad de la persona revisora. Registrar evidencia no equivale a aprobarla.
- Total previsto: **50 tareas**; Setup **3**, fundamentos **8**, US1 **14**, US2 **9**, US3 **10**, cierre **6**. Cada historia tiene criterios independientes y trazabilidad en su fase; los criterios transversales se consolidan en T045–T050.

## Estado de ejecución local (2026-11-26)

Implementación y comprobaciones locales completadas; evidencia y límites en
[validation.md](validation.md). T049 permanece pendiente por configuración y
autorización del entorno real. La migración ya está aplicada; los E2E y la
limpieza real todavía no se ejecutaron. Las checklists del revisor no se editaron.

La validación real de T049 queda a cargo del usuario, por decisión expresa.
Permanece pendiente hasta que registre sus resultados.
