# Implementation Plan: Mensaje de aforo mínimo por tipo de entrada

**Branch**: `main` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

**Feature context**: `001-fix-ticket-type-capacity`. El script setup-plan devuelve este identificador en BRANCH por su resolución de feature; la rama Git comprobada es main. No se creó ni cambió de rama.

**Input**: `specs/001-fix-ticket-type-capacity/spec.md`, revisada con `speckit-clarify` sin ambigüedades críticas.

## Summary

Corregir la presentación del rechazo al guardar un aforo inferior a los asistentes registrados del tipo editado. El bloqueo ya está declarado en las migraciones; el formulario confunde su error con el de exceso del evento porque ambos usan `23514`.

Añadir un helper puro en `lib/ticket-type-errors.ts` que traduzca combinaciones exactas de código y mensaje conocidas a textos propios, e integrarlo en `saveTicketType` de `app/organizador/page.tsx`. Conservar la validación autoritativa del guardado, los valores escritos, el diálogo abierto y el anuncio accesible. No añadir consultas preventivas, endpoints, dependencias ni migraciones para esta corrección.

## Technical Context

**Language/Version**: TypeScript 5.9.3; Node.js v26.10.0 en el entorno inspeccionado.

**Primary Dependencies**: Next.js 16.4.5, React 19.3.1, Supabase JS 2.119.0 y componentes existentes. Versiones comprobadas en los paquetes instalados, no inferidas de los rangos de `package.json`.

**Storage**: PostgreSQL/Supabase existente: `events`, `ticket_types`, `registrations`, `tickets`. Sin cambios de esquema, datos, RLS o funciones SQL.

**Testing**: `node:test` con `assert`, SDK con transporte simulado y harness de componentes siguiendo los patrones existentes; TypeScript y ESLint instalados. Validación integral contra una base aislada necesaria para cerrar la aceptación de SC-001–SC-003, únicamente tras confirmación explícita. Su ejecución puede quedar pendiente; las pruebas aisladas no la reemplazan.

**Target Platform**: Aplicación web App Router; formulario de organizador en navegador, revisión responsive a 390 × 844 y 1280 × 900.

**Project Type**: Aplicación web Next.js existente.

**Performance Goals**: Clasificación local con dos comparaciones de patrones conocidos y cero solicitudes adicionales por guardado; mantener el flujo pendiente actual. No se introduce un nuevo objetivo de latencia del backend.

**Constraints**: UI en español; identificadores en inglés; no exponer texto crudo del proveedor; mantener Server Components por defecto. La página afectada ya requiere cliente por sesión, estado y eventos. Consultar la documentación instalada antes de implementar. No instalar dependencias ni acceder a bases de datos sin confirmación explícita, incluso en lectura.

**Scale/Scope**: Una ruta de organizador, un helper y pruebas focalizadas. El conteo vigente sigue en el trigger existente, no se descarga la colección de asistentes al navegador. Sin cambios de escala o infraestructura.

## Constitution Check

Evaluación antes de investigación y repetida después del diseño:

| Principio o restricción | Antes | Después | Evidencia y decisión |
| --- | --- | --- | --- |
| I. Especificación y trazabilidad | PASS | PASS | FR-001–FR-009 y SC-001–SC-004 definidos antes de implementar; correspondencia abajo. |
| II. Calendario | PASS por alcance | PASS por alcance | No se alteran fechas, zonas ni ventanas. Las convenciones temporales heredadas del registro público quedan fuera de esta corrección. |
| III. Identidad y cantidad | PASS por alcance | PASS por alcance | No se cambian identidad, unicidad por email, reservas ni verificación; no se crean estados temporales. |
| IV. Aforo explícito | PASS | PASS | Se conserva el aforo explícitamente editado por tipo y el límite global existente. Mínimo 19/20, igualdad, máximo 40/41 y tipo 5 frente a total 30 están especificados. |
| IV. Consumo por estado | PASS | PASS | FR-009 mantiene una plaza por Registration, incluso con Ticket usado o revocado; la revocación sola no libera plaza. |
| V. Acceso y privacidad | PASS por alcance | PASS por alcance | Se conservan sesión, filtros por evento, RLS y permisos existentes; no hay cambios en puerta, exportaciones ni enlaces públicos. |
| Convenciones de AGENTS.md y UI | PASS | PASS | Helper en lib/, UI canónica, sin nuevas rutas ni contratos HTTP. Sin ejecución contra DB o instalación. |

