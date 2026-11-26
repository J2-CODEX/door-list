# Validación de portadas de eventos

## Alcance ejecutado: base de datos

Fecha: 2026-11-26. Proyecto Supabase `door-list` (`aagediqdfxnyxzeqebzr`),
entorno **production**. El usuario autorizó consultar la base de datos y después
solicitó explícitamente ejecutar la migración de portadas.

Se creó y aplicó `supabase/migrations/20261125120000_event_cover_images.sql`.
No se modificaron migraciones anteriores. No hubo backfill de imágenes ni
instalación de dependencias, despliegue de aplicación o programación de limpieza.

Comprobaciones ejecutadas:

- Inspección de la función remota `get_public_registration_event`: coincidía con
  la versión local previa. No existían tablas, funciones ni buckets de portadas.
- Ejecución de la migración y `tests/event-covers-rls.sql` en una misma transacción
  con rollback, antes de aplicar el cambio definitivo: PASS.
- `supabase db push --remote=aagediqdfxnyxzeqebzr --dry-run --skip-vault`:
  únicamente pendiente `20261125120000_event_cover_images.sql`.
- `supabase db push --remote=aagediqdfxnyxzeqebzr --skip-vault --yes`: PASS.
- `supabase db query --remote=aagediqdfxnyxzeqebzr --file tests/event-covers-rls.sql --yes`:
  PASS, con rollback de todos los datos ficticios.
- Verificación posterior de catálogo: migración registrada, dos tablas con RLS,
  dos buckets privados y diez funciones internas ejecutables por `service_role`,
  sin EXECUTE para `anon` ni `authenticated`. Cero usuarios y eventos ficticios
  remanentes de las pruebas.

Las pruebas SQL verifican propiedad, límites de entrada declarados, grants de
columnas, ocultación de paths, lectura pública/privada, denegación de escritura
directa y RPC administrativa a clientes, claim exclusivo, commit idempotente,
resultado durable frente a una edición posterior, conservación ante conflicto,
invalidación de claims vencidos, candidato nuevo al reintentar, rechazo terminal,
normalización de descripción, tombstone y retención de resultados recientes.
Los escenarios de revisión y claim simulan intercalaciones secuencialmente; no
constituyen una prueba de carga ni de concurrencia con varias conexiones.

Continuidad de reservas comprobada con datos ficticios: disponibilidad inicial
10; después de un registro, 9. Se conserva la proyección previa, el filtro de
publicación y el calendario heredado de `get_public_registration_event`.

## Interfaz SQL para la implementación posterior

Las funciones administrativas devuelven resultados internos con `code`;
`start_event_cover_upload` y `claim_event_cover_upload` incluyen la fila de
persistencia en `upload`. El servicio debe traducir sus campos a camelCase y
exponer solo los campos del contrato HTTP, nunca rutas internas o claims.
`p_owner_id` siempre procede del usuario autenticado por el servidor.

La finalización usa `commit_event_cover_upload`, que publica el candidato del
claim vigente. El servidor debe validar y almacenar el WebP antes de invocarla.
`finish_event_cover_upload` acepta `pending` ante un fallo transitorio o `rejected`
ante bytes inválidos. `p_replace_alt_text` distingue una descripción omitida de
una edición explícita al confirmar.

El mantenimiento debe listar objetos por la API de Storage, consultar
`is_event_cover_cleanup_candidate(bucket, path)` y eliminar únicamente los
candidatos aceptados mediante esa misma API. Esta función comprueba la edad real
del objeto, invalida claims vencidos y protege referencias vigentes. Después del
barrido puede invocarse `purge_event_cover_uploads(event_id)`, que conserva los
resultados terminales al menos 24 horas y no los purga si queda staging asociado.
No se ejecutó ni se programó eliminación de objetos.

## Implementación local completada

Se implementaron las rutas de estado, intención, operación, confirmación, descripción,
eliminación y entrega privada/pública de bytes; adaptador administrativo con
`server-only`, límites de descarga, validación completa con sharp y coordinación
mediante las funciones ya aplicadas. Los errores HTTP son propios y los cuerpos
JSON se acotan a 64 KiB sin truncarlos.

El editor conserva selección y descripción ante error/conflicto, guarda la portada
aparte de los demás datos, mantiene el ID del evento tras crearlo y reconcilia
resultados inciertos. PATCH/DELETE conservan revisión base y borrador; coincidencia
consultada no se presenta como autoría del guardado. Una pérdida de sesión dentro
del panel permite recuperarla sin desmontar su borrador. Las URLs Blob se revocan.

