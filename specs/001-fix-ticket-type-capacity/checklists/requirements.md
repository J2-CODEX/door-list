# Specification Quality Checklist: Mensaje de aforo mínimo por tipo de entrada

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-23
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Revisión de calidad completada: 16/16 criterios satisfechos; no se identificaron ambigüedades bloqueantes para esta corrección.
- «El aforo no puede ser inferior al número de asistentes ya registrados en este tipo de entrada.» fija el texto esperado (FR-002).
- Los casos 19/20/25/40/41 verifican mínimo, igualdad, reducción válida y máximo; el caso de 5 frente a 30 distingue el total por tipo del total del evento.
- FR-009 explicita el cómputo conservado; el caso de entradas válidas, usadas y revocadas lo verifica con cantidades. Los supuestos delimitan los cambios en liberación de plazas como un alcance separado.
- Trazabilidad de la revisión estática: `app/organizador/page.tsx`, función `saveTicketType`, transforma el error compartido `23514` en el mensaje de exceso; `supabase/migrations/20261106120000_public_registration.sql` declara el bloqueo por registros y el de exceso con ese mismo código; `supabase/migrations/20261110120000_entity_vocabulary.sql` renombra la función sin cambiar esa validación.
- No se consultó ninguna base de datos ni se ejecutaron pruebas de producto. Las marcas validan la calidad de los requisitos, no la implementación ni el despliegue.
- No se generaron `plan.md` ni `tasks.md`. Puede ejecutarse `$speckit-clarify` para revisar los supuestos antes de autorizar la planificación.