No se requieren excepciones constitucionales. Este gate evalúa el cambio propuesto, no certifica el cumplimiento global del producto. En el código heredado revisado, el registro público usa una zona horaria constante y no modela la caducidad de reservas sin verificar; son discrepancias pendientes frente a II/III, documentadas aquí para seguimiento separado. No se corrigen ni se introducen excepciones para ellas en esta funcionalidad. Esta planificación no inspeccionó todos los flujos de acceso y privacidad.

### Trazabilidad del diseño y validación

| Requisitos | Diseño | Evidencia prevista |
| --- | --- | --- |
| FR-001, FR-004, FR-006, FR-009; SC-001–SC-003 | Conservar trigger y conteo por tipo; sin consultas nuevas | Revisión SQL existente; escenarios integrales numéricos de quickstart para validar ejecución real con autorización. |
| FR-002, FR-005, FR-008; SC-001–SC-002 | Clasificador cerrado de code + message; fallback seguro | Pruebas del helper y de respuesta PostgREST simulada, incluyendo 23514 desconocido y código distinto. |
| FR-003, FR-007; SC-003–SC-004 | Retorno anticipado en error; conservar estado y Notice accesible; éxito limpia error | Pruebas de flujo con promesas diferidas; revisión del diálogo, teclado y tamaños con datos ficticios. |

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-ticket-type-capacity/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/ticket-type-capacity.md
└── quickstart.md
```

`tasks.md` será la salida posterior de `speckit-tasks`; no se genera en esta fase.

### Source Code (repository root)

```text
app/organizador/page.tsx               # Integrar traducción del rechazo y mantener formulario
lib/ticket-type-errors.ts              # Nuevo helper puro de clasificación y mensajes propios
components/ui/notice.tsx               # Reutilizar sin modificar
lib/supabase/browser.ts                # Reutilizar sin modificar
supabase/migrations/                   # Evidencia del comportamiento existente; sin ediciones
tests/ticket-type-errors.test.mjs       # Nuevo: clasificación y transporte simulado
tests/organizer-ticket-type.test.mjs    # Nuevo: flujo del formulario con dobles
tests/e2e/ticket-type-capacity.spec.mjs # Aceptación autorizada, solo Supabase local aislado
```

**Structure Decision**: Mantener App Router y el componente de ruta actual; no extraer una UI compartida ni refactorizar la página completa. El helper es lógica pura de dominio en lib/ y reutiliza tipos del SDK. Las pruebas nuevas no necesitan otra librería ni un servidor real.

## Phase 0 — Research

Completada en [research.md](research.md): causas exactas del error, estructura real de PostgrestError, documentación de Next.js instalada, patrones de pruebas y alternativas. Sin incógnitas técnicas pendientes.

## Phase 1 — Design & Contracts

- [data-model.md](data-model.md): entidades existentes, invariantes y estado del formulario; sin cambios de persistencia.
- [contracts/ticket-type-capacity.md](contracts/ticket-type-capacity.md): interfaz del helper, tabla de traducción y comportamiento observable.
- [quickstart.md](quickstart.md): validación aislada ejecutable tras implementar y comprobación integral sujeta a autorización.

El guardado del SDK es la fuente de la causa vigente, incluso ante nuevos registros durante la edición. La prevalidación local del máximo se conserva; no se usa un conteo antiguo de la UI para decidir el mínimo. Las pruebas simuladas no demuestran exclusión mutua ni integridad transaccional de PostgreSQL.

## Cierre y evidencia

Aplicar los [criterios de cierre de spec.md](spec.md#criterios-de-cierre): separar «implementación terminada» de «aceptación integral validada». Registrar en [quickstart.md](quickstart.md#evidencia-a-entregar) el estado de cada comprobación, su resultado y la evidencia antes/después por escenario. La revisión SQL acredita el diseño versionado; no acredita su ejecución en una base.

La tarea de registro de evidencia puede terminar documentando pendientes. La tarea de aceptación integral permanece abierta hasta que los escenarios contra la base autorizada y la revisión de interfaz pasen. Sin autorización o entorno disponible, comunicar «aceptación integral pendiente» y los SC afectados; no declarar la funcionalidad completamente validada ni solicitar accesos durante la preparación documental.

## Complexity Tracking

Sin violaciones del cambio propuesto ni complejidad adicional que justificar. Se acepta el acoplamiento acotado a mensajes de excepciones versionados; un cambio futuro de esos mensajes debe revisar el clasificador y sus pruebas. Un mensaje no reconocido produce el fallback seguro.
