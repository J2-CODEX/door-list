# Generación y lectura de códigos QR

Fecha del análisis: 17 de noviembre de 2026.

Estado: recomendación técnica para una implementación posterior. Este análisis no incorpora cambios de código ni instala dependencias.

## Recomendación

Conservar `qrcode` para generar los QR en el servidor y utilizar `qr-scanner` para leerlos desde la cámara del navegador.

La recomendación se basa en la documentación consultada, el alcance de Door List y la implementación existente. No se realizaron pruebas comparativas de velocidad, precisión o compatibilidad en dispositivos reales.

## Documentación consultada

Se utilizó MCP Context7 para resolver las cuatro bibliotecas y consultar la documentación de `qrcode`, `bwip-js` y `qr-scanner`. Para `html5-qrcode` se consultaron directamente la documentación y el repositorio oficiales actuales.

Identificadores de Context7:

- `qrcode`: `/soldair/node-qrcode`.
- `bwip-js`: `/metafloor/bwip-js`.
- `qr-scanner`: `/nimiq/qr-scanner`.
- `html5-qrcode`: `/mebjas/html5-qrcode`.

Las capacidades y los avisos de mantenimiento reflejan las fuentes consultadas en la fecha del análisis. Revisarlos antes de implementar, especialmente si ha transcurrido tiempo.

## Generación en el servidor

| Opción | Capacidades documentadas | Cuándo elegirla |
| --- | --- | --- |
| `qrcode` | PNG como `Buffer`, Data URL y SVG. Admite promesas y configuración de corrección de errores. | Generación de QR para entradas, páginas y correos. |
| `bwip-js` | PNG y SVG; más de 100 formatos de códigos. Dispone de un paquete específico para Node: `@bwip-js/node`. | Cuando también se necesiten Code 128, Data Matrix u otros formatos. |

### Elección: qrcode

La versión instalada al realizar el análisis era `1.5.4`. El proyecto ya genera QR en el servidor:

- En [la página pública de entrada](../app/entradas/[code]/page.tsx), mediante `QRCode.toDataURL(ticket.code, ...)`.
- En [el correo de entrada](../lib/email/ticket-email.ts), mediante `QRCode.toBuffer(ticket.code, ...)`, como PNG adjunto.

`qrcode` cubre el requisito actual sin migrar la implementación existente. `bwip-js` aportaría valor si Door List necesitara generar otros formatos de códigos.

Fuentes oficiales:

- [node-qrcode: documentación y API](https://github.com/soldair/node-qrcode#api).
- [bwip-js: documentación y paquetes por plataforma](https://github.com/metafloor/bwip-js#installation).
- [bwip-js: referencia de métodos](https://github.com/metafloor/bwip-js/wiki/Methods-Reference).

## Lectura desde la cámara del navegador

| Opción | Capacidades documentadas | Consideraciones |
| --- | --- | --- |
| `qr-scanner` | Lectura sobre un elemento `<video>`, preferencia de cámara trasera, límite de escaneos y limpieza con `destroy()`. Usa `BarcodeDetector` cuando está disponible y dispone de un motor con Web Worker como alternativa. | Requiere construir los controles y estados de la interfaz, y verificar que el worker se publique correctamente. |
| `html5-qrcode` | Interfaz lista con `Html5QrcodeScanner` o controles propios con `Html5Qrcode`. Admite QR y otros códigos, cámara e imágenes. | El repositorio anuncia que el autor temporalmente no hará correcciones ni mejoras ni integrará PR. |

### Elección: qr-scanner

Door List necesita leer QR de entradas y puede integrar los controles en su propia interfaz. El control de frecuencia de escaneo y la liberación de recursos de `qr-scanner` resultan útiles para una sesión continua de lectura.

El aviso de mantenimiento de `html5-qrcode` también pesa en esta decisión. Esta recomendación no implica que `qr-scanner` tenga una detección superior: eso requiere probar ambas opciones con los dispositivos y condiciones de uso previstos.

Fuentes oficiales:

- [qr-scanner: documentación, configuración y ciclo de vida](https://github.com/nimiq/qr-scanner#readme).
- [html5-qrcode: guía de inicio y APIs de cámara](https://scanapp.org/html5-qrcode-docs/docs/intro).
- [html5-qrcode: aviso de mantenimiento y búsqueda de responsables](https://github.com/mebjas/html5-qrcode#html5-qrcode).

## Flujo recomendado para la implementación

1. El servidor genera el QR con `ticket.code`.
2. El navegador utiliza la cámara para decodificar su contenido.
3. El navegador envía el código al servidor para validar la entrada y registrar el ingreso.

La lectura del QR solo recupera su contenido. La validez de la entrada y el permiso de ingreso deben decidirse en el servidor.

Al implementar:

- Servir la aplicación mediante HTTPS y solicitar permiso de cámara al iniciar la lectura.
- Preferir la cámara trasera, contemplando que el dispositivo puede no satisfacer esa preferencia.
- Liberar la cámara y el worker al salir del lector.
- Evitar solicitudes repetidas mientras se procesa una lectura.
- Hacer atómica la validación y el registro de uso para impedir dos ingresos simultáneos con la misma entrada.
- Probar la cámara y la lectura en los navegadores y dispositivos objetivo, incluyendo el despliegue de producción y la carga del worker.
- Mantener una alternativa de ingreso manual del código cuando la cámara no esté disponible.

Antes de instalar una dependencia o ejecutar comandos que accedan a una base de datos, solicitar la confirmación explícita requerida por `AGENTS.md`.
