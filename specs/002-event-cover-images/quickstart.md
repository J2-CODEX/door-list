# Guía de validación: portadas de eventos

Esta guía se ejecuta después de implementar [plan.md](plan.md). Los archivos de pruebas y rutas nuevos son entregables previstos: no existen por el hecho de generar el plan. Durante planificación no se han ejecutado migraciones, instalado dependencias ni probado persistencia.

## Prerrequisitos

- Node compatible con Next 16.4.5 y sharp 0.35.5; usar Node 22.18 o posterior compatible. Declarar sharp directamente durante implementación, con autorización antes de instalar.
- Leer [contrato API](contracts/api.md), [contrato UI](contracts/ui.md) y [modelo](data-model.md).
- Toda instalación y todo comando que acceda a una base de datos requieren confirmación explícita conforme a AGENTS.md, incluso lectura, build o servidor si sus rutas consultan datos.
- Usar datos ficticios y entorno de pruebas. No guardar tokens, datos de asistentes o permisos firmados en informes, trazas o capturas.

## Comprobaciones locales sin acceso a datos

Desde la raíz, después de implementar los entregables y revisar que los imports de pruebas no abren conexiones:

```sh
node_modules/.bin/tsc --noEmit --incremental false
npm run lint
node --test tests/event-cover-validation.test.mjs tests/event-cover-state.test.mjs tests/event-cover-api.test.mjs tests/event-cover-cleanup.test.mjs
```

Los cuatro archivos nuevos usan bytes y dobles de autenticación, persistencia y Storage. Esperado: límites inclusivos, detección de animación/corrupción, comparación de revisión, errores HTTP propios y limpieza repetible que conserve referencias vigentes e intenciones activas, sin red. No ejecutar indiscriminadamente todas las pruebas existentes: algunas consultan servicios.

En los contratos y sus pruebas, `EventCover.imageUrl` está siempre presente dentro de una portada: ruta pública propia para un evento público y `null` para uno privado. Sin portada, `cover:null`.

Después de añadir pruebas Playwright, listar sin iniciar servidor ni acceder a datos:

```sh
npm run test:e2e:list
```

## Fixtures y revisión visual aislada

Preparar fixtures fijos en `tests/fixtures/event-covers/` y un harness en `tests/fixtures/cover-preview/`, sin rutas productivas de demostración ni imports de clientes Supabase. Reutilizar los componentes reales y estilos; simular datos y peticiones. Cubrir las composiciones de cartelera y registro, no solo una imagen suelta. La importación del harness no debe disparar loaders reales.

Tras revisar ese aislamiento:

```sh
node_modules/.bin/next dev tests/fixtures/cover-preview --port 3114
```

En otra terminal, con ese servidor iniciado y sin banderas de base de datos:

```sh
E2E_BASE_URL=http://127.0.0.1:3114 node_modules/.bin/playwright test event-cover-ui.spec.mjs
```

Separar `event-cover-ui.spec.mjs` (fixtures sin red externa) de `event-cover-flow.spec.mjs` (integración real). La configuración existente no inicia servidores automáticamente.

| Escenario | Resultado esperado | Referencia |
| --- | --- | --- |
| Horizontal/vertical/cuadrada, marcas de centro y bordes | Marco 16:9, recorte centrado, círculo sin deformación | SC-001, FR-016 |
| Misma tarjeta con foto o marcador | Altura igual con mismo ancho y texto; tolerancia de marco de SC-001 | SC-001 |
| Imagen retrasada 5 s y fallo posterior | 0 px de desplazamiento de título, fecha, reserva y contenido posterior | SC-002 |
| Sin imagen o inaccesible | Marcador legible sin icono roto; error de consulta privada distinto de ausencia | SC-003, FR-007 |
| Blanca/negra/alto contraste/texto incrustado | Datos fuera de foto; contraste normal ≥4,5:1 y grande ≥3:1 | SC-004 |
| 375/1440 px y título largo | Sin desbordamiento u ocultación esencial; controles ≥48 px | SC-005 |
| 390×844 y 1280×900, texto al 200 %, teclado y movimiento reducido | Foco visible no oculto y sin animación de carga añadida | Contrato UI |
| Alternativa propia/vacía/espacios y cambio de título | Alternativa efectiva correcta en ambas páginas, marcador sin doble anuncio | SC-006 |
| Selección local, éxito, error, conflicto, sesión vencida e incertidumbre | Estados distinguibles, datos conservados y recuperación explícita | SC-007 |
| PATCH/DELETE sin respuesta y GET con cambio solicitado, revisión base sin cambio, otra revisión o fallo | Consulta de estado sin `uploadId`, anuncio neutral del estado coincidente, borrador conservado y reintento solo explícito; conflicto si cambió la imagen o revisión sin el efecto solicitado | SC-007, contrato API |

