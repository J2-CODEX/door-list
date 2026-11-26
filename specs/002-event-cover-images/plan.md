# Implementation Plan: Imágenes de portada en eventos

**Branch**: `features/imagenes-en-eventos` | **Date**: 2026-11-25 | **Spec**: [spec.md](spec.md)

**Input**: `specs/002-event-cover-images/spec.md`. El resolver de Spec Kit identifica la feature como `002-event-cover-images`; la rama Git real es `features/imagenes-en-eventos`.

## Summary

Añadir una portada opcional por evento, con descripción alternativa, gestión por el propietario y presentación consistente en cartelera y registro. La subida va directamente a staging privado de Supabase Storage con permiso temporal; el servidor valida el contenido completo, genera un WebP canónico y confirma la referencia mediante comparación de revisión. La portada previa permanece vigente hasta ese commit.

Aislar los metadatos en una relación uno a uno con escritura exclusiva del servidor, sin ampliar permisos heredados de `events`. Mantener las páginas públicas como Server Components dinámicos. Marco compartido 16:9 con fallback sin desplazamiento; título, fecha y reserva fuera de la fotografía. Diseño detallado en [research.md](research.md), [data-model.md](data-model.md) y [contracts/ui.md](contracts/ui.md).

## Technical Context

**Language/Version**: TypeScript 5.9.3, React 19.3.1 y Node compatible 22.18 o posterior; local observado 26.10.0.

**Primary Dependencies**: Next.js 16.4.5 App Router, Supabase JS 2.119.0, Tailwind 4.3.4, Zod y primitivas existentes. Sharp 0.35.5 está instalado transitivamente: declararlo directo durante implementación, con autorización antes de instalar. Sin SDK adicional de subida ni editor de imágenes.

**Storage**: PostgreSQL/Supabase: `event_covers` y `event_cover_uploads`; buckets privados `event-cover-staging` y `event-covers`. Nueva migración versionada con RLS/grants y funciones de coordinación. Secret administrativo solo en servidor.

**Testing**: Node test runner para validación y coordinación con transportes simulados; Playwright con fixtures y, por separado, integración real opt-in; comprobaciones SQL de RLS solo en entorno autorizado. Revisión visual de implementación con `impeccable` y `door-list-ui`.

**Target Platform**: Web responsive con runtime Node y sharp. Transferencia directa evita depender del límite de upload del hosting. Finalización con al menos 512 MiB presupuestados y concurrencia de procesamiento limitada por proceso; medir el caso de 36 MP antes de desplegar. El hosting debe admitir duración y memoria de finalización y descarga del derivado.

**Project Type**: Aplicación web existente, sin servicio independiente ni rutas productivas de demostración.

**Performance Goals**: 0 px de desplazamiento por carga/fallo; igualdad de altura de tarjeta con mismo texto/ancho; tolerancia de marco de 1 px de SC-001. Reserva independiente de Storage. Una consulta de metadatos por superficie, sin N+1. Sin inventar SLA de latencia o conversión no definido en la especificación.

**Constraints**: Original estático JPEG/PNG/WebP ≤5 242 880 bytes, dimensiones inclusivas 600–6000 px por lado. Alternativa derivada del título cuando falta una propia. Recorte centrado sin ajuste manual. Cambios en nuevas visitas desde commit; sin sincronización obligatoria de páginas abiertas. UI en español, código/identificadores en inglés, contratos camelCase, snake_case solo en persistencia. Calendario, aforo, entradas y registros mantienen sus reglas.

**Scale/Scope**: Una portada vigente por Event; edición del organizador, cartelera y registro. Sin galerías, generación de imágenes ni portadas en correos o entradas. Operaciones de subida de 30 minutos, estado consultable y claims vencidos invalidables; limpieza diaria de huérfanos con edad mínima de 3 horas.

## Constitution Check

Gates evaluados antes de fase 0 y tras fase 1 sobre el diseño propuesto. La aprobación técnica no marca checklists del revisor ni acredita el despliegue actual.

