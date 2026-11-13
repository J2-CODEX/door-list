# Door List

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Los usuarios principales son los organizadores que crean y gestionan eventos.
El público secundario son los asistentes que descubren eventos y se registran.
Esta prioridad fue confirmada por el usuario durante la inicialización.

## Product Purpose

Hacer que la creación de eventos por parte de los organizadores y la experiencia
de registro de los asistentes sean satisfactorias. La experiencia de ambos
públicos forma parte del propósito del producto, con prioridad para el organizador.

## Operating Context

El repositorio implementa un flujo web con gestión de eventos para organizadores,
descubrimiento público de eventos y registro de asistentes. El registro confirmado
permite consultar una entrada con QR y contempla el envío de una confirmación por
correo. Estas capacidades describen la implementación existente; no constituyen
una hoja de ruta ni una verificación del despliegue.

## Capabilities and Constraints

Las convenciones obligatorias del proyecto están en `AGENTS.md`:

- Mantener distintas las entidades Event (evento), TicketType (tipo de entrada),
  Ticket (entrada emitida) y Registration (registro de un asistente).
- Escribir la interfaz y los segmentos estáticos de las rutas públicas en español;
  escribir el código, los identificadores y los tipos en inglés.
- Mostrar errores propios y comprensibles, sin exponer mensajes crudos del proveedor.
- Aplicar RLS a las tablas expuestas y realizar cambios de esquema con migraciones
  versionadas. Acceder a una base de datos o instalar dependencias requiere
  confirmación explícita.

La implementación actual gestiona borradores y publicación, cupos por evento y
tipo de entrada, registros y consulta de asistentes. Los estados de las entradas
incluyen válida, utilizada y revocada; tener estos estados no implica que exista
un flujo de check-in o una interfaz de revocación.

Decisiones abiertas: diferenciación frente a otros productos, tipos de eventos
prioritarios, métricas concretas de satisfacción y requisitos específicos de
accesibilidad. No se definieron durante esta inicialización.

## Brand Commitments

El nombre existente del producto es Door List. La interfaz está en español.
Las reglas para trabajar sobre la identidad existente se mantienen en
`.agents/skills/door-list-ui/SKILL.md` y sus referencias.

## Evidence on Hand

- `app/`: implementación de portada, acceso de organizadores, dashboard, registro
  público y consulta de entradas.
- `lib/`: contratos, lógica de eventos y registro, entradas, fechas y correo.
- `README.md`: documentación funcional y de configuración. Su afirmación de que la
  portada usa datos de ejemplo está desactualizada frente a `app/page.tsx`, que
  consulta eventos publicados.
- `tests/` y `supabase/migrations/`: comprobaciones y reglas de persistencia del
  repositorio; su presencia no acredita ejecución ni aplicación en producción.

No se aportaron testimonios, cifras de adopción ni resultados medidos de
satisfacción durante esta inicialización. No inventar estas evidencias.

## Product Principles

1. Priorizar las necesidades del organizador al decidir sobre la gestión de eventos.
2. Considerar la satisfacción al crear un evento como criterio de éxito del producto.
3. Considerar la satisfacción al descubrir un evento y registrarse como parte del
   mismo criterio de éxito.
