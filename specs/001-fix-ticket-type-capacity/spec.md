# Feature Specification: Mensaje de aforo mínimo por tipo de entrada

**Feature Branch**: `main` (rama actual; no se creó una rama para esta especificación)

**Created**: 2026-11-23

**Status**: Draft

**Input**: User description: "Al bajar el aforo de un tipo de entrada a un valor menor al total de asistentes registrados para esa localidad aparece ‘El aforo supera el disponible para este evento. Revisa los datos’. El mensaje debe indicar que no es posible ingresar un valor inferior al número de asistentes ya registrados. Verificar esa regla y no escribir todavía el plan; resolver ambigüedades con clarify si fuera necesario."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Comprender el mínimo de aforo permitido (Priority: P1)

Como organizador que edita el aforo de un tipo de entrada, quiero saber que el valor propuesto es inferior al número de asistentes ya registrados en ese tipo, para corregirlo sin confundir el mínimo ocupado con el máximo disponible del evento.

**Why this priority**: Corrige el error reportado y protege las plazas de los asistentes existentes.

**Independent Test**: Con un tipo de aforo 30 y 20 asistentes registrados, intentar guardar 19 y comprobar el rechazo, el mensaje específico y la conservación de los datos guardados.

**Acceptance Scenarios**:

1. **Given** un evento de aforo 100 y un tipo de entrada de aforo 30 con 20 asistentes registrados, **When** se intenta guardar un aforo de 19 para ese tipo, **Then** se rechaza el cambio y se muestra «El aforo no puede ser inferior al número de asistentes ya registrados en este tipo de entrada.», sin mostrar el mensaje de exceso del aforo del evento; el aforo guardado sigue siendo 30 y se conservan los 20 registros y sus entradas.
2. **Given** el rechazo anterior, **When** el organizador revisa el formulario, **Then** permanece abierto con el nombre y el aforo 19 introducidos, el error se anuncia de forma accesible y no se muestra una confirmación de guardado.
3. **Given** ese tipo con 20 registrados y sin otras restricciones incumplidas, **When** se corrige el aforo a 20 y se vuelve a guardar, **Then** se acepta el cambio, desaparece el error y se confirma el guardado sin reabrir el formulario ni reintroducir el nombre.
4. **Given** un tipo con 20 registrados al abrir la edición y aforo guardado de 30, **When** se registra una persona adicional antes de guardar un aforo de 20, **Then** se rechaza con el mismo mensaje específico, se mantiene el aforo guardado de 30 y se conservan los 21 registros.

---

### User Story 2 - Distinguir el mínimo ocupado del máximo disponible (Priority: P2)

Como organizador, quiero guardar aforos válidos y recibir un mensaje de disponibilidad cuando excedo el límite del evento.

**Why this priority**: Evita que la corrección altere la validación del máximo o impida reducciones válidas.

**Independent Test**: En un evento de aforo 100, con 60 plazas asignadas a otro tipo y un tipo de aforo 30 con 20 registrados, comprobar por separado los valores 20, 25, 40 y 41.

**Acceptance Scenarios**:

1. **Given** el evento y los tipos descritos, **When** se guarda un aforo de 20, 25 o 40 en el tipo editado, **Then** cada cambio es válido y conserva los 20 registros y sus entradas.
2. **Given** el mismo evento con 60 plazas asignadas al otro tipo, **When** se intenta guardar 41 en el tipo editado, **Then** se rechaza porque solo hay 40 plazas asignables a ese tipo y el mensaje explica el límite disponible del evento, sin atribuirlo al mínimo de asistentes registrados.
3. **Given** dos tipos con 5 y 25 registrados respectivamente, aforos de 10 y 40 y un evento de aforo 100, **When** se reduce el primer tipo a 5, **Then** se acepta: su mínimo es 5 y no el total de 30 asistentes del evento.
4. **Given** un tipo de aforo 10 sin registrados y un evento con aforo suficiente, **When** se reduce su aforo a 1, **Then** se acepta sin un error de asistentes existentes.

### Edge Cases