| Principio / regla | Antes de investigación | Después de diseño y evidencia |
| --- | --- | --- |
| I. Especificación y trazabilidad | PASS: spec aclarada, FR-001–017 y SC-001–009 | PASS: matriz inferior, modelo/contratos/guía vinculados; esquema solo mediante migración nueva |
| II. UTC y zona por Event | PASS de alcance: no cambia calendario | PASS: tiempos nuevos de operación en UTC; filtros y helpers existentes se conservan |
| III. Identidad, email y reservas | PASS de alcance: no cambian | PASS: sin cambios a Registration o caducidad de reservas; expiración de subida es técnica y distinta |
| IV. Aforo | PASS de alcance: FR-014 prohíbe cambios | PASS: portada no escribe cupos; continuidad de SC-008 incluida |
| V. Acceso y privacidad | PASS: edición autorizada y sin datos personales nuevos públicos | PASS: propiedad comprobada dos veces, RLS, buckets privados, UUID aleatorios y proxy con visibilidad actual; puerta no gana permisos |
| AGENTS.md | PASS: sin acceso a datos ni instalaciones | PASS: tipos compartidos, camelCase, errores JSON/HTTP propios, servidor por defecto y ubicaciones acordadas; permisos operativos conservados |

**Discrepancias heredadas identificadas**: existen campos snake_case fuera de persistencia y cálculos con zona global de Ecuador en cartelera/registro. No se certifica su conformidad constitucional. La portada conserva esas reglas; cualquier corrección de calendario o reservas requiere su especificación independiente. Los nuevos contratos de portada sí siguen las convenciones.

**Resultado**: sin violaciones nuevas ni excepciones constitucionales. [checklists/ux.md](checklists/ux.md) sigue pendiente de su propietario y no queda aprobada por este plan. No se ejecutan migraciones, instalaciones o pruebas con datos durante planificación.

## Project Structure

### Documentation (this feature)

```text
specs/002-event-cover-images/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── ui.md
└── checklists/
    ├── requirements.md
    └── ux.md
```

`tasks.md` corresponde a la siguiente fase mediante `$speckit-tasks`; no se genera aquí.

### Source Code (repository root)

Archivos existentes a ampliar o nuevos entregables previstos para implementación:

```text
app/
├── page.tsx
├── organizador/
│   ├── page.tsx
│   └── event-cover-editor.tsx
├── eventos/[eventId]/registro/page.tsx
└── api/
    ├── eventos/[eventId]/portada/[imageId]/route.ts
    └── organizador/eventos/[eventId]/portada/
        ├── route.ts
        ├── imagen/[imageId]/route.ts
        └── subidas/
            ├── route.ts
            └── [uploadId]/
                ├── route.ts
                └── confirmar/route.ts
components/
├── event-cover.tsx
└── event-cover-image.tsx
lib/
├── event-covers.ts
├── event-cover-validation.ts
├── event-cover-service.ts
├── public-events.ts
├── events.ts
├── registration.ts
├── api-contracts.ts
└── supabase/storage-admin.ts
scripts/cleanup-event-covers.mjs
supabase/migrations/20261125120000_event_cover_images.sql
tests/
├── event-cover-validation.test.mjs
├── event-cover-state.test.mjs
├── event-cover-api.test.mjs
├── event-cover-cleanup.test.mjs
├── event-covers-rls.sql
├── fixtures/event-covers/
├── fixtures/cover-preview/
└── e2e/
    ├── event-cover-ui.spec.mjs
    └── event-cover-flow.spec.mjs
```

**Structure Decision**: Mantener App Router sin añadir `src/`. Editor exclusivo junto a `/organizador`; marco compartido entre rutas en `components/`. Hoja cliente mínima para `onError`, selección y estado local; las páginas públicas permanecen servidor. Tipos, alternativa textual y constantes únicos en `lib/event-covers.ts`; validación y coordinación en módulos separados. Cliente privilegiado en `lib/supabase/`. Handlers pequeños, sin duplicar reglas por endpoint. El harness de fixtures queda en tests y no consulta datos.

## Phase 0 — Investigación completada

Dos agentes de lectura investigaron integración/Next.js y Storage/validación/permisos. Hallazgos y alternativas consolidados en [research.md](research.md):

1. Versión real y documentación oficial instalada de Next.js 16.4.5.
2. Transporte firmado a staging privado y validación final independiente del cliente.
3. Sharp directo, contenedores animados y decodificación completa de píxeles.
4. Aislamiento de metadatos frente a los grants existentes de `events`.
5. Revisión opaca, finalización idempotente, reconciliación y limpieza después del commit.
6. Proxy de bytes sin caché ni enlaces firmados de descarga para respetar visibilidad actual.
7. Guardados explícitos de evento y portada, geometría uniforme y accesibilidad de los estados.

No quedan incógnitas técnicas sin decisión. Medir recursos y verificar configuración real es validación posterior del entorno, descrita en quickstart.

