# Data Model: Aforo mínimo por tipo de entrada

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Entidades existentes

| Entidad | Campos relevantes, en dominio | Relaciones y significado |
| --- | --- | --- |
| Event | id, capacity | Un Event agrupa varios TicketType y fija el aforo global. |
| TicketType | id, eventId, name, capacity | Pertenece a un Event; recibe Registration y tiene el límite explícito que se edita. |
| Registration | id, eventId, ticketTypeId | Registra a un asistente; cada registro del tipo consume una plaza para esta corrección. |
| Ticket | id, registrationId, status | Entrada individual de un Registration; no suma otra plaza. Estados existentes: valid, used, revoked. |

Estos nombres describen el dominio en camelCase; no introducen nuevos tipos paralelos a los existentes. Las tablas `events`, `ticket_types`, `registrations`, `tickets` y las claves `event_id`, `ticket_type_id`, `registration_id` permanecen en la capa de persistencia. Las convenciones heredadas de `lib/events.ts` no se migran de forma general en este cambio.

## Invariantes conservadas

1. capacity es un entero entre 1 y 2147483647, conforme al formulario actual.
2. Para un TicketType, capacity debe ser al menos el número vigente de Registration de ese tipo.
3. La suma de los aforos asignados a tipos de un Event no supera la capacity del Event.
4. El total de otro tipo no participa en el mínimo del tipo editado.
5. El estado del Ticket asociado no cambia ese cómputo: 15 valid + 4 used + 1 revoked con sus 20 Registration exigen capacity ≥ 20.
6. Un guardado rechazado no altera el TicketType almacenado ni elimina o cambia Registration o Ticket.

No se añaden tablas, columnas, índices, estados, transiciones de entrada ni reglas de liberación de plazas. No se modifican las migraciones existentes ni se requiere una nueva.

## Estado transitorio del formulario

| Momento | Estado y comportamiento |
| --- | --- |
| Apertura | Nombre y aforo actuales; error vacío; edición habilitada si hay plazas asignables. |
| Guardando | busy activo; se evita el envío duplicado; se mantienen los valores. |
| Rechazo conocido | busy termina; mensaje propio de mínimo o máximo; formulario abierto con valores intactos; sin refresh ni confirmación. |
| Fallo desconocido | Mismo mantenimiento de valores y disponibilidad de reintento; texto genérico propio. |
| Reintento válido | Error anterior se limpia al enviar; con éxito se refrescan eventos, se cierra el diálogo y se confirma guardado. |

El total vigente para el mínimo no se añade al estado del formulario. El resultado del guardado representa la validación autoritativa; por eso también se maneja el rechazo producido por un registro que llegó después de abrir la edición.

## Datos compartidos de error

El helper toma una vista de PostgrestError del SDK, limitada a code y message, y devuelve una cadena propia. El contrato exacto y el fallback están definidos en [contracts/ticket-type-capacity.md](contracts/ticket-type-capacity.md). No se persiste el error ni se añaden datos de asistentes a la UI.
