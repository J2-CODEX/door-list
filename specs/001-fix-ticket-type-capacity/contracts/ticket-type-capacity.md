# Contract: Guardado de aforo y mensajes del organizador

**Scope**: Edición y guardado de TicketType en `/organizador`. Este documento no crea endpoints ni modifica contratos de API existentes.

## Adaptador de errores

Ubicación prevista: `lib/ticket-type-errors.ts`.

Interfaz prevista: `getTicketTypeSaveError(error: Pick<PostgrestError, "code" | "message">): string`, reutilizando PostgrestError del SDK instalado. Los consumidores solo llaman al helper cuando hay error; el resultado exitoso sigue el flujo existente.

La comparación exige la pareja exacta, sin búsquedas parciales ni inferencias basadas únicamente en el código. details/hint no se usan para decidir ni para renderizar.

| code | message recibido, valor exacto | Texto propio devuelto |
| --- | --- | --- |
| 23514 | El aforo no puede ser menor que los registros existentes | El aforo no puede ser inferior al número de asistentes ya registrados en este tipo de entrada. |
| 23514 | La suma de aforos de las entradas supera el límite del evento | El aforo supera el disponible para este evento. Revisa los datos. |
| Cualquier otra pareja | Incluido 23514 desconocido, movimiento de tipo con registros, permisos o red | No pudimos guardar el tipo de entrada. Inténtalo de nuevo. |

El texto recibido se utiliza exclusivamente como discriminador de compatibilidad. Nunca se concatena, reenvía ni muestra; todos los resultados pertenecen al catálogo propio. Si un código distinto contiene exactamente el mensaje del mínimo, también devuelve fallback.

## Validación local conservada

- Valor inválido o nombre vacío: «Indica un nombre y un aforo válido.».
- Máximo excedido según la información local: «El aforo disponible para este tipo es {availableCapacity}.», donde availableCapacity es capacity del evento menos los aforos de los demás tipos.
- La validación autoritativa posterior puede rechazar un valor aparentemente válido según la información local. Se utiliza el error recibido de ese guardado, no una deducción basada en datos anteriores.
- Las validaciones HTML actuales required/min/max/step siguen activas. Un máximo bloqueado por validación nativa no necesita llegar a Supabase; el mensaje del servidor cubre el rechazo real, por ejemplo si cambió otro aforo después de abrir la edición.

## Flujo observable

1. El organizador edita nombre/aforo y solicita guardar.
2. Si falla validación local, ve el error correspondiente y conserva valores.
3. Durante el guardado se mantienen valores y controles pendientes; no se envía dos veces.
4. Si el SDK devuelve error, se traduce con el helper y se anuncia mediante Notice con role alert. El diálogo permanece abierto y no se ejecutan refresh, cierre ni confirmación de éxito.
5. En errores de aforo, el campo Aforo debe quedar asociado al aviso mediante aria-describedby, conservando su ayuda. Los errores generales no se atribuyen incorrectamente a un campo concreto.
6. Al corregir y reintentar se limpia el error anterior; un resultado exitoso refresca eventos, cierra y muestra «Tipo de entrada guardado.».

Se mantiene la sesión y la operación Supabase actual, con filtros por id del tipo y event_id del evento en actualización. Los nombres snake_case del payload pertenecen exclusivamente al adaptador de persistencia; no se añade un contrato HTTP de aplicación. El SDK interpreta su propia respuesta de PostgREST; no se introduce un fetch manual al que aplicar response.ok.

## Compatibilidad

El contrato depende de las excepciones versionadas en `supabase/migrations/20261106120000_public_registration.sql` y su renombrado en `20261110120000_entity_vocabulary.sql`. Una evolución de esos textos o códigos requiere revisar este adaptador. Un error desconocido usa siempre fallback. No se afirma que el proyecto remoto tenga esas migraciones aplicadas hasta realizar una validación autorizada.
