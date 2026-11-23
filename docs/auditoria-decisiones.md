# Auditoría de decisiones de producto implícitas

Fecha: 23 de noviembre de 2026.

Esta revisión identifica políticas de producto que el código ya ejecuta y cuyos supuestos o alternativas no encontré resueltos explícitamente en la documentación revisada. No clasifica comportamientos como bugs ni propone implementarlos de otra manera automáticamente.

La evidencia permite describir qué hace el proyecto; no permite saber qué se conversó fuera del repositorio. Por eso, «supuesto implícito» es una interpretación para validar con producto, no una atribución de intención a quien escribió el código. Una alternativa razonable tampoco implica que sea la preferible: puede tener costes que hoy no convengan.

## Alcance y criterio

Revisión estática de las rutas de descubrimiento, gestión, registro, entrada, correo, control de puerta y exportación; sus módulos en `lib/`; y las migraciones versionadas. Se contrastaron `PRODUCT.md`, `README.md`, `DESIGN.md`, las auditorías anteriores, `docs/scan.md`, `docs/qr-recommendations.md` y la guía `door-list-ui`.

`PRODUCT.md` confirma expresamente la prioridad del organizador y el propósito de satisfacer a ambos públicos. No se presentan como descubrimientos. Tampoco se vuelven a enumerar como implícitas reglas ya declaradas en el README o la documentación de puerta: un registro por email y evento, cierre al terminar el día en Ecuador, acceso a la entrada mediante código privado, un ingreso por entrada, confirmación del ingreso en el servidor y conservación del registro aunque falle el correo. Sí se analizan consecuencias de combinar algunas de esas reglas cuando la elección de producto resultante no está explicitada.

Se tomó el código actual como evidencia de comportamiento. Por ejemplo, `PRODUCT.md` ya advierte que las menciones del README a una portada con datos de ejemplo están desactualizadas. Leer migraciones no acredita que estén aplicadas en el despliegue. No se accedió a bases de datos ni servicios externos.

## Descubrimiento y publicación

### 1. Publicar también significa entrar en el catálogo general