La cartelera usa una única consulta con relación explícita de metadatos y el
registro conserva su RPC dinámico. Ninguna lectura de datos espera a Storage.
El marco compartido conserva geometría y usa imagen sin optimizador compartido.
La limpieza está implementada con transportes inyectables; no se ejecutó contra
Storage ni se programó. No se hizo despliegue de aplicación.

## Comprobaciones locales finales

- `node_modules/.bin/tsc --noEmit --incremental false`: PASS.
- `npm run lint`: PASS, sin errores ni advertencias del código del proyecto.
- `node --test tests/event-cover-validation.test.mjs tests/event-cover-state.test.mjs tests/event-cover-api.test.mjs tests/event-cover-cleanup.test.mjs`:
  PASS, **71 pruebas**, sin conexiones.
- `E2E_BASE_URL=http://127.0.0.1:3114 node_modules/.bin/playwright test event-cover-ui.spec.mjs`:
  PASS, **23 pruebas** de componentes reales en el harness aislado.
- `node_modules/.bin/playwright test --list`: PASS, **35 escenarios** listados
  en cinco archivos; cuatro corresponden a integración de portadas opt-in.
- `git diff --check`: PASS.
- Detector de Impeccable sobre los cinco componentes de presentación cambiados:
  `[]`, sin hallazgos mecánicos. No se sustituyó por una aprobación de UX.

El listado Playwright no inicia servidor ni ejecuta hooks de integración. Las
pruebas UI bloquean red externa y exigen el puerto 3114; las reales exigen
`RUN_E2E_DB_TESTS=1`, configuración completa y coincidencia de proyecto explícita.
El servidor aislado no importa loaders ni clientes Supabase. Sus composiciones
reutilizan la tarjeta, el resumen y el editor del producto.

Node informa el aviso heredado de detección de módulos al importar TypeScript
porque el paquete no declara `type: module`; no se cambió el modo de módulos de
todo el proyecto como efecto lateral.

## Evidencia visual y accesibilidad

Se inspeccionaron las composiciones renderizadas a 375/1440 px y se comprobaron
390×844/1280×900 px automáticamente. Capturas locales de datos ficticios en
`.impeccable/review/`: `mobile.png`, `desktop.png`, `editor-mobile.png`,
`editor-desktop.png` y `enlarged.png`. No incluyen credenciales ni datos reales.
Las regiones blanca/negra son fixtures de contraste intencionales.

Las pruebas verifican proporción 16:9 con tolerancia de 1 px, cero desplazamiento
tras retraso de 5 segundos y fallo, circunferencia sin deformación y centro con
píxeles del fixture, alternativas propias/derivadas, ausencia sin imagen ficticia,
conservación de campos, foco al quitar, teclado, controles de 48 px, texto al 200 %
y movimiento reducido. Se corrigieron foco, ajuste de títulos/botones y contraste
de las ayudas nuevas mediante variante explícita de la primitiva.

La revisión independiente emitió **disposition: ship** para estas composiciones.
El tipo especializado de agente no estaba registrado; un revisor general en
contexto fresco aplicó `impeccable/reference/degraded/finish-reviewer.md` y abrió
las cinco capturas. El overlay de desarrollo no oculta controles de portada.
No se certifica el Sheet completo conectado, uso humano con lector de pantalla
ni conformidad global. PRODUCT.md y DESIGN.md se conservaron; se documentó el
patrón nuevo en la referencia canónica del skill de UI.

## Recursos

Fixture estático de 6000×6000 px (36 MP): procesamiento aislado observado de
**165 ms**, máximo RSS **471584 KiB** (~461 MiB). Una segunda petición simultánea
recibió 503 recuperable; se procesa una imagen por proceso. La suite completa,
incluida generación de fixtures, alcanzó aproximadamente 573 MiB.

Presupuestar **1 GiB por proceso finalizador**, no solo el mínimo de 512 MiB del
plan, y duración de 60 segundos. Son medidas locales de un fixture uniforme,
no un SLA ni una medición de tráfico o hosting. La validación con imágenes
representativas y recursos del proveedor sigue siendo parte del despliegue.

## Trazabilidad y pendiente real

| Requisitos/criterios | Evidencia | Límite |
| --- | --- | --- |
| FR-001–007, SC-007 | editor, servicio, contratos Node, pruebas UI y SQL | subida/reapertura reales pendientes |
| FR-008–013, FR-016, SC-001–006 | marco, tarjeta, resumen, píxeles, geometría, alternativas, revisión independiente | lector de pantalla humano pendiente |
| FR-014, SC-008 | filtro/calendario conservados y continuidad SQL de disponibilidad 10→9 | E2E de reserva/entrada con portadas pendiente |
| FR-015 | fixtures reales y 24 pruebas de validación | recursos de hosting pendientes |
| FR-017, SC-009 | revisión/claim SQL, reconciliación UI y resultados durables | concurrencia y nuevas visitas reales pendientes |

