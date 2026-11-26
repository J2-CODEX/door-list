# UX visual, accesibilidad y casos borde Checklist: Imágenes de portada en eventos

**Purpose**: Evaluar la completitud, claridad, consistencia y verificabilidad de los requisitos de subida, sustitución y eliminación de portadas, sus alternativas accesibles y su presentación pública.
**Created**: 2026-11-25
**Feature**: [Imágenes de portada en eventos](../spec.md)
**Profundidad**: Estándar.
**Actor y momento**: Persona revisora de requisitos, antes del plan de implementación y como referencia posterior de revisión de PR.
**Alcance solicitado**: UX visual, accesibilidad y casos borde de la subida de imágenes; incluye los efectos sobre cartelera y registro establecidos en la especificación.

**Note**: Checklist personalizada generada con `$speckit-checklist` a partir de la especificación, la constitución, PRODUCT.md, DESIGN.md y el sistema visual de Door List. No existen todavía `plan.md` ni `tasks.md`; las decisiones diferidas al plan se revisan como dependencias, sin asumir que ya estén resueltas.
**Review Ownership**: Este artefacto pertenece a la persona revisora de la calidad de los requisitos. Solo ella puede aprobar un criterio y marcarlo `[x]`.
**Marker Semantics**: `[x]` significa que el criterio de calidad de requisitos fue revisado y satisfecho; no significa que la implementación esté terminada. Todos los elementos nuevos quedan pendientes de evaluación.

## Completitud de requisitos

- [ ] CHK001 ¿Están especificados los estados visuales de gestión sin portada, con portada guardada, con selección pendiente, operación en curso, éxito y error, distinguiendo la propuesta local del último estado guardado? [Completitud] [Spec §FR-003] [Spec §FR-007] [Gap]
- [ ] CHK002 ¿Están definidos la jerarquía y el agrupamiento de selección de archivo, descripción alternativa, ayudas y acciones de guardar, sustituir y quitar, con etiquetas en español y prioridad de acciones inequívoca? [Completitud] [Spec §FR-001] [Spec §FR-004] [Spec §FR-013] [Gap]
- [ ] CHK003 ¿Los requisitos incluyen la comunicación previa de formatos estáticos admitidos, peso máximo y rango inclusivo de ambas dimensiones, además de la advertencia de recorte centrado sin ajuste manual? [Completitud] [Spec §FR-015] [Spec §FR-016] [Gap]
- [ ] CHK004 ¿Está definido qué información de la portada y su descripción se conserva durante cada operación y ante cada fallo, diferenciando los datos guardados de los cambios todavía no guardados? [Completitud] [Spec §FR-003] [Spec §FR-007] [Spec §User Story 3, escenario 4] [Gap]

## Claridad de requisitos

- [ ] CHK005 ¿Está definido cuándo una selección pasa a ser una portada guardada y si guardar la portada y guardar los demás datos del evento constituyen una misma operación o acciones distintas? [Claridad] [Spec §FR-001] [Spec §FR-003] [Ambiguity]
- [ ] CHK006 ¿La proporción y geometría de la portada están fijadas o asignadas explícitamente al diseño del plan para cartelera, registro y, si se contempla, previsualización del organizador? [Claridad] [Spec §FR-008] [Spec §FR-016] [Spec §Assumptions] [Gap]
- [ ] CHK007 ¿La confirmación de éxito distingue inequívocamente selección, transferencia y guardado efectivo, y los mensajes de error especifican el motivo y una vía comprensible para continuar? [Claridad] [Spec §FR-007] [Spec §SC-007] [Gap]
- [ ] CHK008 ¿Están definidos el tratamiento de una descripción vacía o de solo espacios, su longitud permitida y la política de conservación o reinicio de la descripción propia al sustituir o quitar la imagen? [Claridad] [Spec §FR-004] [Spec §Edge Cases] [Gap]

## Consistencia de requisitos

- [ ] CHK009 ¿Los requisitos de opcionalidad son consistentes en creación, edición, publicación y reserva, sin que una portada ausente o fallida imponga una condición adicional? [Consistencia] [Spec §FR-002] [Spec §FR-014] [Spec §SC-008]
- [ ] CHK010 ¿La portada y la descripción vigentes están definidas de forma consistente para gestión, cartelera y registro, incluida la distinción entre una nueva visita y una página ya abierta? [Consistencia] [Spec §FR-003] [Spec §FR-005] [Spec §FR-017]
- [ ] CHK011 ¿Los requisitos visuales de ayudas, controles, foco, errores y marcador remiten a roles, escalas y estados compatibles entre DESIGN.md y las referencias de `door-list-ui`, con precedencia documentada si discrepan? [Consistencia] [Spec §FR-010] [Spec §FR-013] [Conflict]
- [ ] CHK012 ¿Son consistentes los requisitos de recorte centrado, proporción uniforme, altura estable y legibilidad, sin exigir que toda la información incrustada en los bordes de la fotografía permanezca visible? [Consistencia] [Spec §FR-008] [Spec §FR-011] [Spec §FR-016]

