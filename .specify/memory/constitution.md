<!--
Sync Impact Report — temporal; retirar antes de hacer commit de la constitución.
- Cambio de versión: plantilla sin versión adoptada → 1.0.0.
- Motivo: primera adopción de los principios no negociables de Door List.
- Principios establecidos (los cinco espacios de la plantilla no tenían contenido adoptado):
  I. Método: especificación y trazabilidad.
  II. Calendario: UTC y zona horaria por evento.
  III. Identidad y cantidad: asistente, email y caducidad.
  IV. Aforo: límites explícitos y verificables.
  V. Acceso: privacidad, permisos y auditoría.
- Secciones concretadas: Alcance y contratos; Revisión de cumplimiento; Governance.
- Secciones eliminadas: ninguna; se sustituyeron los ejemplos y marcadores de la plantilla.
- TODOs pendientes: ninguno.
- No se modificaron plantillas, comandos ni código de la aplicación.
-->

# Door List Constitution

## Core Principles

### I. Método: especificación y trazabilidad

- Toda funcionalidad nueva o cambio de comportamiento DEBE partir de una especificación en
  `specs/` antes de implementarse; un prompt aislado no autoriza cambios de producto.
- Toda regla de negocio presente en código, triggers o funciones SQL DEBE estar también
  explicada en una especificación en `specs/`; su implementación no sustituye su definición.
- Todo cambio de esquema DEBE definirse en una migración nueva y versionada dentro de
  `supabase/migrations/`; las migraciones ya aplicadas NO DEBEN reescribirse.

Estas reglas hacen revisables las decisiones de producto y conservan el historial del esquema.

### II. Calendario: UTC y zona horaria por evento

- Toda fecha que represente un instante DEBE persistirse en UTC y cada `Event` DEBE guardar
  su propia zona horaria.
- La presentación de fechas, la apertura y el cierre del registro y la autorización del ingreso
  DEBEN calcularse con la zona horaria del evento; NO DEBEN usar una zona constante global.
- El cierre del registro y la ventana de ingreso DEBEN ser campos explícitos del evento;
  NO DEBEN deducirse de «el día del evento».
- La especificación DEBE definir los límites temporales y si sus extremos son inclusivos o
  exclusivos, para poder verificar cuándo se permite cada operación.

La zona horaria y las ventanas explícitas evitan que una convención del servidor decida cuándo
puede registrarse o ingresar un asistente.

### III. Identidad y cantidad: asistente, email y caducidad

- Cada `Ticket` DEBE identificar a un asistente.
- La cantidad de entradas que puede reservar un email DEBE decidirse en la especificación;
  NO DEBE quedar definida únicamente por un índice único ni por otra restricción de persistencia.
- Una reserva asociada a un email sin verificar DEBE caducar y liberar el cupo que ocupa.
- La especificación DEBE fijar el plazo de caducidad y los criterios verificables de
  confirmación y liberación de cupo.

La identidad del asistente, el email de contacto y la cantidad reservable son decisiones distintas;
una reserva sin verificar no puede retener aforo indefinidamente.

### IV. Aforo: límites explícitos y verificables

- Toda regla de aforo DEBE tener al menos un criterio de aceptación con cantidades numéricas
  y un resultado esperado; «hay disponibilidad» no basta como criterio.
- El aforo del `Event` DEBE ser el límite global de consumo entre todos sus tipos de entrada.
- Un cupo por `TicketType` solo DEBE aplicarse como límite estricto si el organizador lo
  declara explícitamente; la existencia de un valor por tipo no implica por sí sola esa decisión.
- Ningún límite de aforo, global o por tipo, PUEDE reducirse por debajo de lo ya consumido
  dentro de su alcance.
- Un evento NO DEBE publicarse sin al menos un tipo de entrada con cupo disponible.
- La especificación DEBE definir qué estados de reserva y entrada consumen cupo y cuándo lo
  liberan, respetando la caducidad de reservas sin verificar.

