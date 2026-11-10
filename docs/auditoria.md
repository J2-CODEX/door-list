Hay convenciones básicas consistentes, pero no una arquitectura aplicada de forma uniforme. El código muestra decisiones resueltas por funcionalidad, sin una pasada posterior para unificarlas. Sería exagerado decir que todo responde a un diseño establecido.

Lo que sí es consistente: archivos generalmente en kebab-case, componentes en PascalCase, funciones en camelCase, rutas en español, código mayormente en inglés y migraciones con fecha. También usamos TypeScript estricto. La inconsistencia principal está en las responsabilidades y los contratos.

Estos son ejemplos concretos:

1. “Ticket” significa dos entidades diferentes.
   En organizador/page.tsx:8 (app/organizador/page.tsx:8), Ticket representa un tipo de entrada: nombre y aforo, correspondiente a ticket_types. En tickets.ts:4 (lib/tickets.ts:4), PublicTicket representa una entrada individual emitida: código, estado y asistente. Además, PublicEvent.tickets contiene tipos de entrada. Esto obliga a deducir el significado por contexto; debería distinguirse TicketType de Ticket.
2. La separación entre interfaz y acceso a datos cambia según la pantalla.
   El registro utiliza una página, un formulario y acciones separados. En cambio, organizador/page.tsx:23 (app/organizador/page.tsx:23) concentra sesión, consultas, validaciones, operaciones de escritura y presentación. La portada también consulta Supabase directamente en page.tsx:26 (app/page.tsx:26). No seguimos una frontera uniforme entre páginas y lógica de datos.
3. Un módulo de eventos termina siendo infraestructura compartida.
   publicClient() está definido en public-events.ts:5 (lib/public-events.ts:5), pero también lo usan entradas, registro y portada. Por eso public-tickets.ts:2 (lib/public-tickets.ts:2) depende de un archivo de eventos para obtener el cliente. Funciona, pero la ubicación no corresponde a su responsabilidad; tendría más sentido un módulo dedicado a Supabase.
4. El manejo de errores cambia incluso dentro del mismo archivo.
   En organizador/page.tsx:103 (app/organizador/page.tsx:103), saveTicket() usa try/catch/finally para asegurar que busy vuelva a false. saveEvent() y login() no tienen esa protección: si una operación lanza una excepción, pueden dejar la interfaz ocupada. Además, el organizador muestra frecuentemente error.message de Supabase; el registro devuelve códigos como DUPLICATE y los traduce a mensajes propios. Son políticas distintas sin un criterio común explícito.
5. Validamos algunas respuestas externas y otras simplemente las damos por válidas.
   public-tickets.ts:11 (lib/public-tickets.ts:11) valida la respuesta con Zod. En cambio, public-events.ts:15 (lib/public-events.ts:15) hace data as PublicEvent, y actions.ts:21 (app/eventos/[eventId]/registro/actions.ts:21) hace data as RegistrationResult. Esas conversiones no comprueban los datos en ejecución. La garantía cambia según el flujo.
6. Los formularios y componentes compartidos no siguen una estrategia única.
   El registro usa React Hook Form, Zod y componentes como Input y Button. El organizador usa estados manuales, validaciones inline y sus propias cadenas de clases en organizador/page.tsx:13 (app/organizador/page.tsx:13). Además, componentes genéricos como Card y Button viven en un archivo llamado registration-controls.tsx (components/ui/registration-controls.tsx), aunque también se usan para entradas.

Mi evaluación honesta: hay coherencia de nomenclatura superficial y buenas decisiones locales, pero hemos acumulado deuda de consistencia al añadir funcionalidades. Priorizaría unificar errores y validación de respuestas, aclarar Ticket frente a TicketType y extraer la lógica del organizador.