## Calidad de criterios de aceptación

- [ ] CHK013 ¿Los criterios de admisión y rechazo cubren con valores exactos el límite de 5 242 880 bytes y los extremos de 600 y 6000 px para cada dimensión por separado, dejando inequívoca su inclusividad? [Medibilidad] [Spec §FR-015] [Spec §User Story 1, escenario 6]
- [ ] CHK014 ¿La uniformidad y estabilidad visual tienen medidas y tolerancias explícitas, diferenciando altura de tarjeta, espacio de portada y desplazamiento del contenido ante espera y fallo? [Medibilidad] [Spec §SC-001] [Spec §SC-002]
- [ ] CHK015 ¿Los criterios de contraste, foco, orden de teclado, altura de controles y adaptación indican los elementos y estados cubiertos, con umbrales objetivos para los aspectos cuantificables? [Medibilidad] [Spec §SC-004] [Spec §SC-005] [Gap]
- [ ] CHK016 ¿La matriz de aceptación identifica datos ficticios, superficies, anchos y estados suficientes para evaluar también la gestión del organizador, además de la presentación pública, sin depender de juicios como «atractiva» o «correcta»? [Medibilidad] [Spec §Success Criteria, matriz visual] [Spec §SC-007]

## Cobertura de escenarios

- [ ] CHK017 ¿Los requisitos del flujo principal abarcan primera portada, descripción propia u omitida, confirmación de guardado y persistencia, sin convertir el texto alternativo propio en obligatorio? [Cobertura principal] [Spec §User Story 1] [Spec §FR-004]
- [ ] CHK018 ¿Los requisitos de flujos alternativos abarcan sustitución, eliminación, edición de descripción sin cambiar archivo y creación o publicación sin imagen? [Cobertura alternativa] [Spec §User Story 3] [Spec §FR-002]
- [ ] CHK019 ¿Está documentado el tratamiento de cancelar la selección, descartar cambios y abandonar una edición pendiente, o su exclusión deliberada, sin confundirlo con una eliminación guardada? [Cobertura alternativa] [Gap]
- [ ] CHK020 ¿Los requisitos de excepción distinguen archivo no admitido, archivo ilegible, fallo de transferencia y fallo de guardado, indicando para cada caso qué información recibe el organizador y qué estado se conserva? [Cobertura de excepción] [Spec §FR-007] [Spec §FR-015] [Gap]
- [ ] CHK021 ¿Los requisitos de recuperación definen reintento y reconciliación cuando la conexión se interrumpe o el resultado del guardado es incierto, sin comunicar éxito o eliminación que no estén confirmados? [Cobertura de recuperación] [Spec §SC-007] [Gap]

## Cobertura de casos borde

- [ ] CHK022 ¿Los requisitos contemplan archivos vacíos, dañados, animados o con extensión engañosa y precisan que un rechazo conserva la portada válida anterior? [Casos borde] [Spec §FR-015] [Spec §User Story 1, escenario 7] [Gap]
- [ ] CHK023 ¿Está definido el alcance ante selección múltiple y mecanismos alternativos de selección, como arrastrar archivos o elegirlos desde un dispositivo móvil, sin asumir que estas modalidades estén incluidas? [Casos borde] [Gap]
- [ ] CHK024 ¿Están definidos el estado aceptado y la información al organizador cuando hay selecciones sucesivas, intentos repetidos de guardado o una solicitud de quitar la portada durante una operación pendiente? [Casos borde] [Spec §FR-007] [Gap]
- [ ] CHK025 ¿Está documentado el resultado de ediciones concurrentes de portada o descripción por varias sesiones, incluida la forma de evitar que el organizador interprete un estado desactualizado como vigente? [Casos borde] [Spec §FR-003] [Spec §FR-017] [Gap]
- [ ] CHK026 ¿Los requisitos contemplan pérdida de sesión o permiso durante una operación y distinguen ese rechazo de un fallo del archivo, preservando la información editable que corresponda? [Casos borde] [Spec §FR-006] [Spec §FR-007] [Gap]
- [ ] CHK027 ¿Los requisitos de presentación delimitan el tratamiento de orientación de fotografías, transparencia, proporciones extremas y nombres de archivo largos, o documentan exclusiones, sin añadir herramientas de edición fuera del alcance? [Casos borde] [Spec §FR-013] [Spec §FR-016] [Gap]
- [ ] CHK028 ¿Están cubiertos la portada inaccesible, los eventos existentes sin imagen y los eventos agotados o con registro cerrado, con criterios que separen el marcador visual de los permisos y acciones disponibles? [Casos borde] [Spec §Edge Cases] [Spec §FR-010] [Spec §FR-014]