Revisar el resultado renderizado con `impeccable` y `door-list-ui`, aplicando PRODUCT.md y DESIGN.md. Registrar capturas por estado/ancho, medidas, contraste y evaluación de teclado/lector de pantalla. Distinguir evidencia automatizada de evaluación humana; ejecutar pruebas no marca `checklists/ux.md` como aprobada.

## Validación del archivo original

Fixtures estáticos válidos JPEG/PNG/WebP; variar ancho y alto por separado: 599/600/6000/6001 px. Cubrir 5 242 879/5 242 880/5 242 881 bytes. Las muestras exactas deben ser contenedores válidos, no relleno que corrompa la imagen. Añadir cero bytes, extensión renombrada, datos de píxeles truncados, APNG, WebP animado, EXIF rotado y transparencia.

Esperado: decisiones de FR-015 y portada previa conservada ante rechazo. Medir memoria y tiempo con 6000×6000 px y concurrencia limitada; ajustar recursos del entorno sin reducir límites de producto.

## Entorno real autorizado

Este apartado requiere confirmación explícita antes de cada acceso a base de datos o una autorización de alcance que lo cubra. Preparar y revisar la migración antes de solicitar su aplicación. Si falta sharp directo, presentar la instalación concreta para autorización; no instalarlo como efecto lateral de ejecutar la guía.

Configurar mediante gestor de secretos `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY` (solo servidor). Usar organizador y segundo usuario controlados del proyecto de pruebas, conforme a `tests/e2e/.env.example` y `tests/e2e/README.md`.

Aplicar la migración de portada con el procedimiento autorizado del proyecto. Verificar RLS/grants con el archivo previsto `tests/event-covers-rls.sql`; ejecutarlo también es acceso a datos. No usar SQL suelto ni borrar `storage.objects` mediante SQL.

Tras autorizar el entorno y revisar scripts:

```sh
npm run dev
```

En otra terminal, con E2E configurado para el mismo entorno:

```sh
RUN_E2E_DB_TESTS=1 node_modules/.bin/playwright test event-cover-flow.spec.mjs
```

La prueba debe negarse a ejecutar sin esa bandera y configuración de pruebas. No capturar credenciales ni códigos de entradas.

## Escenarios de persistencia y seguridad