**T049 sigue pendiente y queda a cargo del usuario**, por decisión expresa. Ya se aplicó la migración y se verificó SQL con
rollback, pero falta ejecutar integración real de aplicación/Storage, limpieza
y escenarios completos de persistencia. Faltan en la configuración local
`SUPABASE_SERVICE_ROLE_KEY`, `E2E_TEST_PROJECT_REF` y las credenciales de los dos
organizadores de prueba. No solicitar ni guardar estos valores en el chat.
La autorización previa cubría consultar/aplicar la migración, no estos escenarios.

Los cuatro E2E reales están preparados para alta única con selección, reapertura,
formatos/límites, alternativa, visibilidad, sustitución/eliminación, carrera entre
dos sesiones, permisos directos y continuidad de disponibilidad/entrada/check-in.
Crean únicamente fixtures identificados y su teardown elimina sus objetos,
entradas, registros y eventos. El envío de email sigue cubierto por el escenario
existente `event-flow.spec.mjs`, con su configuración propia.

Los marcadores de `checklists/ux.md` permanecen intactos: el usuario autorizó
continuar con sus 38 criterios pendientes, sin aprobarlos automáticamente.
Cualquier ejecución futura contra datos requiere la confirmación de AGENTS.md.

Desplegar la aplicación después de esta migración. Una reversión de aplicación
puede dejar tablas/buckets sin uso; no borrar datos ni reescribir la migración
aplicada. Cualquier corrección de esquema exige otra migración versionada.


## Corrección de placeholders y consulta de estado — 2026-11-26

La revisión encontró que el refinamiento visual ocultaba el marco público cuando
no había portada, aunque FR-010 exige un marcador. La cartelera y el registro
vuelven a mostrarlo. Las listas de gestión, el dashboard y su detalle incorporan
portadas o placeholders; los borradores descargan imágenes con la sesión del
propietario. La lista de gestión se actualiza al confirmar cambios de portada.

En la configuración local falta `SUPABASE_SERVICE_ROLE_KEY`. El GET de estado
inicializaba el adaptador privilegiado incluso para un evento sin imagen y
respondía 503 antes de leer metadatos. Ahora usa el cliente del propietario
verificado, con RLS, filtro de propietario y columnas explícitas sin paths.
Los errores de lectura siguen siendo errores; no se convierten en portada vacía.
Storage y mutaciones siguen requiriendo configuración de servidor, documentada en
`.env.example` y README. No se añadieron fotografías a los eventos existentes.

Verificación sin base de datos:

- TypeScript sin emisión, ESLint sobre archivos afectados y `git diff --check`: correctos.
- Pruebas Node de API, estado y limpieza: 50 correctas.
- Pruebas Node de dashboard y sus consultas: 17 correctas.
- Playwright `event-cover-ui.spec.mjs` contra la vista aislada en 3114: 30 correctas,
  incluidos placeholders públicos, imágenes privadas con Bearer, fallo 503,
  geometría 16:9, teclado, texto ampliado y movimiento reducido.
- Inspección visual de capturas ficticias a 390×844 y 1280×900; marco vacío,
  miniatura, imagen privada y fallback coherentes con la paleta existente.

Se consultó la documentación oficial incluida con Next.js 16.4.5 y la
documentación oficial de Supabase mediante Context7. No se ejecutaron consultas,
migraciones, subidas reales ni instalaciones. T049 conserva sus pendientes.


## Compatibilidad con Secret keys de Supabase — 2026-11-26

La configuración recomendada pasa a `SUPABASE_SECRET_KEY` (`sb_secret_...`),
visible en Settings → API Keys → Secret keys. Se mantiene
`SUPABASE_SERVICE_ROLE_KEY` como fallback; si existen ambas, se prefiere la nueva.
La descarga acotada de Storage envía la clave nueva únicamente en `apikey`,
conservando Bearer para las claves JWT legacy. Cliente administrativo, limpieza
e integración optativa admiten la configuración nueva.

Se consultaron la guía oficial de migración de claves y el SDK instalado
`@supabase/supabase-js` 2.119.0. Ocho pruebas nuevas ejecutan el adaptador y SDK
con fetch simulado: claves nuevas, legacy, precedencia, consultas, subidas,
descarga, límite de bytes y ausencia de configuración. Las 58 pruebas locales
de Storage, API, estado y limpieza pasan. TypeScript y ESLint de los archivos
afectados pasan. No se usaron claves reales ni se accedió a Supabase.