## Requisitos no funcionales de accesibilidad y respuesta

- [ ] CHK029 ¿Están definidos nombres accesibles y asociaciones de etiquetas, ayudas y errores para la selección de imagen, la descripción alternativa y cada acción, sin depender del placeholder, del color o de iconos solos? [Accesibilidad] [Spec §FR-007] [Gap]
- [ ] CHK030 ¿Los requisitos de teclado cubren todas las acciones de gestión y especifican el destino del foco tras éxito, fallo o eliminación de un control, además de su orden y visibilidad? [Accesibilidad] [Spec §FR-012] [Spec §SC-005] [Gap]
- [ ] CHK031 ¿Están especificados los anuncios accesibles de operación en curso, éxito y error, su relación con el campo afectado y la prevención de anuncios repetidos o cambios de foco innecesarios? [Accesibilidad] [Spec §FR-007] [Gap]
- [ ] CHK032 ¿La política de alternativas textuales distingue fotografía, marcador sin imagen y elementos decorativos, evitando pérdida de información o repetición innecesaria del título y de la explicación del marcador? [Accesibilidad] [Spec §FR-004] [Spec §FR-010] [Spec §SC-006] [Gap]
- [ ] CHK033 ¿El alcance de accesibilidad establece un nivel objetivo de conformidad y criterios para ampliación de texto y redistribución con zoom, además de los anchos a zoom del 100 %, o documenta expresamente su exclusión? [Accesibilidad] [Spec §SC-005] [Gap]
- [ ] CHK034 ¿Los requisitos de espera definen retroalimentación comprensible ante una subida lenta, el alcance de indicadores de progreso y tiempo de espera, y el respeto al movimiento reducido, manteniendo disponibles las tareas no afectadas? [Respuesta y accesibilidad] [Spec §FR-007] [Spec §FR-014] [Spec §SC-005] [Gap]

## Dependencias y supuestos

- [ ] CHK035 ¿Las decisiones diferidas al plan identifican responsable y artefacto de resolución para proporciones, actualización pública y fallos de almacenamiento, manteniendo trazabilidad con los resultados de UX exigidos? [Dependencias] [Spec §Assumptions] [Spec §FR-017] [Gap]
- [ ] CHK036 ¿Están documentados los límites de visibilidad de las portadas de eventos no públicos y sus consecuencias perceptibles para visitantes y organizadores, sin suponer que almacenar una imagen concede acceso público al evento? [Dependencias y supuestos] [Spec §FR-005] [Spec §FR-006] [Spec §Assumptions]

## Ambigüedades y conflictos

- [ ] CHK037 ¿Se distingue explícitamente entre «sin decisiones de producto pendientes» y las cuestiones todavía no especificadas de selección pendiente, cancelación, concurrencia y descripción al sustituir, sin dar por resueltos esos vacíos? [Claridad] [Spec §Open Questions for `$speckit-clarify`] [Ambiguity]
- [ ] CHK038 ¿Está aclarado cómo se complementan los anchos de aceptación de 375/1440 px de la especificación con las referencias de 390/1280 px de `door-list-ui`, evitando sustituir silenciosamente los criterios acordados? [Consistencia] [Spec §FR-012] [Spec §SC-005] [Ambiguity]

## Notes

- Marcar `[x]` solo después de que la persona revisora determine que el criterio de calidad de requisitos está satisfecho; dejar pendiente lo que requiera aclaración, corrección o evaluación.
- `$speckit-implement` lee el estado de esta checklist como condición de entrada y no debe modificar sus marcadores.
- `checklists/requirements.md` tiene un ciclo independiente, mantenido por `$speckit-specify` y `$speckit-clarify`.
- `[Gap]`, `[Ambiguity]` y `[Conflict]` señalan aspectos a evaluar; no constituyen decisiones nuevas de producto ni hallazgos ya aprobados.
- Registrar comentarios y referencias junto al elemento correspondiente. Los identificadores son secuenciales dentro de este archivo.
- Esta checklist evalúa lo escrito en los requisitos. No acredita implementación, pruebas funcionales ni revisión visual ejecutada.
