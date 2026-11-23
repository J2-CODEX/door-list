# Quickstart: Validar la corrección del mensaje de aforo

El helper y las pruebas focalizadas están implementados. Las pruebas aisladas, análisis estáticos, revisión visual y aceptación contra base local aislada están aprobados y registrados al final. La planificación inicial no ejecutó pruebas ni acreditó persistencia real.

## Requisitos

- Checkout del repositorio con la feature activa `specs/001-fix-ticket-type-capacity` y las dependencias ya instaladas. La planificación se generó en la rama Git `main`; no se creó una rama con el nombre de la feature.
- Leer [contracts/ticket-type-capacity.md](contracts/ticket-type-capacity.md) y [data-model.md](data-model.md).
- Revisar el contenido de cada prueba antes de ejecutarla. Las pruebas focalizadas deben sustituir todos los transportes y la autenticación, sin usar variables de conexión reales.
- Si falta una dependencia, solicitar confirmación antes de instalarla. No emplear npx con descarga implícita.

## Comprobaciones aisladas

Desde la raíz del repositorio, después de implementar:

```bash
node --test tests/ticket-type-errors.test.mjs tests/organizer-ticket-type.test.mjs
./node_modules/.bin/tsc --noEmit --incremental false
./node_modules/.bin/eslint app/organizador/page.tsx lib/ticket-type-errors.ts tests/ticket-type-errors.test.mjs tests/organizer-ticket-type.test.mjs
```

Resultados esperados:

- Pareja de mínimo → texto exacto de FR-002.
- Pareja de máximo → texto propio de límite del evento.
- 23514 desconocido, permisos, red o mensaje conocido con código distinto → fallback propio sin texto crudo, details o hint.
- Una respuesta PostgREST de error con fetch simulado se interpreta correctamente por el SDK y el helper, sin conexiones de red.
- El formulario conserva nombre y aforo al rechazar; sigue abierto, anuncia el error y no confirma guardado ni refresca eventos.
- Un rechazo tardío simulado conserva el valor escrito y presenta el mensaje correcto. Después, un reintento exitoso limpia el error y completa el flujo; no se envía dos veces mientras está pendiente.

Estas pruebas acreditan traducción y flujo de UI. No prueban el conteo ni la exclusión mutua real de PostgreSQL. No sustituir esta verificación por una prueba que solo busque textos en los archivos fuente.

## Revisión de interfaz con datos ficticios

Usar un harness aislado o transporte completamente interceptado antes de cargar la ruta; no visitar una sesión conectada a servicios reales sin autorización. Reutilizar Notice, Input y el diálogo existente.

A 390 × 844 y 1280 × 900 comprobar mensaje largo sin desbordamiento, visibilidad del error, conservación de valores, ayuda y asociación accesible del campo Aforo, teclado, foco y reintento. Con movimiento reducido se mantiene el comportamiento existente. No añadir rutas públicas de demostración. Si no hay un harness disponible, registrar esta revisión como pendiente en lugar de afirmar que se hizo.

## Validación integral con base aislada — requiere confirmación explícita

Antes de iniciar un servidor, abrir una ruta conectada, preparar datos o ejecutar cualquier operación que consulte la base, obtener la confirmación exigida en AGENTS.md. Elegir un entorno aislado y credenciales autorizadas; no usar datos personales reales ni imprimir secretos. No ejecutar la suite e2e existente en bloque: puede crear eventos, registros y enviar correos.

Con autorización y el entorno configurado, se puede iniciar la aplicación:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Abrir `/organizador` e iniciar sesión con la cuenta de prueba. Preparar mediante flujos autorizados el evento de aforo 100, el tipo A de aforo 30 con 20 registros y el tipo B de aforo 60. Para un nuevo evento futuro debe existir al menos un tipo con cupo disponible antes de publicarlo. Si preparar registros requiere correo, usar únicamente los destinatarios de prueba expresamente autorizados para ese envío; no asumir autorización de correo por autorizar DB.

| Escenario | Acción | Resultado esperado |
| --- | --- | --- |
| Mínimo | Guardar 19 en A | Mensaje FR-002; A sigue en 30; conserva 20 Registration y sus Ticket. |
| Igualdad | Corregir a 20 sin reabrir | Guardado aceptado y error retirado. |
| Reducción válida | Desde A=30, guardar 25 | Aceptado y registros conservados. |
| Máximo | Guardar 40 en A | Aceptado: 40 + 60 = 100. |
| Exceso | Intentar 41 en A | Bloqueado por el máximo local/nativo; si llega al servidor, rechazo propio del máximo. |
| Máximo desactualizado | Abrir A cuando B=50, cambiar B a 60 en otra sesión y guardar A=41 | La información local permite el intento, el servidor lo rechaza por máximo; sin mensaje de mínimo. |
| Conteo por tipo | Otro evento de 100: tipos de aforos 10/40, con 5/25 registros; guardar 5 en el primero | Aceptado; no usa el total 30 del evento como mínimo. |
| Sin registros | Tipo de aforo 10 y 0 registros; guardar 1 | Aceptado. |
| Valores inválidos | Intentar vacío, 0, negativo o decimal | Bloqueo de validación y aforo guardado conservado. |
| Nuevo registro | Abrir A=30 con 20 registros; completar otro registro en A y guardar 20 | Rechazo específico del mínimo; A sigue en 30 y mantiene 21 registros. |
| Estados | 20 registros: 15 Ticket valid, 4 used, 1 revoked; guardar 19 y después 20 | 19 rechazado, 20 aceptado; revocar no elimina Registration del conteo. |