- Con 20 registrados, el aforo 20 es válido si respeta las demás restricciones.
- Un valor vacío, no entero, negativo o cero mantiene el error de aforo inválido; con cero registrados el mínimo permitido sigue siendo 1.
- Los asistentes de otros tipos no elevan el mínimo del tipo editado; sus aforos asignados sí condicionan el máximo disponible del evento.
- Un nuevo registro durante la edición se tiene en cuenta al guardar, aunque el formulario tenga información anterior.
- Un fallo ajeno a aforo muestra un mensaje propio de fallo de guardado y conserva lo escrito; no se presenta como un error de mínimo o máximo sin causa identificada.
- Con 20 registros cuyos Tickets se distribuyen en 15 válidos, 4 usados y 1 revocado, el cómputo conservado es 20: guardar 19 se rechaza y guardar 20 se acepta si hay aforo global suficiente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE impedir guardar un aforo inferior al número de asistentes registrados que consumen plaza en el `TicketType` editado, considerando el total vigente al guardar.
- **FR-002**: Ante ese rechazo, el sistema DEBE mostrar exactamente «El aforo no puede ser inferior al número de asistentes ya registrados en este tipo de entrada.» y NO DEBE mostrar el mensaje de exceso del aforo disponible del evento.
- **FR-003**: Un rechazo DEBE mantener el aforo guardado y todos los `Registration` y `Ticket` existentes; el formulario DEBE conservar los valores introducidos y permitir corregirlos sin reabrirlo.
- **FR-004**: El sistema DEBE permitir un aforo igual o superior al total registrado del tipo cuando también se cumplen la validez del valor y el límite disponible del evento.
- **FR-005**: El sistema DEBE distinguir el rechazo por mínimo ocupado del rechazo por superar el aforo disponible del evento. Para el segundo, el mensaje DEBE explicar la disponibilidad del evento para el tipo editado.
- **FR-006**: El mínimo ocupado DEBE calcularse únicamente con los `Registration` del tipo editado, sin sumar los de otros tipos del mismo `Event` y sin contar un `Registration` dos veces por tener un `Ticket` asociado.
- **FR-007**: El error DEBE presentarse en español, anunciarse de forma accesible y permanecer visible mientras el guardado esté rechazado; un guardado posterior exitoso DEBE retirar el error y confirmar el resultado.
- **FR-008**: Los errores ajenos a aforo DEBEN conservar un mensaje propio de fallo de guardado, sin exponer mensajes internos ni clasificarse como errores de mínimo o máximo sin una causa identificada.
- **FR-009**: Para esta corrección, cada `Registration` existente del tipo representa una plaza consumida; el estado `valid`, `used` o `revoked` del `Ticket` asociado no elimina por sí mismo ese registro del cómputo. No se introducen reservas temporales, nuevos estados ni nuevas reglas de liberación de plazas.

### Key Entities *(include if feature involves data)*

- **Event**: Evento que establece el aforo global y agrupa los tipos de entrada.
- **TicketType**: Tipo de entrada o localidad cuyo aforo explícito edita el organizador y al que se aplica el mínimo ocupado.
- **Registration**: Registro de un asistente en un evento y un tipo de entrada; constituye la unidad del cómputo para esta corrección.
- **Ticket**: Entrada individual asociada al registro; no es un tipo de entrada ni una unidad adicional de ocupación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los intentos de reducir un tipo por debajo de sus registrados en los escenarios definidos se rechazan con el mensaje específico, incluidos los registros incorporados durante la edición.
- **SC-002**: El 100 % de los escenarios de igualdad, reducción válida y máximo disponible se resuelven conforme a los valores numéricos definidos; los rechazos por superar el máximo se distinguen de los del mínimo.
- **SC-003**: En todos los intentos rechazados se conservan el 100 % de los registros y entradas, el aforo previamente guardado y los valores introducidos en el formulario.
- **SC-004**: El organizador puede corregir 19 a 20 y completar el guardado desde el mismo formulario, sin reabrirlo ni volver a introducir el nombre del tipo.

### Criterios de cierre

- **Implementación terminada**: El cambio de producto y sus pruebas aisladas están implementados; las pruebas focalizadas, TypeScript y ESLint pasan. Este estado acredita la traducción de errores y el flujo simulado, pero no el cumplimiento integral de SC-001–SC-003.
- **Aceptación integral validada**: Los escenarios definidos pasan contra una base aislada autorizada, con evidencia del mensaje y del aforo persistido, los Registration y los Ticket antes y después de cada operación; se comprueban también el reintento de SC-004 y la revisión de interfaz prevista en quickstart.md. Las identidades y relaciones conservadas deben verificarse, no solo sus cantidades.
- Si falta autorización, entorno o evidencia, la aceptación integral permanece pendiente y la funcionalidad no se declara completamente validada. Documentar ese pendiente no equivale a cumplir el criterio ni a completar la tarea de aceptación. No se accede a la base para resolverlo sin confirmación explícita.
- El registro adicional completado antes del guardado forma parte de SC-001. Las pruebas de transacciones solapadas solo permiten afirmar garantías adicionales de serialización si se ejecutan; no sustituyen los escenarios definidos ni se deducen de dobles o clics manuales.

## Assumptions

- «Localidad» se interpreta como el `TicketType` editado y «asistentes registrados» como sus `Registration`, no como los asistentes totales del evento ni solo los que hicieron check-in.
- El aforo que el organizador configura explícitamente en el tipo sigue actuando como límite de plazas; se conserva la restricción existente de que los aforos asignados no superen el aforo global.
- Se conserva el cómputo actual de registros existentes, incluso si su entrada está usada o revocada. Revisar si una revocación debe liberar plazas sería un cambio de negocio separado que requiere especificación propia.
- La dependencia funcional es disponer del total vigente de registrados del tipo al guardar. El total observado al abrir el formulario puede haber quedado desactualizado.
- El alcance es el rechazo y su comunicación al editar el aforo de un tipo. No modifica la edición del aforo global, el registro público, las reservas, la verificación de email ni la cancelación o revocación de entradas.
- La revisión de esta especificación se limita a los archivos del repositorio. No acredita el estado desplegado ni una prueba contra datos reales.
- La revisión identificó que el bloqueo por registros existentes está declarado y que el formulario agrupa ese rechazo con el de exceso de aforo del evento. La implementación y su validación de ejecución quedan pendientes de fases posteriores.
- Esta entrega incluye exclusivamente especificación y revisión de calidad. No incluye plan, tareas ni cambios de producto.
