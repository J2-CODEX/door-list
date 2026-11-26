---
description: "Tareas para corregir el mensaje de aforo mínimo por tipo de entrada"
---

# Tasks: Mensaje de aforo mínimo por tipo de entrada

**Input**: Documentos de `specs/001-fix-ticket-type-capacity/`.

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contrato](contracts/ticket-type-capacity.md) y [quickstart.md](quickstart.md).

**Tests**: Pruebas focalizadas de los escenarios de aceptación de spec.md, con la estrategia aislada definida en plan.md y quickstart.md. No se añade una suite general ni se requiere TDD para otras funcionalidades. Las pruebas de regresión se escriben antes del cambio correspondiente y se comprueba que detectan el fallo; una prueba de comportamiento conservado puede pasar desde el inicio.

**Organization**: Dos historias de usuario, en orden P1 → P2. Las tareas comunes preparan la corrección; las historias comparten dos archivos de pruebas y no se editan a la vez entre fases.

## Format: `[ID] [P?] [Story] Description`

Los identificadores son consecutivos. `[P]` indica tareas sobre archivos distintos que pueden ejecutarse a la vez una vez satisfechos sus prerrequisitos; no autoriza acceso a bases de datos ni instalaciones. Las etiquetas `[US1]` y `[US2]` corresponden a las historias de spec.md.

## Path Conventions

Las rutas de código son relativas a la raíz del repositorio. Las referencias Markdown son relativas a esta carpeta de feature. Se reutilizan app/, lib/, components/ y tests/; no se inicializa otro proyecto ni se añaden dependencias, endpoints o migraciones.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar el contexto antes de escribir código del framework.

- [X] T001 Verificar las versiones instaladas en `node_modules/next/package.json` y `node_modules/@supabase/supabase-js/package.json`, consultar la documentación oficial local indicada en `specs/001-fix-ticket-type-capacity/research.md` y aplicar `AGENTS.md` y `.agents/skills/door-list-ui/SKILL.md` con sus referencias y ejemplo de formulario; revisar los comandos de `specs/001-fix-ticket-type-capacity/quickstart.md` para mantener todas las comprobaciones iniciales sin DB ni instalación.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Verificar la compatibilidad del contrato de errores con el código disponible. No se necesita infraestructura nueva.

- [X] T002 Contrastar las parejas exactas de error de `specs/001-fix-ticket-type-capacity/contracts/ticket-type-capacity.md` con `supabase/migrations/20261106120000_public_registration.sql` y su renombrado en `supabase/migrations/20261110120000_entity_vocabulary.sql`, y confirmar el export PostgrestError del SDK instalado; registrar cualquier divergencia en `specs/001-fix-ticket-type-capacity/research.md` antes de implementar, sin ejecutar SQL ni modificar las migraciones.

**Checkpoint**: Contrato y permisos de ejecución comprobados; puede empezar US1. Si existe una divergencia real que impida identificar la causa, resolver el diseño antes de continuar; no asumir el estado de la base remota.

## Phase 3: User Story 1 — Comprender el mínimo de aforo permitido (Priority: P1) — MVP

**Goal**: Presentar el mensaje específico del mínimo ocupado y permitir corregir y guardar desde el mismo formulario.

**Independent Test**: Con el escenario de aforo guardado 30 y 20 registros, enviar 19 y recibir el rechazo simulado realista del mínimo: el aviso debe ser exacto, el diálogo seguir abierto y el nombre y 19 mantenerse. Corregir a 20 y recibir éxito debe retirar el error y completar el guardado. Un rechazo diferido tras abrir con información anterior debe producir el mismo resultado. La comprobación aislada valida la UI; el conteo real queda separado según quickstart.md.

### Tests for User Story 1

