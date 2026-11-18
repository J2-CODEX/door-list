# Control de puerta

`/scan` requiere la sesión del organizador y permite controlar sus eventos publicados. Desde el detalle del evento, «Abrir control de puerta» lleva el evento seleccionado. No se han añadido cuentas o roles separados de staff.

La cámara trasera lee el código opaco generado por `qrcode`, mediante `qr-scanner` 1.4.2. El motor alternativo se carga como un chunk desde el paquete; no depende de un CDN. La cámara y el worker se destruyen al abandonar la lectura. El ingreso manual sigue disponible cuando falla el permiso, el dispositivo o HTTPS.

Una lectura bloquea nuevas solicitudes hasta que se pulsa «Escanear otra entrada». El servidor confirma y registra el ingreso en una operación de base de datos, con bloqueo de la entrada para serializar escaneos simultáneos. Guarda `checked_in_at` y `checked_in_by`. Solo responde «Válida / Puede ingresar» después de confirmar la escritura. Una segunda lectura responde «Usada». Los códigos inexistentes, de otro evento o revocados muestran «No encontrada» y no permiten ingresar. Los errores de red muestran «Sin confirmar» y requieren revisar o reintentar; nunca autorizan el ingreso.

El panel muestra el total de ingresos y el estado y hora por registro. Se actualiza cada 15 segundos mientras está visible y al recuperar el foco; también conserva su botón de actualización manual. Los ingresos históricos con estado `used` cuentan en el total aunque no tengan hora.

## Puesta en marcha

Aplicar `supabase/migrations/20261118120000_ticket_check_in.sql` antes de desplegar el código consumidor. Instalar dependencias y acceder a la base de datos requiere la confirmación explícita de `AGENTS.md`.

Comprobaciones locales sin base de datos: `node --test tests/check-in.test.mjs tests/dashboard.test.mjs tests/attendees.test.mjs tests/dashboard-query.test.mjs`; `npm run build`; `npm run lint`.

`tests/check-in.sql` comprueba autorización, evento incorrecto, revocación, persistencia, relectura y privilegios dentro de una transacción que termina en rollback. Ejecutarlo solo con autorización explícita. La comprobación real de concurrencia requiere enviar el mismo código de una entrada de prueba desde dos dispositivos a la vez y verificar una sola respuesta válida y un solo ingreso.

## Interfaz y prueba de dispositivos

Se mantienen los colores, la fuente y las primitivas de Door List. `Button size="scan"` define controles de 64 px y texto de 16 px para uso con una mano. Los resultados usan texto de 48 px, icono y una instrucción explícita; el significado no depende del color. Las acciones inferiores respetan el área segura del teléfono. No se añaden animaciones.

Antes de usar en puerta, comprobar por HTTPS en Safari de iPhone y Chrome de Android: cámara trasera y alternativa, permiso denegado, lectura real y carga del worker, linterna si está disponible, salida y regreso desde segundo plano, mala conexión, escaneos simultáneos y actualización del panel en otro dispositivo. Revisar 390 × 844 y 1280 × 900, texto largo, zoom y teclado. Una compilación o una prueba con cámara simulada no verifica la lectura física a contraluz.
