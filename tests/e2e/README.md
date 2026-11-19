# Flujo E2E real

La prueba `event-flow.spec.mjs` recorre la aplicación en Chromium: iniciar sesión, crear un evento como borrador, comprobar que no admite registros públicos, crear un tipo de entrada, publicar, registrarse desde una sesión anónima, recibir el correo y escanear su QR. Comprueba que consultar la entrada no la consume, que el check-in persiste y que volver a escanear devuelve 409 y «Usada».

La entrega se verifica en un buzón real de Mailosaur, no mediante `emailStatus: sent`. El PNG recibido alimenta un `MediaStream` de canvas en lugar de una cámara física. Se ejecutan el decodificador `qr-scanner`, la autenticación, las APIs, Resend y las transacciones reales. No se interceptan ni simulan respuestas de la aplicación.

## Preparación

Solicita confirmación explícita antes de instalar dependencias y antes de ejecutar el flujo contra una base de datos, como exige `AGENTS.md`. Listar o comprobar la sintaxis de las pruebas no accede a la base de datos.

Tras autorizar la instalación, si aún no están disponibles:

```sh
npm install --save-dev @playwright/test
npx --no-install playwright install chromium
```

Usa un proyecto Supabase de pruebas con las migraciones aplicadas y una cuenta de organizador exclusiva. No se necesita una clave de servicio. La aplicación debe apuntar a ese proyecto y tener configurados Resend con remitente verificado y un dominio capaz de enviar al buzón de pruebas. `onboarding@resend.dev` no sirve para destinatarios Mailosaur arbitrarios. En desarrollo elimina `RESEND_TEST_TO_EMAIL` para que la redirección local no desvíe los mensajes.

La suite requiere un buzón Mailosaur existente. Usa su API key y server ID; se invoca su API HTTPS directamente, sin instalar un SDK. El destinatario aleatorio de cada ejecución pertenece a `<serverId>.mailosaur.net`. Si se cambia de proveedor de buzón, adapta únicamente `support/inbox.mjs`, conservando las comprobaciones de recepción y del adjunto.

Configura estas variables en el proceso que lanza Playwright, mediante tu gestor de secretos o un archivo local ignorado `tests/e2e/.env.local`. Puedes copiar `tests/e2e/.env.example`: la configuración carga automáticamente ese archivo local, conservando las variables ya definidas en el proceso. Requiere Node 22.18 o superior. No carga el `.env` de la aplicación ni inicia servidores.

| Variable | Uso |
| --- | --- |
| `E2E_BASE_URL` | URL del servidor de pruebas; predeterminada `http://127.0.0.1:3000`. Usa HTTPS fuera de localhost para la cámara. |
| `E2E_ORGANIZER_EMAIL` | Correo del organizador exclusivo de pruebas. |
| `E2E_ORGANIZER_PASSWORD` | Contraseña del organizador de pruebas. |
| `MAILOSAUR_SERVER_ID` | ID del buzón controlado de pruebas. |
| `MAILOSAUR_API_KEY` | Clave para consultar el buzón y descargar el adjunto. |
| `RUN_E2E_DB_TESTS` | `1` únicamente después de confirmar el acceso a la BD y el envío de correo. |

## Ejecución

Arranca la aplicación por separado contra el proyecto autorizado. Se recomienda el servidor de producción (`npm run build`, después `npm run start`) para reproducir el comportamiento del despliegue. La configuración Playwright no inicia servidores ni elige una BD implícitamente.

```sh
# Descubrimiento de pruebas; no abre navegador, BD ni buzón.
npm run test:e2e:list

# Verifica únicamente cámara de canvas + decodificador QR real, sin BD ni correo.
npm run test:e2e:camera

# Solo después de la autorización y con todas las variables configuradas.
RUN_E2E_DB_TESTS=1 npm run test:e2e
```

Sin `RUN_E2E_DB_TESTS=1`, el flujo con BD se omite antes de abrir el navegador y solo se ejecuta la comprobación local de cámara. Con el opt-in y sin credenciales falla antes de navegar, indicando las variables pendientes. Hay un trabajador y cero reintentos para evitar duplicar registros o envíos. La espera del correo tiene un límite de 90 segundos; un fallo de entrega produce un fallo de prueba.

Cada ejecución usa un título y correo únicos. Los eventos, tipos de entrada, registros, entradas usadas y mensajes permanecen en el entorno de pruebas para inspección; no hay borrado automático ni SQL que desactive restricciones. Desecha o reinicia el entorno aislado según tu procedimiento habitual. No ejecutes la suite contra producción. Las capturas, vídeos y trazas están deshabilitados; `preserveOutput: "never"` elimina también los artefactos automáticos de contexto de error al terminar cada prueba, para evitar conservar datos de asistentes y entradas.

Referencias: [Next.js 16.4.5 y Playwright](https://github.com/vercel/next.js/blob/v16.4.5/docs/01-app/02-guides/testing/playwright.mdx), [Playwright Test](https://playwright.dev/docs/test-intro), [API de Mailosaur](https://mailosaur.com/docs/api).
