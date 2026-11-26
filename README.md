# Door List

Aplicación Next.js para mostrar un evento y gestionar eventos y tipos de entrada de organizadores.

## Configuración

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` a `.env.local` y configura la URL y la clave pública (anon o publishable) de tu proyecto Supabase. Nunca uses la clave de servicio en el navegador.
3. Aplica las migraciones de `supabase/migrations` en orden a tu proyecto Supabase.
4. Habilita el acceso por correo y contraseña en Supabase Auth y crea las cuentas de organizador allí.
5. Ejecuta `npm run dev` y entra en `/organizador`.

Cada usuario autenticado administra únicamente sus propios eventos gracias a las políticas RLS. Los eventos publicados y sus tipos de entrada son visibles públicamente mediante la API de Supabase. La cartelera de `/` consulta los eventos publicados vigentes de la base de datos.

Cada evento tiene un límite de asistentes. La suma del aforo de sus tipos de entrada no puede superar ese límite; tampoco se puede reducir el límite por debajo de la suma asignada. La regla se comprueba en la interfaz y en la base de datos, incluso para operaciones concurrentes. Las fechas se introducen y muestran en la zona horaria del navegador.

## Datos semilla para desarrollo

`supabase/seed.sql` carga siete eventos publicados, catorce tipos de entrada y veinte registros ficticios. El trigger existente emite una entrada por registro. «Mesa con ponentes» del encuentro de comunidades tiene tres plazas y tres registros, por lo que aparece agotada; «General» sigue disponible. El evento «Noche de jazz íntimo» está completamente agotado: sus ocho plazas de «General» y dos de «Primera fila» tienen diez registros. No se envían correos al cargar SQL.

Las fechas se calculan al ejecutar la semilla en `America/Guayaquil`: el encuentro es hoy, el concierto es el domingo de esta semana, tecnología queda a mitad de los días restantes del mes y gastronomía al final del mes. Arte es el día 10 del mes siguiente y la caminata el día 20 de dentro de dos meses. La noche de jazz es dentro de catorce días a las 19:00. Si se carga un domingo o el último día del mes, algunos eventos coinciden en el día actual y siguen visibles durante ese día.

**Requisito previo: debe existir un usuario organizador con el correo `jotajota18@hotmail.com` en Supabase Auth del proyecto `aagediqdfxnyxzeqebzr`.** Compruébalo en **Authentication → Users** antes de ejecutar la semilla. No basta con que exista cualquier organizador: `supabase/seed.sql` busca específicamente ese correo.

La razón es que cada evento necesita un propietario: `events.owner_id` referencia el UUID de una cuenta de `auth.users`. La semilla consulta el UUID de `jotajota18@hotmail.com` y le asigna los siete eventos, incluidos los seis anteriores si ya estaban cargados con otro propietario. Las políticas RLS usan ese UUID para que puedas administrar tus eventos y consultar sus asistentes al iniciar sesión en `/organizador` con tu contraseña actual.

La carga no crea cuentas ni modifica contraseñas, identidades o sesiones. Si la cuenta no existe, está eliminada o el correo corresponde a varias cuentas, la semilla se detiene antes de modificar datos con un mensaje para revisar Auth. La cuenta de ejemplo `organizador@door-list.test`, si se creó con una versión anterior de la semilla, no se elimina ni se modifica.

La aplicación usa Supabase en la nube. Esta carga requiere Supabase CLI 3.4 o posterior y acceso al proyecto; no requiere Docker ni una base local. Usa estos datos ficticios únicamente en un proyecto de desarrollo. Ejecuta los comandos desde la raíz del repositorio. Si `npx` necesita descargar la CLI, confirma primero la instalación de dependencias. Antes de ejecutar comandos que accedan a la base de datos, obtén la confirmación explícita exigida por `AGENTS.md`.

Inicia sesión en la CLI. Los comandos siguientes apuntan al proyecto en la nube `aagediqdfxnyxzeqebzr`; `NEXT_PUBLIC_SUPABASE_URL` debe corresponder a ese mismo proyecto:

```sh
npx supabase login
```

La base debe tener aplicadas todas las migraciones de `supabase/migrations/`, incluida la de portadas. Si faltan migraciones, revisa primero cuáles se aplicarían y después aplícalas con autorización:

```sh
npx supabase db push --remote=aagediqdfxnyxzeqebzr --dry-run
npx supabase db push --remote=aagediqdfxnyxzeqebzr
```

Carga primero los datos de la semilla:

```sh
npx supabase db query --remote=aagediqdfxnyxzeqebzr --file supabase/seed.sql
```

`db query` ejecuta el SQL indicado por `--file` en la base del proyecto seleccionado por `--remote`. Busca la cuenta organizadora existente, inserta o actualiza los siete eventos y sus catorce tipos de entrada, añade los veinte registros ficticios que falten y guarda los metadatos de las portadas. El trigger de registros emite las entradas. La carga se ejecuta en una transacción: si falla, se revierten sus cambios. No reinicia la base ni sube los archivos de imagen.

Después de que la carga SQL termine correctamente, sube las portadas:

```sh
npx supabase seed buckets --remote=aagediqdfxnyxzeqebzr
```

`seed buckets` lee `supabase/config.toml`, crea o actualiza los buckets `event-covers` y `event-cover-staging`, y sube las siete portadas WebP de `supabase/seed-assets/event-covers/` al bucket `event-covers`. Conserva las rutas que usa el SQL y sobrescribe los archivos que ya existan en esas mismas rutas. Ambos buckets permanecen privados. Si pregunta si debe actualizar sus propiedades, la configuración conserva la privacidad, límites y tipos de archivo de la migración de portadas. Este comando no ejecuta `seed.sql`, no crea usuarios ni eventos y no resetea la base.

El destino explícito `--remote=aagediqdfxnyxzeqebzr` permite usar ambos comandos sin vincular el repositorio con `supabase link`.

Mantén `.env.local` apuntando al proyecto en la nube, con su clave pública en `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y su clave secreta en `SUPABASE_SECRET_KEY` (o la clave `service_role` en `SUPABASE_SERVICE_ROLE_KEY`). La clave del servidor es necesaria para servir las portadas. Reinicia `npm run dev` si cambias las variables y abre `/`.

