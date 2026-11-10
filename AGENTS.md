Consulta la documentación oficial de la versión de Next.js instalada antes de escribir código del framework.
Para crear, modificar o revisar UI, consulta y aplica .agents/skills/door-list-ui/SKILL.md.
Usa Server Components por defecto.
Añade "use client" solo cuando una necesidad concreta del componente requiera ejecución en el cliente.
Ubica las rutas en app/.
Ubica la UI compartida en components/.
Ubica la lógica y las utilidades compartidas en lib/.
Ubica los clientes de Supabase en lib/supabase/.
Define los cambios de esquema en supabase/migrations/.
Ubica cada componente usado por una sola ruta junto a esa ruta.
Mueve a components/ cada componente usado por dos o más rutas.
Usa Event para eventos, TicketType para tipos de entrada, Ticket para entradas y Registration para registros de asistentes en todo el repositorio.
Mantén Event, TicketType, Ticket y Registration como entidades distintas y no uses sus nombres como sinónimos.
Nombra las tablas en snake_case y en plural según su entidad: events, ticket_types, tickets y registrations.
Escribe el código, los identificadores y los nombres de tipos en inglés.
Escribe el texto de la interfaz en español.
Nombra los segmentos estáticos de las rutas públicas en español.
Nombra en inglés los componentes que sirven las rutas públicas.
Limita snake_case a la capa de persistencia.
Usa camelCase en los campos de todos los contratos de API, tanto de request como de response.
Define en lib/ los tipos compartidos entre API, email y UI.
Reutiliza los tipos compartidos sin redefinirlos por archivo.
Define en lib/ los helpers de fecha y formato.
Reutiliza los helpers de fecha y formato sin copiarlos entre pantallas.
Devuelve toda respuesta de error de la API como JSON con la forma { error: string }.
Responde a los errores de negocio con el código HTTP correspondiente y nunca con 200.
Comprueba response.ok en el cliente antes de interpretar el cuerpo de la respuesta.
Muestra mensajes de error propios en la UI y nunca mensajes crudos del proveedor.
Guarda toda migración en un archivo versionado dentro de supabase/migrations/.
Realiza los cambios de esquema mediante migraciones y nunca mediante SQL suelto.
Habilita RLS en toda tabla expuesta.
Pide confirmación explícita antes de ejecutar cualquier comando que acceda a una base de datos, incluso en modo de solo lectura.
Pide confirmación explícita antes de ejecutar cualquier comando que instale dependencias.