Cada escenario debe comenzar desde sus valores iniciales; restaurarlos solo con operaciones autorizadas. La prueba de nuevo registro terminado antes del guardado valida información desactualizada. Para acreditar serialización real, una prueba de integración adicional debe coordinar transacciones solapadas de registro y edición en ambos órdenes, con una base aislada autorizada; un mock o dos clics manuales no acreditan esa garantía.

## Evidencia a entregar

Separar resultados de tipos/lint, pruebas aisladas, revisión visual y pruebas contra base. Documentar lo no ejecutado y cualquier divergencia de las migraciones del entorno; no dar por validada la base remota a partir de los archivos SQL locales. No se requieren migraciones para esta corrección.

Para cada ejecución registrar fecha, revisión del código, entorno sin secretos, comando o pasos, resultado esperado/observado y referencia a la evidencia. Usar estados «pendiente», «aprobado» o «fallido»; un escenario no ejecutado permanece pendiente con su motivo. Para los escenarios contra base, conservar las identidades y relaciones de Registration y Ticket, sus estados y el aforo antes/después de la operación; un conteo igual por sí solo no prueba conservación. Usar únicamente datos ficticios autorizados.

| Criterio | Evidencia necesaria para aprobarlo |
| --- | --- |
| SC-001 | Mínimo, nuevo registro completado antes del guardado y estados: rechazo y mensaje exacto desde la aplicación conectada a la base aislada. |
| SC-002 | Igualdad, reducción válida, máximo, exceso, máximo desactualizado, conteo por tipo, sin registros, valores inválidos y estados: resultados numéricos esperados y aforos persistidos. |
| SC-003 | En cada rechazo, comparación antes/después del aforo persistido y de las identidades y relaciones de registros y entradas, además de los valores escritos que conserva el formulario. |
| SC-004 | Reintento 19 → 20 desde el mismo formulario conectado, sin reabrir ni reintroducir el nombre, con error retirado, confirmación y aforo 20 persistido. |
| Revisión de interfaz | Resultado de T013 a ambos tamaños, con teclado, foco, asociación accesible del error, texto largo y movimiento reducido. |

Las pruebas de transacciones solapadas son evidencia adicional de serialización; registrar su estado por separado y no declararlas realizadas por haber aprobado el escenario de nuevo registro anterior al guardado.

### Estado de cierre

Actualizar esta tabla al ejecutar las tareas. La aceptación integral se completó después de la autorización explícita del usuario y de las pruebas contra una instancia local aislada.

| Hito | Estado actual | Condición para completarlo |
| --- | --- | --- |
| Implementación terminada | Aprobado | Cambio y pruebas implementados; pruebas focalizadas, TypeScript y ESLint aprobados conforme a spec.md. |
| Registro de evidencia (T014) | Aprobado | Resultados y pendientes documentados por separado; puede finalizar aunque falte validación integral. |
| Aceptación integral validada (T015) | Aprobado | Todos los escenarios anteriores y revisión de interfaz aprobados, con evidencia suficiente para SC-001–SC-004. |

Si no se autoriza la base o falta entorno, T015 queda pendiente. Aunque T001–T014 estén marcadas, no declarar la funcionalidad completamente validada. Este registro no autoriza conexiones, preparación de datos ni envíos de correo.

## Resultados de implementación — 2026-11-23

Revisión base: `8519a27`, con cambios locales sin commit en `app/organizador/page.tsx`, `lib/ticket-type-errors.ts`, los tres archivos de pruebas, los ignores y esta documentación. Entorno: Node.js 26.10.0, Next.js 16.4.5, Supabase JS 2.119.0 y dependencias de la aplicación ya instaladas. Tras la autorización, se descargaron imágenes oficiales para la instancia local de Supabase; no se instalaron paquetes de la aplicación ni se accedió a bases remotas.

