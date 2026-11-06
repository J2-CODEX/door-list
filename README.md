# Door List

Aplicación Next.js para mostrar un evento y gestionar eventos y tipos de entrada de organizadores.

## Configuración

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` a `.env.local` y configura la URL y la clave pública (anon o publishable) de tu proyecto Supabase. Nunca uses la clave de servicio en el navegador.
3. Aplica las migraciones de `supabase/migrations` en orden a tu proyecto Supabase.
4. Habilita el acceso por correo y contraseña en Supabase Auth y crea las cuentas de organizador allí.
5. Ejecuta `npm run dev` y entra en `/organizador`.

Cada usuario autenticado administra únicamente sus propios eventos gracias a las políticas RLS. Los eventos publicados y sus tipos de entrada son visibles públicamente mediante la API de Supabase. La landing de `/` sigue mostrando datos de ejemplo.

Cada evento tiene un límite de asistentes. La suma del aforo de sus tipos de entrada no puede superar ese límite; tampoco se puede reducir el límite por debajo de la suma asignada. La regla se comprueba en la interfaz y en la base de datos, incluso para operaciones concurrentes. Las fechas se introducen y muestran en la zona horaria del navegador.

## Registro público

Cada evento publicado vigente tiene un enlace desde el organizador a `/eventos/[eventId]/registro`. La fecha límite es el día del evento completo en `America/Guayaquil`. La portada conserva sus datos de ejemplo.

Aplica también `20261106120000_public_registration.sql` antes de usar el registro. Requiere confirmación del usuario antes de ejecutar cualquier comando de base de datos. La migración crea registros privados, consultas públicas agregadas y una RPC que comprueba disponibilidad e inserta en una transacción. Un email normalizado solo puede registrarse una vez por evento.

El formulario usa React Hook Form, Zod y Sonner con componentes de interfaz adaptados al tema del proyecto. No se requiere una clave de servicio. No se pueden eliminar eventos o entradas con registros ni reducir su aforo por debajo de la ocupación.

Verificación de integración (en una base de pruebas, con autorización): comprobar acceso anónimo y RLS, evento borrador/pasado, cierre a medianoche de Ecuador, última plaza con dos envíos simultáneos (un solo éxito), duplicados con mayúsculas, entrada ajena al evento, reducción de cupo, eliminación y reintentos. En el navegador comprobar teclado, móvil, errores de red y conservación de los datos.

Pruebas unitarias: `node --test tests/registration.test.mjs` (Node 22.18+). La prueba `tests/registration.integration.test.mjs` es optativa y crea registros: requiere autorización y un evento de pruebas publicado futuro con una única plaza libre. Configura `TEST_REGISTRATION_EVENT_ID`, `TEST_REGISTRATION_TICKET_ID`, las variables públicas de Supabase y `RUN_REGISTRATION_DB_TESTS=1` antes de ejecutarla. No uses eventos reales; los registros de prueba permanecen para inspección.

## Emisión de entradas

Aplica `20261106140000_ticket_issuance.sql` tras las migraciones anteriores. Crea `tickets` con `registration_id` único, código único de 64 caracteres hexadecimales y estado `valid`, `used` o `revoked`. El código concatena dos UUID v4 criptográficamente aleatorios (244 bits aleatorios). Un trigger emite una entrada por registro en la misma transacción; si falla, el registro tampoco se confirma. La migración también emite entradas para registros anteriores.

La confirmación muestra «Ver mi entrada y QR» y enlaza a `/entradas/[code]`. El QR se genera en el servidor con `qrcode` y contiene solo el código; no envía datos a servicios externos. Las páginas muestran nombre, email, evento, tipo y estado actual. El estado se consulta al abrir o actualizar la página; consultar no consume la entrada. Los estados used/revoked están soportados, pero esta entrega no añade un flujo de check-in ni un panel para revocar.

El enlace/código es una credencial de acceso: quien lo tenga puede ver los datos del asistente. No existe búsqueda pública por email, UUID o prefijo, ni lectura/listado directo de tickets. Un intento de registro duplicado nunca devuelve el código existente. Los enlaces se excluyen de indexación, no usan caché compartida y llevan Referrer-Policy no-referrer. La función `get_public_ticket` exige coincidencia completa con un código válido. La entropía evita enumeración práctica, pero no evita que alguien copie un QR o comparta su propio enlace. En producción, los logs de acceso y herramientas de analítica deben excluir o redactar `/entradas/*`; no se incorpora analítica en esta página.

Para registros anteriores, los códigos quedan emitidos en la base de datos, sin habilitar recuperación pública por email. La revocación no libera cupos automáticamente.

Pruebas sin BD: `node --test tests/registration.test.mjs tests/tickets.test.mjs`. La prueba de integración optativa del registro también verifica emisión, consulta y privacidad del ticket. Debe ejecutarse únicamente contra una base de pruebas autorizada con una plaza libre, como se detalla arriba.

Verificación SQL transaccional: `tests/ticket-issuance.sql` crea fixtures, comprueba emisión, códigos únicos, una entrada por registro, estados, duplicados y privilegios, y termina con ROLLBACK. Requiere autorización explícita de acceso a la BD y un organizador existente. Comando: `supabase db query --remote --yes --file tests/ticket-issuance.sql`.


## Correo de confirmación (Resend)

Configura `RESEND_API_KEY` y `RESEND_FROM_EMAIL` exclusivamente en el servidor (también en el despliegue). El remitente debe estar autorizado en Resend; para destinatarios reales usa un dominio verificado. No se instala un SDK: se utiliza la API HTTPS oficial de Resend. No requiere migración adicional.

Para pruebas locales con `onboarding@resend.dev`, configura `RESEND_TEST_TO_EMAIL=juan@collantes.ec` en `.env` y reinicia `npm run dev`. Esa dirección debe ser el correo asociado a la cuenta Resend de la API key: el dominio de pruebas solo permite enviar a esa cuenta. Con `NODE_ENV=development`, todos los correos de confirmación se envían únicamente a esa dirección, conservando el email registrado y el QR de cada asistente. Si la variable está vacía o ausente, se usa el email del asistente. En producción se ignora siempre esta redirección, incluso si la variable está definida. Los registros anteriores o duplicados no reenvían correo.

Después de confirmar la transacción de registro y emisión, la acción del servidor consulta la entrada emitida y envía al email almacenado en la base. El correo HTML usa la paleta crema/verde del sitio e incluye evento, fecha/hora de Ecuador continental, lugar, asistente, tipo de entrada y un QR PNG incrustado mediante Content-ID (`cid:`). El QR contiene el mismo código que la página pública, sin subirlo a servicios de imágenes ni requerir abrir enlaces. También se incluye texto plano y la imagen adjunta. Algunos clientes pueden ocultar imágenes por sus propias preferencias.

El envío espera la respuesta de Resend, con tiempo límite de 8 segundos por intento y un máximo de dos intentos ante errores de red, timeout, 429 o 5xx. Se usa una clave de idempotencia derivada de la entrada y del contenido para evitar duplicados en estos reintentos (Resend conserva las claves durante 24 horas). No se reenvía ante registros duplicados. La aceptación de Resend no garantiza entrega en bandeja; no hay seguimiento de rebotes/webhooks ni cola de reenvío persistente en esta implementación. Si falla el envío, la entrada sigue confirmada: se muestra una alerta y su enlace para guardarla sin registrar otra vez. Los registros creados directamente por RPC fuera de la aplicación y los anteriores no generan correo automático.

Pruebas locales sin enviar correos ni acceder a la BD: `node --test tests/registration.test.mjs tests/tickets.test.mjs tests/ticket-email.test.mjs`. Los tests de transporte usan un fetch simulado. Para verificar entrega real, realiza un registro desde la web con un email controlado y revisa el mensaje y el QR en tu cliente de correo.
