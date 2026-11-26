# Memoria técnica de Door List

Última revisión documental: 2026-11-26. Esta memoria describe el repositorio y enlaza
sus fuentes; no acredita el estado actual del despliegue ni de la base remota.
Actualizar los hechos afectados cuando cambien el código o sus validaciones.

## Propósito y fuentes

Door List permite crear y publicar eventos, registrar asistentes, emitir entradas
con QR, enviarlas por correo y confirmar el ingreso. El organizador es el público
principal; el descubrimiento y registro de asistentes también forman parte del
producto, según [PRODUCT.md](PRODUCT.md).

- [AGENTS.md](AGENTS.md): instrucciones técnicas y autorizaciones obligatorias.
- [Constitución](.specify/memory/constitution.md): principios de producto y método,
  versión 1.0.0, ratificada el 2026-11-23. Los cambios de comportamiento requieren
  especificación en `specs/`; las discrepancias existentes no acreditan cumplimiento.
- [README.md](README.md): configuración, funcionalidades y datos semilla.
- [Skill de UI](.agents/skills/door-list-ui/SKILL.md) y [DESIGN.md](DESIGN.md): sistema
  visual. Consultar el skill antes de crear, modificar o revisar interfaz.

Esta memoria es contexto descriptivo. Las reglas se mantienen en sus fuentes;
ante diferencias, revisar código, especificaciones y evidencia antes de actuar.

## Stack y organización

Versiones leídas de los paquetes instalados durante esta revisión:

| Dependencia | Instalada | Rango en package.json |
| --- | --- | --- |
| Next.js | 16.4.5 | ^16.2.9 |
| React | 19.3.1 | ^19.2.0 |
| Supabase JS | 2.119.0 | ^2.119.0 |
| Tailwind CSS | 4.3.4 | ^4 |

Los rangos declarados no fijan la versión instalada. Antes de escribir código de
Next.js, comprobar `node_modules/next/package.json` y consultar la documentación
oficial incluida en `node_modules/next/dist/docs/` para esa versión.

- `app/`: App Router, páginas, handlers HTTP y componentes usados por una sola ruta.
  Server Components por defecto; `"use client"` solo con necesidad concreta.
- `components/`: UI compartida entre rutas; primitivas en `components/ui/`.
- `lib/`: lógica, contratos, validaciones y helpers. `lib/dates.ts` centraliza fechas;
  `lib/api-contracts.ts` traduce campos de los contratos públicos a camelCase.
- `lib/supabase/`: clientes públicos, de navegador, de organizador y administrativos.
- `supabase/migrations/`: historial versionado de esquema, RLS, triggers y RPC.
  `supabase/seed.sql` y `supabase/seed-assets/` contienen fixtures de desarrollo.
- `specs/`: especificaciones, planes, tareas y evidencia; `tests/`: pruebas Node,
  SQL, Playwright y vistas aisladas en `tests/fixtures/`.

El código y los tipos se escriben en inglés; interfaz y segmentos estáticos de
rutas públicas, en español. Los contratos HTTP usan camelCase y errores
`{ error: string }` con el estado HTTP correspondiente; no exponer errores crudos.
Hay tipos internos heredados con campos de persistencia en snake_case, por ejemplo
en `lib/events.ts`; no tomarlos como modelo para nuevos contratos de API.

## Entidades, rutas y flujo

| Entidad | Responsabilidad | Tabla |
| --- | --- | --- |
| Event | Evento del organizador, borrador o publicado | events |
| TicketType | Tipo de entrada y su aforo dentro del evento | ticket_types |
| Registration | Registro de un asistente en un evento y tipo | registrations |
| Ticket | Entrada emitida para un registro, con código y estado | tickets |

Mantener estas entidades distintas. Tipos y validaciones compartidos están en
`lib/events.ts`, `lib/registration.ts`, `lib/tickets.ts` y los módulos de cada dominio;
reutilizarlos en API, email y UI.

| Ruta | Función existente |
| --- | --- |
| `/` | Cartelera de eventos publicados vigentes, consultados en Supabase |
| `/iniciar-sesion` | Acceso de organizadores |
| `/organizador` | Gestión de eventos, tipos de entrada y portadas |
| `/dashboard` y `/dashboard/eventos/[eventId]` | Resumen, asistentes, exportación y gráfica diaria |
| `/eventos/[eventId]/registro` | Registro público |
| `/entradas/[code]` | Consulta de entrada y QR sin consumirla |
| `/scan` | Cámara, código manual, búsqueda por email y confirmación de ingreso |

El registro entra por `POST /api/registros` y `lib/register-attendee.ts` llama a
`register_attendee`. La RPC comprueba disponibilidad e inserta el registro; un
trigger emite su Ticket en la misma transacción. Solo después se envía el correo.
Un fallo de correo conserva la entrada confirmada y permite guardar su enlace.

Cada evento admite actualmente un registro por email normalizado. El aforo de un
TicketType no puede quedar por debajo de sus registros y la suma de aforos de tipos
no puede superar el aforo del Event. El conteo incluye registros cuyo Ticket esté
`valid`, `used` o `revoked`; revocar no libera cupo automáticamente. Las migraciones
aplican las restricciones, además de la validación de interfaz.

El QR contiene un código opaco de 64 caracteres hexadecimales, generado con dos
UUID v4; se genera en el servidor con `qrcode`. El check-in autentica al propietario
del evento publicado y usa `check_in_ticket`: marca la entrada como `used`, registra
fecha y operador y rechaza otro ingreso con HTTP 409. La búsqueda por email exige
propiedad y coincidencia completa. El organizador puede reenviar por correo una
entrada válida sin usar; el endpoint recibe `requestId` para la idempotencia.