SQL y archivos pueden cargarse varias veces: los UUID y correos de los datos ficticios son fijos; los eventos y tipos se actualizan, los registros existentes se omiten y los códigos de entrada y check-ins se conservan. Auth se consulta sin modificarlo. Las portadas modificadas desde el organizador conservan sus metadatos; Storage sobrescribe solo los siete archivos de ejemplo en sus mismas rutas. No se modifican eventos ni asistentes ajenos a la semilla. Si has alterado los aforos de estos eventos, la recarga puede fallar por las restricciones existentes; toda la carga SQL se revierte en ese caso.

Para recargar, repite únicamente los dos comandos de carga anteriores sobre el mismo proyecto. No uses `db reset`: esta tarea conserva los demás datos del proyecto. No se necesita ninguna migración nueva ni se modifica el esquema. Las fotografías quedan versionadas y no se descargan de Internet durante la carga; sus fuentes están en [supabase/seed-assets/README.md](supabase/seed-assets/README.md).

Referencia oficial: [semillas de base de datos](https://supabase.com/docs/guides/local-development/seeding-your-database) y [comandos de Supabase CLI](https://supabase.com/docs/reference/cli/introduction).

## Imágenes de portada

Los eventos sin imagen muestran un placeholder en la cartelera, el registro y las vistas del organizador. Al guardar una portada, estas vistas muestran la imagen. Los eventos anteriores no reciben fotografías automáticamente.

Aplica `20261125120000_event_cover_images.sql` con autorización explícita de acceso a la base de datos. Configura `SUPABASE_SECRET_KEY` en `.env.local` y en el servidor de producción para guardar y servir imágenes desde los buckets privados. Cópiala de **Settings → API Keys → Secret keys** del mismo proyecto que la URL pública (empieza por `sb_secret_`); nunca añadas el prefijo `NEXT_PUBLIC_`. Reinicia el servidor de desarrollo después de cambiar las variables. Se conserva `SUPABASE_SERVICE_ROLE_KEY` como alternativa para instalaciones antiguas; si están ambas, se usa `SUPABASE_SECRET_KEY`.

La consulta del estado de la portada usa la sesión verificada del propietario y RLS; no necesita la clave de servicio. Un 503 al guardar o descargar puede indicar configuración incompleta; un 503 al consultar el estado requiere revisar la migración, los permisos o la conectividad. Las pruebas aisladas de `tests/fixtures/cover-preview` no necesitan credenciales ni acceden a Supabase.

## Gráfica del dashboard

El detalle de cada evento incluye una gráfica de registros diarios con los estilos compartidos de Door List, consulta independiente, actualización manual y tabla accesible. Usa `America/Guayaquil` e incluye en cero todos los días desde la publicación hasta hoy; los filtros y la paginación de asistentes no afectan a la gráfica.

Requiere la migración `20261110130000_daily_registration_counts.sql`, que registra `published_at` al publicar nuevos eventos y agrega los registros en SQL, sin límites de filas ni datos personales en la respuesta. La consulta conserva RLS y comprueba que el usuario sea propietario. Su aplicación requiere confirmación explícita antes de acceder a la base de datos.

`GET /api/organizador/eventos/[eventId]/registros-por-dia` exige un Bearer token válido y devuelve `{ eventId, publishedAt, startDate, endDate, days: [{ date, count }] }` con caché privada deshabilitada. Los errores usan `{ error: string }` con 401, 404 o 500. No modifica el endpoint de asistentes.

La fecha de publicación de eventos antiguos no se puede reconstruir: se conserva como `null` y la gráfica indica que empieza en el primer registro disponible. Si tampoco hay registros, muestra un mensaje sin inventar una fecha. Un borrador nuevo muestra la indicación de publicarlo.

Pruebas sin base de datos: `node --test tests/registration-series.test.mjs tests/dashboard.test.mjs tests/dashboard-query.test.mjs`. Queda por verificar la migración y los permisos de la RPC en una base de pruebas autorizada: publicación inicial, edición y republicación conservando la fecha, eventos antiguos, acceso anónimo/otro propietario, agrupación a medianoche de Ecuador y más de 1000 registros.

## Registro público

Cada evento publicado vigente tiene un enlace desde el organizador a `/eventos/[eventId]/registro`. La fecha límite es el día del evento completo en `America/Guayaquil`.

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