- **Dónde vive:** [consulta de la portada](../app/page.tsx#L22), [estados del evento](../supabase/migrations/20261104120000_events_and_ticket_types.sql#L1) y [selector del organizador](../app/organizador/page.tsx#L176).
- **Qué decide el código:** la portada incluye los eventos publicados desde el inicio del día actual. El mismo estado permite su consulta para registro. No hay una elección independiente de aparecer en el catálogo.
- **Supuesto implícito:** quien quiere abrir inscripciones también quiere difusión pública en Door List. La visibilidad pública documentada se convierte, además, en distribución automática en la portada.
- **Otra opción razonable:** separar inscripción abierta y visibilidad, permitiendo eventos no listados accesibles mediante enlace. Serviría para encuentros internos o comunidades que distribuyen sus propias invitaciones.

### 2. La proximidad temporal determina la relevancia de los eventos

- **Dónde vive:** [orden de la portada](../app/page.tsx#L25) y [presentación del catálogo](../app/page.tsx#L83).
- **Qué decide el código:** los eventos se ofrecen en una lista común ordenada por fecha de inicio ascendente. No intervienen intereses, ubicación del visitante o afinidad con el organizador.
- **Supuesto implícito:** el siguiente evento en el calendario es el candidato más útil para descubrir. El público comparte suficiente contexto para que una agenda común resuelva la elección.
- **Otra opción razonable:** conservar el orden por fecha, pero dejar que el visitante delimite ciudad o temática antes de ver resultados. La relevancia pasaría a depender de una intención expresada por el usuario.

### 3. Un evento agotado sigue siendo una invitación a registrarse en la portada

- **Dónde vive:** [campos y filtros de la consulta pública](../app/page.tsx#L22), [CTA de cada evento](../app/page.tsx#L102) y [aviso de agotamiento dentro del formulario](../app/eventos/[eventId]/registro/registration-form.tsx#L61).
- **Qué decide el código:** el catálogo no consulta disponibilidad y muestra «Registrarme» en cada tarjeta. El visitante descubre que no hay cupo después de abrir el registro.
- **Supuesto implícito:** mantener el evento visible y conducir a su página aporta valor aunque no se pueda reservar; conocer disponibilidad no es necesario para decidir desde el catálogo.
- **Otra opción razonable:** mantenerlo visible con una etiqueta «Agotado» y un destino informativo, o priorizar los eventos con cupo. Evitaría que el primer compromiso del visitante sea con una reserva que ya no está disponible.

### 4. El evento se representa como una cita con un inicio y un lugar

- **Dónde vive:** [estructura de `events`](../supabase/migrations/20261104120000_events_and_ticket_types.sql#L3), [formulario de logística](../app/organizador/page.tsx#L167) y [resumen de la entrada](../app/entradas/[code]/page.tsx#L92).
- **Qué decide el código:** se exige un lugar textual y una fecha de inicio; no se estructuran fin, sesiones, recurrencia ni modalidad. Un enlace de videollamada o una agenda de varias jornadas tendrían que expresarse dentro del texto existente.
- **Supuesto implícito:** una cita y una referencia de lugar bastan para explicar la logística del encuentro y el alcance de su entrada.
- **Otra opción razonable:** distinguir eventos presenciales y virtuales, e incorporar fin o sesiones cuando cambie qué puede reservar o utilizar el asistente. Permitiría expresar una entrada para una jornada concreta sin depender de la descripción.

### 5. El organizador puede publicar antes de preparar una opción de registro

- **Dónde vive:** [guardado del evento](../app/organizador/page.tsx#L80), [selección de estado](../app/organizador/page.tsx#L176) y [formulario sin tipos de entrada](../app/eventos/[eventId]/registro/registration-form.tsx#L63).
- **Qué decide el código:** guardar como publicado no exige crear un `TicketType`. El evento puede aparecer en el catálogo mientras el registro informa que todavía no hay tipos disponibles.
- **Supuesto implícito:** la publicación puede funcionar como anuncio previo y la preparación de entradas puede completarse después, bajo responsabilidad del organizador.
- **Otra opción razonable:** distinguir «Anunciado» de «Inscripción abierta», o exigir al menos un tipo con cupo al abrir inscripciones. Así se podría anunciar sin prometer una reserva inmediata.

### 6. Editar un evento cambia también lo que representa una entrada ya emitida

- **Dónde vive:** [actualización de datos del evento](../app/organizador/page.tsx#L88), [edición del tipo de entrada](../app/organizador/page.tsx#L120), [consulta pública con datos actuales](../supabase/migrations/20261106140000_ticket_issuance.sql#L52) y [contenido del correo](../lib/email/ticket-email.ts#L25).
- **Qué decide el código:** la entrada web obtiene título, fecha, lugar y nombre del tipo mediante consultas a las entidades actuales. El correo conserva los datos incluidos al enviarse. El guardado de cambios no incorpora una notificación a quienes ya se registraron.
- **Supuesto implícito:** la entrada es una referencia viva al evento; el organizador puede revisar sus condiciones y gestionar la comunicación por su cuenta. No hace falta conservar una versión de las condiciones aceptadas al registrarse.
- **Otra opción razonable:** distinguir correcciones menores de cambios de fecha o sede, y comunicar estos últimos a los registrados. Se podría conservar la información original para explicar qué cambió y permitir reconfirmación.

### 7. Volver a borrador funciona como un interruptor de varias operaciones

- **Dónde vive:** [estado editable](../app/organizador/page.tsx#L176), [disponibilidad para registro](../supabase/migrations/20261110120000_entity_vocabulary.sql#L7), [autorización de check-in](../supabase/migrations/20261118120000_ticket_check_in.sql#L15) y [consulta de entradas emitidas](../supabase/migrations/20261106140000_ticket_issuance.sql#L60).
- **Qué decide el código:** cambiar a borrador retira el evento del catálogo, cierra el registro e impide registrar ingresos. Las entradas existentes siguen siendo consultables y el cambio no modifica por sí mismo su estado.
- **Supuesto implícito:** una sola condición de publicación puede gobernar difusión, inscripción y operación de puerta. Retirar temporalmente el evento equivale a suspender también su operación.
- **Otra opción razonable:** separar visibilidad, apertura de registros y estado operativo. El organizador podría cerrar nuevas inscripciones o retirar promoción sin bloquear el ingreso de asistentes ya confirmados.

## Registro y relación con el asistente

### 8. Declarar nombre y email basta para obtener una plaza confirmada

- **Dónde vive:** [datos exigidos al registrarse](../lib/registration.ts#L4), [inserción y respuesta de éxito](../supabase/migrations/20261110120000_entity_vocabulary.sql#L17), [emisión automática de la entrada](../supabase/migrations/20261106140000_ticket_issuance.sql#L15) y [envío posterior de correo](../lib/register-attendee.ts#L13).
- **Qué decide el código:** tras validar datos y disponibilidad, se confirma el registro y se emite la entrada. No hay un paso intermedio de verificación de posesión del email, evaluación del organizador o cobro en este recorrido.
- **Supuesto implícito:** la reserva puede basarse en datos autodeclarados y confirmación inmediata. El riesgo de una dirección equivocada o una reserva hecha por otra persona es aceptable frente a reducir fricción.
- **Otra opción razonable:** verificar el correo antes de consolidar la plaza, con una reserva temporal que expire. Sería apropiado si importa más confirmar intención y contacto que completar el registro en un solo paso.

### 9. Los tipos de entrada son categorías que el asistente se asigna

- **Dónde vive:** [radio de elección del tipo](../app/eventos/[eventId]/registro/registration-form.tsx#L76), [datos de un `TicketType`](../supabase/migrations/20261104120000_events_and_ticket_types.sql#L14) y [comprobación al registrar](../supabase/migrations/20261110120000_entity_vocabulary.sql#L27).
- **Qué decide el código:** se comprueban pertenencia al evento y cupo. Un tipo no incorpora reglas propias de elegibilidad, invitación o acreditación.
- **Supuesto implícito:** el nombre del tipo y la buena elección del asistente bastan para distribuir las plazas. Crear una categoría «Socios» o «Invitados» no implica restringir quién puede elegirla.
- **Otra opción razonable:** permitir tipos públicos y tipos que requieran una invitación o validación. El organizador podría reservar plazas para colectivos sin depender solo del texto de la categoría.

### 10. El inventario restante se comunica con cifras exactas

- **Dónde vive:** [cálculo público de disponibilidad](../supabase/migrations/20261110120000_entity_vocabulary.sql#L9) y [texto de cada opción](../app/eventos/[eventId]/registro/registration-form.tsx#L98).
- **Qué decide el código:** cualquier visitante puede consultar cuántos cupos quedan por tipo; el formulario muestra la cifra concreta.
- **Supuesto implícito:** la transparencia del inventario ayuda a reservar y el organizador acepta que el ritmo de ocupación sea observable públicamente.
- **Otra opción razonable:** mostrar disponibilidad por tramos —«Disponible», «Últimos cupos», «Agotado»— o dejar elegir esta política al organizador. Conservaría una señal útil sin publicar el inventario exacto.

### 11. Agotar cupos termina la posibilidad de expresar interés

- **Dónde vive:** [estado de agotamiento](../app/eventos/[eventId]/registro/registration-form.tsx#L61), [campos deshabilitados](../app/eventos/[eventId]/registro/registration-form.tsx#L65) y [botón deshabilitado](../app/eventos/[eventId]/registro/registration-form.tsx#L112).
- **Qué decide el código:** al agotarse todos los tipos, el formulario deja de admitir datos. El flujo no convierte el interés adicional en una solicitud pendiente.
- **Supuesto implícito:** el valor del registro está en confirmar plazas existentes; captar demanda excedente no forma parte de la relación con el asistente.
- **Otra opción razonable:** ofrecer una lista de espera separada de `Registration`, con consentimiento para avisar si se amplía el aforo. No tendría que prometer ni ocupar una plaza.

### 12. Los datos del registro se tratan como definitivos dentro de la aplicación

- **Dónde vive:** [permisos de `registrations`](../supabase/migrations/20261106120000_public_registration.sql#L13), [pantalla posterior al registro](../app/eventos/[eventId]/registro/registration-form.tsx#L59) y [destinatario del reenvío](../app/api/organizador/eventos/[eventId]/registros/[registrationId]/reenviar-entrada/route.ts#L30).
- **Qué decide el código:** los recorridos revisados permiten crear y consultar el registro, pero no corregir nombre o email ni cambiar de tipo. El reenvío utiliza el email almacenado, sin ofrecer una dirección de reemplazo.
- **Supuesto implícito:** los errores de identidad o contacto se resuelven fuera de estos flujos; el registro no necesita un ciclo de mantenimiento después de confirmarse.
- **Otra opción razonable:** permitir correcciones verificadas por el asistente o por el organizador, conservando trazabilidad. Haría posible reparar un email mal escrito sin crear otro registro.

### 13. La recuperación de una entrada perdida depende de intervención del organizador

- **Dónde vive:** [respuesta al registro duplicado](../app/eventos/[eventId]/registro/registration-form.tsx#L49), [acción de reenvío en el panel](../app/dashboard/eventos/[eventId]/asistentes/resend-ticket-button.tsx#L53) y [condición de entrada reenviable](../app/api/organizador/eventos/[eventId]/registros/[registrationId]/reenviar-entrada/route.ts#L37).
- **Qué decide el código:** si alguien perdió enlace y correo, volver a registrarse solo informa que ya existe un registro. La acción de recuperación disponible en la aplicación pertenece al organizador y admite entradas válidas sin utilizar.
- **Supuesto implícito:** la asistencia manual es un coste aceptable para recuperar acceso; proteger el código frente a búsquedas públicas justifica concentrar esta tarea en el organizador.
- **Otra opción razonable:** ofrecer «Reenviar mi entrada» con respuesta pública neutra y envío únicamente al email registrado. Permitiría recuperar acceso sin revelar el código ni la existencia de una reserva al solicitante.

## Control de puerta y vigencia

### 14. Conocer el email registrado habilita una vía de ingreso sin presentar el QR

- **Dónde vive:** [búsqueda exacta y devolución del código al organizador](../app/api/organizador/check-in/buscar/route.ts#L18) y [confirmación de ingreso desde el resultado](../app/scan/email-ticket-search.tsx#L77).
- **Qué decide el código:** el operador autorizado obtiene la entrada válida al buscar el email completo y puede registrar el ingreso. La interfaz pide confirmar los datos; el flujo no exige que el asistente demuestre acceso a ese buzón ni presente una segunda credencial.
- **Supuesto implícito:** la comprobación humana de nombre y email ofrece suficiente confianza para sustituir el QR. El criterio concreto de identificación queda en manos del operador.
- **Otra opción razonable:** explicitar una política de verificación para este caso, como comprobar un dato adicional o enviar un código al correo. El nivel de exigencia podría depender del tipo de evento.

### 15. Una entrada puede utilizarse fuera de la fecha del evento

- **Dónde vive:** [condiciones de `check_in_ticket`](../supabase/migrations/20261118120000_ticket_check_in.sql#L15) y [eventos disponibles en el lector](../app/scan/ticket-scanner.tsx#L21).
- **Qué decide el código:** el check-in exige propietario, evento publicado y entrada válida del evento, pero no compara la hora actual con `starts_at`. El lector incluye eventos publicados sin filtrar por fecha.
- **Supuesto implícito:** el operador decide cuándo tiene sentido abrir puerta; el calendario es informativo para el ingreso, aunque sí gobierna el cierre del registro público.
- **Otra opción razonable:** definir una ventana de ingreso configurable alrededor del evento, con una excepción autorizada para pruebas o acreditación anticipada. Separaría la operación habitual de los casos extraordinarios.

### 16. La consulta de la entrada no tiene un final de vigencia propio

- **Dónde vive:** [campos de `tickets`](../supabase/migrations/20261106140000_ticket_issuance.sql#L4) y [consulta por código](../supabase/migrations/20261106140000_ticket_issuance.sql#L52).
- **Qué decide el código:** la consulta devuelve nombre, email y detalles sin filtrar por fecha del evento o estado de la entrada. El esquema revisado no incorpora caducidad del enlace. Mientras se conserve el registro y no cambie este comportamiento, el código sigue dando acceso a esos datos.
- **Supuesto implícito:** conservar la entrada como comprobante justifica mantener su consulta después del encuentro, incluso si está utilizada o revocada. El permiso de consulta tiene una vida distinta de la autorización de ingreso.
- **Otra opción razonable:** establecer un período de consulta completa y después conservar un comprobante reducido o exigir autenticación. La duración podría acordarse según las necesidades de soporte y del asistente.

## Métricas y exportación

### 17. «Vendida» significa entrada válida o utilizada, sin acreditar una transacción económica

- **Dónde vive:** [estados que cuentan como venta](../lib/export/attendees.ts#L5), [consulta de cantidades por tipo](../app/dashboard/eventos/[eventId]/asistentes/route.ts#L73), [texto «entradas vendidas»](../app/dashboard/eventos/[eventId]/asistentes/ticket-sales.tsx#L25) y [filtrado del CSV](../lib/export/attendees.ts#L29).
- **Qué decide el código:** se cuentan entradas `valid` y `used` como vendidas; las revocadas quedan fuera de ese cómputo y del CSV. La lista de registrados y el aforo ocupado, en cambio, se basan en registros. El recorrido de registro revisado no comprueba pagos.
- **Supuesto implícito:** «venta» es una medida de entradas actualmente reconocidas, no de ingresos cobrados ni de emisiones históricas. Una revocación deja de ser venta aunque el registro siga existiendo y ocupando cupo.
- **Otra opción razonable:** llamar a la cifra «Entradas válidas y utilizadas» y distinguir registros, entradas emitidas y ventas pagadas. El CSV podría incluir todos los estados si su propósito es reconciliación histórica.

### 18. El resumen global mide registros acumulados, no personas únicas ni un período de actividad

- **Dónde vive:** [métricas del resumen](../app/dashboard/event-overview.tsx#L23) y [eventos incluidos en la consulta](../lib/organizer-events.ts#L7).
- **Qué decide el código:** «Personas registradas» suma `registrationCount` de todos los eventos recuperados del organizador. El cálculo no deduplica asistentes entre eventos ni delimita fechas; también agrega aforos y borradores en el resumen.
- **Supuesto implícito:** el volumen acumulado de reservas y capacidad describe mejor el desempeño del organizador que el tamaño de su comunidad o su actividad reciente. Una persona que vuelve a varios eventos aporta varias unidades a esa cifra.
- **Otra opción razonable:** presentar «Registros acumulados» y ofrecer una métrica separada de asistentes únicos en un período elegido. Distinguiría recurrencia, alcance y actividad sin cambiar el significado de `Registration`.

### 19. «Plazas disponibles» mide margen de aforo, no reservas que hoy pueden hacerse

- **Dónde vive:** [métrica del detalle](../app/dashboard/eventos/[eventId]/event-detail.tsx#L45), [regla de asignación de aforo](../supabase/migrations/20261104130000_event_capacity.sql#L13) y [disponibilidad pública por tipo](../supabase/migrations/20261110120000_entity_vocabulary.sql#L9).
- **Qué decide el código:** la métrica resta registros a la capacidad total del evento. Las plazas que puede reservar el público dependen del aforo asignado a los tipos, cuya suma puede ser menor que la capacidad total.
- **Supuesto implícito:** al operar el evento, «disponible» debe responder cuánto margen físico queda, aunque parte de ese margen todavía no se ofrezca en el registro.
- **Otra opción razonable:** separar «Aforo sin ocupar» de «Cupos abiertos para registro» y mostrar las plazas aún sin asignar. Por ejemplo, con aforo 100, tipos que suman 60 y 60 registros, hoy se mostrarían 40 plazas disponibles aunque no quede ningún cupo reservable.

### 20. Exportar asistentes también exporta credenciales utilizables

- **Dónde vive:** [columnas del CSV](../lib/export/attendees.ts#L21), [inclusión del código completo](../lib/export/attendees.ts#L33), [lectura del código para exportar](../app/dashboard/eventos/[eventId]/asistentes/route.ts#L45) y [consulta pública mediante ese código](../supabase/migrations/20261106140000_ticket_issuance.sql#L52).
- **Qué decide el código:** cada fila contiene nombre, email y código completo de la entrada. El archivo descargado permite trasladar fuera de la aplicación tanto la lista de contacto como el acceso a las entradas incluidas.
- **Supuesto implícito:** disponer de una lista operativa completa incluye disponer de las credenciales. Se confía en que quien maneje o reciba el CSV deba poder consultar esas entradas y presentar sus códigos.
- **Otra opción razonable:** ofrecer por defecto una exportación de contactos y estados con un identificador que no autorice acceso, y una exportación de códigos separada para operaciones que sí los necesiten.

### 21. Descargar desde una lista filtrada produce un padrón general

- **Dónde vive:** [filtros y botón en el detalle](../app/dashboard/eventos/[eventId]/event-detail.tsx#L49), [URL de descarga](../app/dashboard/eventos/[eventId]/asistentes/download-attendees-button.tsx#L23) y [selección del CSV](../app/dashboard/eventos/[eventId]/asistentes/route.ts#L37).
- **Qué decide el código:** nombre, email, tipo y página delimitan la tabla, pero no se transmiten a la descarga. El CSV incluye el conjunto del evento que cumple los estados admitidos, no necesariamente las filas que el organizador está viendo.
- **Supuesto implícito:** exportar es obtener un padrón general; los filtros solo facilitan consulta en pantalla y no representan una selección de destinatarios o de trabajo.
- **Otra opción razonable:** distinguir «Exportar todo» de «Exportar resultados filtrados», indicando el alcance. Permitiría preparar listas por tipo de entrada sin procesar manualmente el archivo completo.

## Decisiones que conviene explicitar primero

Para una conversación de producto, empezaría por estas cinco porque definen promesas centrales y afectan varios flujos:

1. **Publicación y operación (1, 5 y 7):** qué promete «Publicado» sobre visibilidad, posibilidad de registrarse y permiso de ingreso.
2. **Cambios después de confirmar (6 y 12):** qué puede cambiar el organizador, qué puede corregir el asistente y cuándo se debe comunicar o pedir reconfirmación.
3. **Confianza e identidad (8, 9 y 14):** qué evidencia basta para obtener una plaza, elegir una categoría o ingresar sin QR.
4. **Significado de las métricas (17, 18 y 19):** qué debe entender el organizador por venta, persona y plaza disponible.
5. **Alcance del acceso a las entradas (16 y 20):** durante cuánto tiempo y en qué exportaciones deben viajar códigos que permiten consultar datos y presentar la entrada.

Estas preguntas quedan abiertas. Este archivo documenta el comportamiento y sus supuestos; no ratifica las políticas ni modifica el producto.