| Comprobación | Estado | Evidencia y alcance |
| --- | --- | --- |
| Regresión anterior al cambio | Aprobado | Los dos casos iniciales de `tests/organizer-ticket-type.test.mjs` fallaron mostrando el mensaje de máximo ante el error de mínimo; el helper aún no existía. Tras implementar, ambos pasan. |
| Pruebas aisladas | Aprobado | `node --test tests/ticket-type-errors.test.mjs tests/organizer-ticket-type.test.mjs`: 11 pruebas, 11 aprobadas, 0 fallos. Hooks, sesión y transporte sustituidos; la prueba del SDK solo usa fetch simulado con origen ficticio. |
| TypeScript | Aprobado | `./node_modules/.bin/tsc --noEmit --incremental false`: salida 0, sin errores. |
| ESLint | Aprobado | Comando focalizado de esta guía, incluyendo también `eslint.config.mjs`: salida 0, sin errores ni advertencias. |
| Revisión de cambios | Aprobado | `git diff --check` y revisión de archivos nuevos sin espacios finales: sin errores. Se conservan filtros de guardado, restricciones locales y SQL; sin consultas, dependencias ni migraciones nuevas. |
| Revisión visual (T013) | Aprobado | Chromium a 390 × 844 y 1280 × 900: error largo visible completo, sin desbordamiento de página; foco visible, Tab a Cancelar, Escape y retorno al botón de edición. Reintento aprobado con movimiento reducido. Capturas inspeccionadas visualmente: [móvil](evidence/capacity-error-mobile.png) y [escritorio](evidence/capacity-error-desktop.png). |
| Base aislada / T015 | Aprobado | `tests/e2e/ticket-type-capacity.spec.mjs`: 6 tests aprobados, 0 fallos, 13,2 s. Ejecutó los 16 escenarios registrados abajo con la aplicación, SDK y PostgREST reales sobre Supabase local con las ocho migraciones del repositorio; SC-001–SC-004 aprobados. |

Los casos numéricos y de estados del Ticket en las pruebas del formulario verifican que el cliente conserva sus validaciones y trata respuestas preparadas; no ejecutan ni reproducen el trigger. La revisión de las migraciones confirma las reglas declaradas en el repositorio, sin certificar su aplicación en ningún entorno remoto.

### Validación integral autorizada

El usuario autorizó las pruebas de T015. Se preparó `/private/tmp/door-list-capacity-validation` con una copia de `supabase/config.toml`, un identificador de proyecto propio y las ocho migraciones versionadas, sin copiar `.env`. Se inició Supabase con el CLI instalado 3.1.0: API `127.0.0.1:55421` y PostgreSQL local en `55422`. La aplicación se inició en `127.0.0.1:3114` con las variables de Supabase locales sobrescritas en el proceso y las de Resend vacías. No se modificaron las migraciones ni la configuración de producción.

La prueba crea un usuario ficticio confirmado mediante la API administrativa local, eventos y tipos propios, y asistentes mediante `register_attendee`. Esta llamada ejecuta la función y la emisión de Ticket en PostgreSQL sin llamar al endpoint que envía correo. Las operaciones de guardado bajo prueba pasan por el formulario real del organizador, su sesión y PostgREST, sin simular el error. Los snapshots administrativos comparan las identidades, relaciones y estados de Registration/Ticket, así como nombres y aforos persistidos. Las peticiones del navegador se restringen a los dos orígenes locales; `/api/registros` queda bloqueado para impedir envíos accidentales.

Ejecución reproducible, con autorización y una instancia local equivalente ya iniciada:

1. Iniciar la aplicación con `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55421`, su clave pública local en `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, variables de Resend vacías y puerto 3114.
2. Proporcionar al proceso de pruebas `RUN_CAPACITY_DB_TESTS=1`, `E2E_BASE_URL=http://127.0.0.1:3114`, `CAPACITY_SUPABASE_URL=http://127.0.0.1:55421`, `CAPACITY_ANON_KEY` y `CAPACITY_SERVICE_ROLE_KEY` de esa instancia; nunca usar claves remotas ni imprimirlas.
3. Establecer `CAPACITY_EVIDENCE_DIR` si se desea conservar la evidencia fuera del directorio de resultados ignorado y ejecutar únicamente:

```bash
./node_modules/.bin/playwright test tests/e2e/ticket-type-capacity.spec.mjs --project=chromium
```

Sin la variable de autorización, los seis tests se omiten; el test rechaza URLs de Supabase que no sean `127.0.0.1:55421`. Las claves quedan fuera del repositorio y de las capturas. La suite general con email no se ejecutó.

Los [16 escenarios y snapshots](evidence/database-scenarios.json) incluyen mínimo 19 con 20 registros, reintento a 20, guardados 20/25/40, máximo nativo 41, vacío/0/negativo/decimal, máximo desactualizado, mínimo 5 frente al total 30 del evento, cero registros con aforo 1, nuevo registro que eleva el mínimo a 21 y los rechazos/aceptaciones 19/20 con 15 Ticket valid + 4 used + 1 revoked. Para valores nativos inválidos se comparó el snapshot completo y se conservaron sus hashes iguales como evidencia compacta.

La aplicación y la instancia de pruebas se detuvieron al terminar; los datos locales se conservaron para inspección. Se retiró únicamente el bloque que Next.js añadió automáticamente a AGENTS.md al iniciar el servidor. No quedan escenarios requeridos pendientes. No se realizaron pruebas adicionales de transacciones solapadas y no se afirma una garantía de serialización derivada de ellas ni se certifica el despliegue remoto.