1. Crear sin imagen, conservando condiciones de publicación. Crear con selección local: obtener ID una vez, mantener panel abierto y guardar portada explícitamente; fallo de imagen no duplica evento.
2. Guardar formatos válidos y alternativas propias/derivadas; reabrir gestión y nuevas visitas a cartelera/registro: mismo estado vigente desde commit, sin republicar.
3. Sustituir, editar solo descripción y quitar: persistencia, revisión nueva, tombstone y demás datos conservados.
4. Fallos de Storage antes del commit conservan la portada anterior; fallo de limpieza posterior conserva el éxito y se recupera mediante mantenimiento.
5. Perder respuesta al confirmar una subida: consultar operación por `uploadId`, reconciliar y repetir finalización sin segunda escritura. Claims invalidados o vencidos no pueden confirmar. Repetir la pérdida de respuesta por separado en PATCH y DELETE: consultar estado actual, sin `uploadId`, y cubrir los cuatro resultados del [contrato API](contracts/api.md#recuperación-de-patch-y-delete-sin-respuesta), incluido mismo texto en imagen distinta y otra sesión que realiza el mismo cambio. Una revisión base aún vigente permite reintento explícito con la revisión original; retrasar la petición original y comprobar que como máximo una mutación efectiva confirma. Si la consulta falla, conservar datos y deshabilitar mutaciones hasta recuperarla; no presentar el resultado incierto como éxito ni fallo definitivo.
6. Dos sesiones con misma revisión: una confirma, otra recibe 409 conservando selección. Usuario ajeno, sesión caducada o rol solo de puerta: 0 mutaciones.
7. Escritura directa de metadatos por PostgREST o canónicos desde navegador: rechazada. Permiso firmado solo alcanza staging asignado.
8. Bytes públicos de borrador, referencia vieja o evento privado: 404; cambios de visibilidad se aplican a nuevas peticiones. No se exige retirar bytes ya descargados.
9. Publicación, disponibilidad, reserva y entradas producen los mismos resultados antes/después de añadir, sustituir, quitar o fallar una imagen (SC-008).
10. Barrido autorizado de huérfanos >3 horas: conserva referencias actuales y operaciones activas, cubre objetos de eventos eliminados y subidas tardías antes de caducar el token de 2 horas; repetir no pierde datos.

## Evidencias y límites

Registrar comandos, entorno autorizado, resultados por SC-001–009 y pendientes. Revisar si el build consulta datos antes de ejecutarlo. Revertir la aplicación puede dejar tablas y buckets sin uso; no borrar datos para revertir una versión. Esta guía no acredita conformidad del despliegue actual ni pruebas ya realizadas.

## Documentación y dependencias verificadas en implementación

Next.js 16.4.5, React 19.3.1, TypeScript 5.9.3, Supabase JS 2.119.0 y sharp 0.35.5.
Se consultaron los archivos oficiales distribuidos en `node_modules/next/dist/docs/`:
`01-app/03-api-reference/03-file-conventions/route.md` (params asíncronos y handlers),
`02-components/image.md` (fill, unoptimized, onError),
`03-file-conventions/02-route-segment-config/runtime.md` y
`05-config/01-next-config-js/serverActions.md`. Las portadas usan Route Handlers
con JSON y transferencia directa; no dependen del límite de Server Actions.
Sharp quedó declarado directamente y package-lock actualizado con autorización.

## Estado de implementación y operación

La migración `20261125120000_event_cover_images.sql` está aplicada en producción;
no volver a editarla ni aplicarla como SQL suelto. La implementación local y sus
validaciones están descritas en [validation.md](validation.md). T049 requiere un
entorno real configurado y autorización nueva de alcance antes de ejecutar.

Configuración de servidor: añadir `SUPABASE_SECRET_KEY` (clave `sb_secret_` de Settings → API Keys → Secret keys; se admite `SUPABASE_SERVICE_ROLE_KEY` como fallback) al gestor de secretos
(o `.env.local` ignorado para desarrollo autorizado), sin prefijo público y sin
incluirla en navegador, logs o informes. Las rutas validan configuración al usarse,
no conectan al importar. Los E2E requieren además `E2E_TEST_PROJECT_REF` y dos
organizadores en `tests/e2e/.env.local`; la bandera opt-in no concede autorización.

Generar los binarios locales antes del harness o los E2E:

```sh
node tests/fixtures/event-covers/generate.mjs
```

Los binarios derivados y el `.next` del harness se ignoran. La compilación de
estilos del harness declara fuentes explícitas para reutilizar los controles
reales. No contiene rutas de demostración productivas.

Medición local aislada de 36 MP: 165 ms y RSS máximo 471584 KiB (~461 MiB),
con rechazo recuperable de otra decodificación simultánea. La suite con generación
alcanzó ~573 MiB. Reservar **1 GiB por proceso finalizador y 60 segundos** en el
hosting; comprobar allí imágenes representativas y concurrencia real. No reducir
los límites de 5 MiB o 6000 px para ajustarse a un presupuesto insuficiente.

Después de autorizar explícitamente el entorno y alcance de mantenimiento,
con variables de servidor disponibles en el proceso:

```sh
CONFIRM_EVENT_COVER_CLEANUP=1 node scripts/cleanup-event-covers.mjs --dry-run
CONFIRM_EVENT_COVER_CLEANUP=1 node scripts/cleanup-event-covers.mjs
```

El dry-run no elimina ni purga; su comprobación de elegibilidad sí puede invalidar
claims vencidos en la base. La ejecución normal lista ambos buckets, espera más de
3 horas por objeto, verifica referencias y elimina mediante Storage; luego purga
resultados terminales de más de 24 horas sin staging restante. No se ejecutó ni
se programó este mantenimiento. Programarlo diariamente es una operación posterior
que debe cubrir autorización de base de datos y Storage, secretos del servidor,
solapamiento de ejecuciones y revisión de resultados sin publicar rutas/tokens.

Orden de despliegue: migración (ya aplicada) → secretos/recursos de runtime →
aplicación → validación autorizada → eventual programación de mantenimiento.
Revertir la aplicación conserva tablas y buckets; no borrar datos para revertir.