## Phase 1 — Diseño y contratos completados

### Flujo técnico

El propietario obtiene una intención sobre la revisión actual, transfiere a Storage y solicita confirmación. El servidor reclama la operación, valida el original y genera candidato inmutable. Una transacción breve bloquea Event, revalida propiedad, revisión y claim, cambia referencia y registra éxito. Solo entonces confirma a UI. Descripción y eliminación usan la misma comparación de revisión sin transferir otra imagen.

El proxy público resuelve únicamente el objeto actual de un evento publicado; nunca acepta paths del cliente. Fallos de bytes muestran marcador y no alteran la reserva. Nuevas visitas leen metadatos dinámicos: no añadir `use cache`, ISR o caché compartida; no se requiere invalidación manual con estas rutas dinámicas. El fallo de descarga de una imagen no convierte una lectura de datos de registro en error.

### Flujo del organizador

Portada y demás datos se guardan explícitamente por separado. La creación obtiene ID y conserva la selección local manteniendo el panel abierto si falta guardar portada. Ninguna imagen se asocia o publica implícitamente. El guardado de portada no reinicia campos del formulario. Cancelación local restaura el estado guardado; conflicto conserva selección y pide actualizar. Ante pérdida de respuesta, la confirmación de una subida consulta su operación durable; descripción/eliminación consultan el estado actual sin `uploadId`, conservando borrador y revisión base según [contrato API](contracts/api.md#recuperación-de-patch-y-delete-sin-respuesta). Un estado observado coincidente no se atribuye a la petición perdida; no prometer reversión cuando el commit pudo ocurrir.

La descripción propia se conserva al sustituir salvo edición explícita; quitar portada la borra. El [contrato UI](contracts/ui.md) define labels, ayudas previas, foco, anuncios, mensajes, estados y adaptación, sin inventar límite de texto ni certificación global. Los anchos 375/1440 px de aceptación se complementan con 390/1280 px del sistema. La revisión visual real usará `impeccable` durante implementación.

### Artefactos de fase 1

- [data-model.md](data-model.md): relaciones técnicas, campos, restricciones, RLS, transiciones y mantenimiento.
- [contracts/api.md](contracts/api.md): autorización, requests/responses camelCase, HTTP y bytes públicos/privados.
- [contracts/ui.md](contracts/ui.md): dirección visual, interacción, accesibilidad y recuperación.
- [quickstart.md](quickstart.md): comandos y escenarios futuros; fixtures sin red separados de integración autorizada.

### Trazabilidad

| Requisitos | Diseño y validación prevista |
| --- | --- |
| FR-001–003; SC-007 | Relación uno a uno, revisión y persistencia; reapertura del editor |
| FR-004; SC-006 | Helper de alternativa, texto propio/vacío/espacios/cambio de título |
| FR-005–006; SC-007 | RLS, propiedad y proxy actual; rol ajeno/puerta y borradores |
| FR-007; SC-007 | Estados UI, errores JSON/HTTP, operación durable y reconciliación |
| FR-008–010; SC-001–003 | Marco 16:9 fijo, fallback y medidas con espera de 5 s/fallo |
| FR-011–013; SC-004–005 | Datos fuera de foto, primitivas/tokens, revisión visual y teclado |
| FR-014; SC-008 | Sin escrituras de cupos/registro/entradas; comparación de resultados |
| FR-015; US1 escenarios 6–7 | Contenido real, tamaño, dimensiones y animación; límites exactos |
| FR-016; US2 escenario 7 | Recorte centrado, patrón de marcas y círculo |
| FR-017; SC-009 | Lecturas dinámicas, identificador actual y visitas después del commit |

## Complexity Tracking

Sin excepciones constitucionales. Dos relaciones técnicas y dos buckets aíslan metadatos protegidos, archivos sin validar e intenciones recuperables sin migrar los permisos de edición existentes. Se descartan bucket público, operación solo en memoria y reemplazo destructivo por privacidad o conservación ante fallo. La coordinación y el mantenimiento responden a la ausencia de transacción entre Storage y PostgreSQL.

## Estado de cierre

Fases 0 y 1 completadas; aplicación sin cambios. No existe `.specify/extensions.yml`, por lo que no hay hooks de pre/post plan registrados. La persona revisora conserva la propiedad de las checklists y sus marcadores. Próximo artefacto: `tasks.md`, mediante `$speckit-tasks`.