Los criterios numéricos permiten comprobar la disponibilidad, el agotamiento y la reducción de
límites sin depender de interpretaciones implícitas del modelo de datos.

### V. Acceso: privacidad, permisos y auditoría

- Todo identificador que viaje en un QR o en una URL pública DEBE ser imposible de adivinar
  o enumerar en términos prácticos; NO DEBE permitir obtener otros identificadores por secuencia.
- Las vistas públicas accesibles mediante esos identificadores NO DEBEN mostrar el nombre
  ni el email del asistente.
- Operar la puerta DEBE ser un rol asignado por evento, con permisos separados de editar
  el evento y exportar datos; el rol de puerta no concede por sí solo esos permisos.
- Una entrada revocada DEBE conservarse con su estado en la base de datos y en la exportación
  de auditoría, y DEBE excluirse de la lista operativa de puerta.

La posesión de un enlace público no concede acceso a datos personales; la operación de puerta
y la trazabilidad histórica requieren permisos y vistas con propósitos distintos.

## Alcance y contratos

Esta constitución establece reglas de producto y método para Door List. Las especificaciones
DEBEN concretar sus parámetros y casos de aceptación sin contradecir estos principios.

`Event`, `TicketType`, `Ticket` y `Registration` son entidades distintas y DEBEN conservar sus
nombres y responsabilidades; NO DEBEN usarse como sinónimos. Las convenciones técnicas de
`AGENTS.md` complementan esta constitución.

Los valores no fijados aquí, como la cantidad reservable por email, el plazo de caducidad y los
extremos de las ventanas temporales, DEBEN resolverse en la especificación correspondiente;
NO DEBEN introducirse como decisiones de producto ocultas en código o persistencia.

## Revisión de cumplimiento

- Antes de implementar una funcionalidad o un cambio de comportamiento, la revisión DEBE
  identificar su especificación en `specs/` y comprobar su compatibilidad con estos principios.
- El plan y las tareas DEBEN vincular las reglas afectadas con su implementación y validación;
  toda regla de aforo DEBE incluir un criterio de aceptación numérico.
- La revisión de cambios DEBE comprobar la trazabilidad de reglas de negocio, las migraciones
  nuevas y los criterios temporales, de identidad, aforo y acceso que resulten afectados.
- Si el comportamiento existente contradice la constitución, la discrepancia DEBE registrarse
  en una especificación antes de corregirlo; la adopción de esta constitución no acredita que
  el código actual ya la cumpla ni autoriza cambios de producto sin especificación.
- Un cambio que contradiga un principio NO DEBE aprobarse como conforme; requiere corregir
  la propuesta o aprobar primero una enmienda explícita a la constitución.

## Governance

Esta constitución es la referencia normativa de producto y método del repositorio. Ante una
contradicción, las especificaciones y los cambios propuestos DEBEN ajustarse a ella o tramitar
una enmienda antes de implementarse.

Toda enmienda DEBE describir el motivo, los principios afectados, el impacto sobre las
especificaciones y el comportamiento existente y, cuando corresponda, el plan de transición.
DEBE ser revisada y aprobada explícitamente por el responsable del proyecto antes de aplicarse.
Actualizar la constitución no sustituye las especificaciones ni las migraciones requeridas.

La versión DEBE seguir versionado semántico: MAJOR para eliminaciones o redefiniciones
incompatibles de principios; MINOR para principios o secciones nuevos o ampliaciones materiales;
PATCH para aclaraciones y correcciones sin cambio semántico. La fecha de ratificación original
DEBE conservarse y la fecha de última enmienda DEBE actualizarse con cada modificación.

Toda revisión de especificaciones, planes e implementación DEBE comprobar los principios
aplicables y documentar cualquier incumplimiento pendiente. No se admiten excepciones implícitas
basadas en el comportamiento previo del código.

**Version**: 1.0.0 | **Ratified**: 2026-11-23 | **Last Amended**: 2026-11-23