- [X] T003 [P] [US1] Crear `tests/ticket-type-errors.test.mjs` con node:test para la pareja exacta del mínimo, un caso del máximo que proteja el comportamiento existente y un error desconocido; exigir las salidas propias del contrato y que ninguna salida incluya details, hint ni texto arbitrario del proveedor. La prueba del mínimo debe detectar la ausencia del helper o el mapeo incorrecto previo.
- [X] T004 [P] [US1] Crear `tests/organizer-ticket-type.test.mjs` usando los patrones de TypeScript/VM y hooks simulados de las pruebas existentes, con sesión y transporte completamente sustituidos; invocar el flujo de `app/organizador/page.tsx` para comprobar rechazo del mínimo, conservación del nombre y aforo, diálogo abierto, anuncio accesible y asociación al campo, ausencia de refresh/cierre/éxito en fallo, prevención de envío duplicado durante busy y reintento exitoso. Incluir una promesa diferida para el rechazo tardío y demostrar que la regresión detecta el mensaje incorrecto sin acceder a servicios reales.

### Implementation for User Story 1

- [X] T005 [US1] Crear `lib/ticket-type-errors.ts` con `getTicketTypeSaveError` y la entrada `Pick<PostgrestError, "code" | "message">` reutilizada del SDK; implementar desde este incremento las dos parejas conocidas y el fallback de `specs/001-fix-ticket-type-capacity/contracts/ticket-type-capacity.md`, sin coincidencias parciales, consultas ni exposición de mensajes recibidos. Depende de T003 y T004.
- [X] T006 [US1] Integrar el helper en `saveTicketType` de `app/organizador/page.tsx` y mantener los retornos y valores del formulario al fallar; reutilizar `components/ui/notice.tsx` con role alert y asociar el aviso de aforo al input mediante aria-describedby sin perder su ayuda ni atribuir errores generales al campo. Conservar el guardado autoritativo y los filtros existentes conforme a [data-model.md — TicketType.eventId y Registration.ticketTypeId](data-model.md#entidades-existentes), y preservar la regla de [data-model.md — TicketType.capacity](data-model.md#invariantes-conservadas) sin añadir un conteo preventivo de asistentes. Depende de T005.
- [X] T007 [US1] Ejecutar las pruebas de T003 y T004 para `tests/ticket-type-errors.test.mjs` y `tests/organizer-ticket-type.test.mjs`, corregir únicamente los fallos de este alcance y comprobar que el rechazo tardío y la corrección 19 → 20 cumplen FR-002, FR-003 y FR-007; no presentar estos dobles como prueba de persistencia ni concurrencia transaccional. Depende de T006.

**Checkpoint**: US1 es demostrable de forma aislada y resuelve el error reportado. La rama del máximo conocido ya conserva su texto; US2 amplía la verificación de sus límites y casos negativos.

## Phase 4: User Story 2 — Distinguir el mínimo ocupado del máximo disponible (Priority: P2)

**Goal**: Proteger las reducciones válidas y mantener diferenciados el máximo del evento, el mínimo del tipo y otros fallos.

**Independent Test**: Con evento 100, otro tipo 60 y tipo editado 30, las propuestas 20/25/40 deben poder enviarse y aceptarse cuando el servidor simulado lo permite; 41 debe bloquearse por el máximo local/nativo. Simular máximo desactualizado para verificar también el rechazo del servidor. Comprobar por separado que ni otros tipos ni estados de Ticket añaden una validación nueva en el cliente.

**Dependency**: Reutiliza helper, integración y harness terminados en US1. Sus escenarios se ejecutan por separado; no depende de los resultados de datos de otro escenario ni de una base real.

### Tests for User Story 2

- [X] T008 [P] [US2] Ampliar `tests/ticket-type-errors.test.mjs` con la matriz del máximo, 23514 desconocido, movimiento de tipo con registros, permisos, transporte y mensaje conocido con código distinto; añadir una prueba del SDK real con fetch sustituido que entregue una respuesta PostgREST fallida y compruebe su traducción. La prueba debe fallar ante conexiones inesperadas y jamás usar credenciales reales.
- [X] T009 [P] [US2] Ampliar `tests/organizer-ticket-type.test.mjs` para 20/25/40, máximo 41, máximo desactualizado, tipo con mínimo 5 frente a total 30, cero registros con propuesta 1 y valores vacíos/no enteros/no positivos; comprobar los atributos nativos y la prevalidación local, la llamada de guardado cuando corresponde y el tratamiento de sus respuestas simuladas. Incluir fixture de 15 valid + 4 used + 1 revoked sin introducir un conteo cliente. No recrear el trigger en el doble ni afirmar que estas pruebas validan el conteo SQL.

### Implementation for User Story 2

- [X] T010 [US2] Revisar y, solo si la integración lo alteró, ajustar `app/organizador/page.tsx` para conservar las validaciones, la disponibilidad local y el guardado conforme a [data-model.md — TicketType.capacity](data-model.md#invariantes-conservadas) y [data-model.md — Event.capacity](data-model.md#invariantes-conservadas); preservar el vínculo y el cómputo existentes de [data-model.md — Ticket.registrationId](data-model.md#entidades-existentes) y [data-model.md — Ticket.status](data-model.md#invariantes-conservadas), sin cambios de estados, filtros por estado, relaciones ni SQL. Mantener el máximo conocido y el fallback seguro de `lib/ticket-type-errors.ts`. Depende de T008 y T009.
- [X] T011 [US2] Ejecutar los casos ampliados de `tests/ticket-type-errors.test.mjs` y `tests/organizer-ticket-type.test.mjs` y verificar que cada error termina en su mensaje propio y que los valores válidos siguen el flujo exitoso; revisar las reglas SQL existentes por lectura de `supabase/migrations/20261106120000_public_registration.sql` para mantener separada la evidencia de UI del conteo vigente real. Depende de T010.

**Checkpoint**: Las dos historias pasan las comprobaciones aisladas; el máximo y los fallos desconocidos no se confunden con el mínimo.

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Completar la revisión transversal y registrar con precisión la evidencia disponible.

- [X] T012 Ejecutar las pruebas focalizadas, TypeScript y ESLint con los binarios instalados y comandos de `specs/001-fix-ticket-type-capacity/quickstart.md` sobre `app/organizador/page.tsx`, `lib/ticket-type-errors.ts` y los dos archivos de pruebas nuevos; revisar `git diff --check` y confirmar que no se añadieron consultas, dependencias ni modificaciones SQL. Repetir comprobaciones solo si hay cambios o fallos que lo justifiquen. Depende de T007 y T011.
- [X] T013 Revisar el estado de error de `app/organizador/page.tsx` con datos ficticios y transporte aislado a 390 × 844 y 1280 × 900, teclado, foco, texto largo y movimiento reducido, siguiendo `specs/001-fix-ticket-type-capacity/quickstart.md`; registrar allí la evidencia o, si no existe un harness visual seguro disponible, la revisión visual pendiente, sin abrir una ruta conectada ni crear rutas públicas de demostración. Depende de T012.
- [X] T014 Actualizar `specs/001-fix-ticket-type-capacity/quickstart.md` con resultados separados de pruebas aisladas, tipos/lint y revisión visual, y registrar el estado pendiente de la validación integral de T015. Distinguir «implementación terminada» de «aceptación integral validada»; registrar el conteo y la serialización reales como no verificados mientras no exista evidencia de su ejecución, sin afirmar cumplimiento integral de SC-001–SC-003. Esta tarea documenta resultados y pendientes; no ejecuta operaciones contra una base. Depende de T012 y T013.
- [X] T015 Validar y cerrar la aceptación integral conforme a [spec.md — Criterios de cierre](spec.md#criterios-de-cierre) y `specs/001-fix-ticket-type-capacity/quickstart.md`: tras confirmación explícita y con base aislada autorizada, completar los escenarios definidos y registrar mensajes, aforos persistidos e identidades y relaciones de Registration y Ticket antes/después, incluido el registro adicional anterior al guardado y el reintento. Exigir SC-001–SC-004 y la revisión visual de T013 aprobados, sin fallos ni escenarios pendientes. Mantener esta tarea sin marcar si falta autorización, entorno, ejecución o evidencia; documentar pendientes en T014 no permite cerrarla. No requiere probar transacciones solapadas salvo que se pretenda acreditar esa garantía adicional. Depende de T014.

**Evidencia de cierre T013–T015**: `tests/e2e/ticket-type-capacity.spec.mjs`, seis tests E2E aprobados, 16 escenarios con evidencia de persistencia en `evidence/database-scenarios.json` y capturas móvil/escritorio descritas en quickstart.md. Los archivos de `evidence/` son artefactos locales ignorados por Git. Ejecución autorizada contra Supabase local desechable; sin base remota ni envío de correo.

## Dependencies & Execution Order

### Phase Dependencies

Setup T001 → Foundational T002 → US1 T003–T007 → US2 T008–T011 → Polish T012–T014 → aceptación integral T015.

No se crean modelos, clientes de Supabase ni infraestructura nuevos: se reutilizan los existentes. US2 depende técnicamente de la integración de US1 para evitar duplicarla y editar simultáneamente los mismos archivos.

### Dependency Graph

```text
T001 → T002
          ├→ T003 ─┐
          └→ T004 ─┴→ T005 → T006 → T007 (US1 / MVP)
                                       ├→ T008 ─┐
                                       └→ T009 ─┴→ T010 → T011 (US2)
                                                          ↓
                                                        T012 → T013 → T014 → T015
```

### Parallel Opportunities

T003 y T004 pueden prepararse a la vez tras T002: escriben archivos diferentes sobre el contrato ya fijado. T008 y T009 pueden ampliarse a la vez después de T007 por la misma razón. T005/T006 y T010 se ejecutan secuencialmente respecto a las pruebas que especifican su comportamiento. No hay paralelismo entre las fases de historias porque comparten archivos.

### Parallel Example: User Story 1

```text
Después de T002:
  T003: tests/ticket-type-errors.test.mjs — casos de contrato del mínimo.
  T004: tests/organizer-ticket-type.test.mjs — flujo de rechazo y reintento.
Después de ambas: T005 → T006 → T007.
```

### Parallel Example: User Story 2

```text
Después de T007:
  T008: tests/ticket-type-errors.test.mjs — matriz completa y transporte del SDK.
  T009: tests/organizer-ticket-type.test.mjs — límites y fallos del formulario.
Después de ambas: T010 → T011.
```

## Implementation Strategy

### MVP First (User Story 1 Only)

Completar T001–T007 permite demostrar el mensaje solicitado y la corrección desde el mismo formulario, conservando desde el inicio el mensaje del máximo. Validar ese incremento antes de ampliar los casos de US2. El MVP no acredita por sí solo la ejecución real del trigger ni sustituye las comprobaciones finales que correspondan a una entrega.

### Incremental Delivery

Tras US1, completar US2 para proteger las reducciones válidas y los errores de máximo/desconocidos. Finalizar T012–T014 y comunicar por separado el estado de implementación y de aceptación integral. T015 es el cierre de aceptación: solo se completa con la evidencia exigida; si no puede ejecutarse la validación autorizada, permanece pendiente. Este documento no autoriza despliegues, accesos a bases ni envíos de correo; una ejecución integral debe respetar las confirmaciones y el alcance de quickstart.md.

## Requirement & Data Constraint Coverage

| Requisitos o criterios | Tareas |
| --- | --- |
| FR-001, FR-004, FR-006, FR-009; SC-001–SC-003 | T002, T006, T009–T011: preservar las reglas; T014: registrar evidencia; T015: aceptación con validación real obligatoria para el cierre. |
| FR-002, FR-005, FR-008; SC-001–SC-002 | T003, T005, T008, T010–T012. |
| FR-003, FR-007; SC-003–SC-004 | T004, T006–T007, T009, T012–T015. |

Los campos restringidos se remiten a su definición canónica mediante citas en las tareas de implementación T006 y T010: TicketType.capacity, Event.capacity y Ticket.status; las relaciones TicketType.eventId, Registration.ticketTypeId y Ticket.registrationId también están vinculadas. Se conservan las restricciones existentes, sin duplicar sus valores normativos ni introducir modelos nuevos.

## Notes

Todas las tareas comienzan pendientes. Marcar una tarea al terminar su acción y su criterio, sin confundir el registro de una verificación pendiente con su ejecución. T014 puede completarse documentando que no se ejecutó la validación integral; en ese caso T015 permanece sin marcar y el estado es «aceptación integral pendiente». La implementación puede estar terminada según spec.md sin que la funcionalidad esté completamente validada. Las marcas del checklist de calidad de requisitos son propiedad del revisor y no acreditan implementación. Las discrepancias heredadas señaladas en plan.md siguen fuera de esta corrección.