La sesión del navegador se sincroniza mediante `/api/organizador/sesion` con una
cookie HttpOnly para el dashboard. El servidor verifica el token con Supabase Auth;
las APIs del organizador usan Bearer y comprobaciones de propietario. Un evento
publicado es públicamente legible: esa lectura no acredita propiedad.

## Portadas y configuración

Las portadas usan los buckets privados `event-covers` y `event-cover-staging`.
El flujo crea una intención, sube a staging y valida/convierte a WebP con `sharp`
antes de publicar. Usa revisiones y claims para coordinar cambios y recuperar
resultados inciertos. Las vistas comparten portada o placeholder y no esperan a
Storage para cargar los demás datos. La limpieza está implementada en
`scripts/cleanup-event-covers.mjs`; no consta ejecutada ni programada en la evidencia.

Consultar [.env.example](.env.example) y [README.md](README.md). Variables principales:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: cliente público.
- `SUPABASE_SECRET_KEY`: solo servidor, para guardar y servir imágenes. Tiene
  precedencia sobre el fallback `SUPABASE_SERVICE_ROLE_KEY`. La consulta del estado
  de portada usa la sesión del propietario y RLS, sin cliente privilegiado.
- `RESEND_API_KEY` y `RESEND_FROM_EMAIL`: correo mediante la API HTTPS de Resend.
  `RESEND_TEST_TO_EMAIL` redirige destinatarios únicamente en desarrollo.

No guardar claves, credenciales, códigos de entradas ni datos de asistentes en esta
memoria. La aceptación de Resend no acredita entrega en bandeja; el envío tiene
reintentos e idempotencia, pero no una cola persistente ni seguimiento de rebotes.

El README documenta semillas para un proyecto Supabase en la nube. La
[evidencia de portadas](specs/002-event-cover-images/validation.md) identifica ese
proyecto como producción: no asumir que sea un entorno desechable por contener
fixtures ni que una autorización histórica permita una operación nueva.

## Estado documentado y discrepancias

- **Aforo:** [spec 001](specs/001-fix-ticket-type-capacity/spec.md) implementada;
  su [quickstart](specs/001-fix-ticket-type-capacity/quickstart.md) registra pruebas
  aisladas y aceptación integral en Supabase local. No certifica producción ni
  pruebas adicionales de transacciones solapadas.
- **Portadas:** [spec 002](specs/002-event-cover-images/spec.md) implementada localmente.
  Su [validación](specs/002-event-cover-images/validation.md) registra aplicación de
  la migración el 2026-11-26, pruebas SQL y comprobaciones locales; no se repitieron
  durante esta actualización de memoria.
- **T049 sigue pendiente y a cargo del usuario**, según esa evidencia: integración
  real de aplicación/Storage, limpieza y persistencia completa. También quedan
  validación de recursos del hosting y revisión humana con lector de pantalla.
  No marcarla terminada por los tests aislados. La medida local de imágenes de
  36 MP recomienda 1 GiB por proceso finalizador y 60 segundos; no es un SLA.
- **Calendario:** `lib/dates.ts`, registro y gráfica usan `America/Guayaquil`, mientras
  la edición usa la zona del navegador. La constitución exige zona por evento y
  ventanas explícitas de registro e ingreso; el modelo actual no las incorpora.
- **Privacidad:** `/entradas/[code]` muestra nombre y email del asistente. La
  constitución prohíbe esos datos en vistas públicas accesibles por identificador.
- **Roles:** el check-in actual exige ser propietario; la constitución pide un rol
  de puerta por evento separado de edición y exportación.
- La constitución también exige caducidad de reservas sin email verificado; el
  registro actual emite la entrada sin un flujo de verificación/caducidad.

Registrar las correcciones de comportamiento en una especificación antes de
implementarlas. README y PRODUCT contienen descripciones históricas: por ejemplo,
ya existen check-in y reenvío. Verificar los módulos actuales al interpretar esas
descripciones. Esta actualización no cambia producto, constitución ni esquema.

## Verificación y mantenimiento

Para cambios documentales, revisar referencias y `git diff --check`. Para cambios
de código, elegir las pruebas del dominio después de revisar que no conecten a
servicios; con dependencias instaladas, los comandos locales habituales son:

```sh
./node_modules/.bin/tsc --noEmit --incremental false
npm run lint
node --test tests/ticket-type-errors.test.mjs tests/organizer-ticket-type.test.mjs
npm run test:e2e:list
```

Los comandos anteriores no se ejecutaron como parte de esta actualización, salvo
la revisión documental y de diff. Los resultados anteriores se consultan en sus
fuentes; no equivalen a una nueva ejecución.

Las vistas aisladas de portadas (puerto 3114) y formularios (3117) tienen pruebas
sin servicios reales; consultar [tests/e2e/README.md](tests/e2e/README.md) y el
[quickstart de portadas](specs/002-event-cover-images/quickstart.md) para iniciarlas.
El mismo puerto puede aparecer en otros escenarios: revisar el archivo y su
configuración, no decidir el aislamiento solo por la URL.

Cualquier comando que acceda a base de datos, incluso de lectura, y cualquier
instalación de dependencias requiere confirmación explícita según AGENTS.md.
Esto incluye pruebas conectadas y builds o páginas que consulten Supabase.
No ejecutar la suite E2E completa por defecto: sus escenarios opt-in pueden
persistir datos y enviar correo. El flujo real usa Resend y Mailosaur; requiere
entorno y alcance autorizados. Una variable opt-in no sustituye la confirmación.

Al mantener esta memoria, separar implementación, evidencia local, evidencia de
base de datos y pendientes; conservar fecha, fuente y límites de cada afirmación.
