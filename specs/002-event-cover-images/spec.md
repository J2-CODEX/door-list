# Feature Specification: Imágenes de portada en eventos

**Feature Branch**: `features/imagenes-en-eventos`

**Created**: 2026-11-24

**Status**: Clarified — lista para `$speckit-plan`

**Input**: El organizador puede subir, cambiar y quitar una portada opcional por evento. La portada aparece en «Próximos eventos» y en la página de registro. Las imágenes viven en Supabase Storage. La presentación debe distinguir eventos de un vistazo y respetar PRODUCT.md y DESIGN.md, con resultados verificables en móvil y escritorio, sin cambiar aforo, reservas ni entradas.

La prioridad es que el organizador pueda dar identidad visual a su evento y que quien reserva pueda reconocerlo al pasar de la cartelera al registro. «Atractiva» significa aquí una presentación coherente, estable y legible, evaluada por los criterios de esta especificación; no se presupone una mejora de conversión ni de satisfacción que todavía no se haya medido.

## Clarifications

### Session 2026-11-24

- Q: ¿Qué límites deben cumplir las imágenes que el organizador suba como portada? → A: JPEG, PNG y WebP estáticos; peso máximo de 5 MiB (5 242 880 bytes); ancho y alto, cada uno, entre 600 y 6000 px, con límites inclusivos.
- Q: ¿Cómo debe mostrarse una imagen cuya proporción no coincide con el espacio de portada? → A: Recorte automático centrado, sin ajuste manual; puede quedar fuera contenido de los bordes.
- Q: ¿Cuándo deben ver los visitantes los cambios guardados de portada o descripción alternativa en un evento publicado? → A: En nuevas visitas desde que se confirma el guardado, sin una publicación adicional; las páginas ya abiertas no se actualizan automáticamente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dar identidad visual al evento (Priority: P1)

Como organizador con permiso para editar un evento, quiero añadir una portada opcional y su descripción alternativa para que el público reconozca mi evento. También quiero poder crear y publicar un evento sin imagen.

**Why this priority**: Atiende al público principal de PRODUCT.md y permite ofrecer una identidad visual sin convertir la imagen en una barrera de publicación.

**Independent Test**: Con un evento editable, guardar una portada admitida con texto alternativo propio; volver a abrir el evento y comprobar que conserva ambos. Repetir sin texto propio y sin imagen. Comprobar JPEG, PNG y WebP estáticos, el máximo inclusivo de 5 MiB (5 242 880 bytes) y los límites inclusivos de 600 a 6000 px para cada dimensión.

**Acceptance Scenarios**:

1. **Given** un evento sin portada y un organizador autorizado, **When** sube una imagen admitida y guarda el cambio, **Then** el evento conserva esa portada y el organizador recibe confirmación comprensible del resultado.
2. **Given** la misma operación con una descripción alternativa escrita por el organizador, **When** se guarda, **Then** esa descripción identifica la imagen para quien no puede verla, tanto en la cartelera como en el registro.
3. **Given** una portada sin descripción propia o con una descripción formada solo por espacios, **When** se muestra, **Then** tiene texto alternativo no vacío derivado del título vigente del evento, sin usar el nombre del archivo.
4. **Given** un evento sin portada que cumple las condiciones vigentes de publicación, **When** el organizador lo publica, **Then** la ausencia de imagen no impide publicarlo ni reservar y se muestra el marcador visual definido en FR-010.
5. **Given** un archivo dañado, no admitido o una carga fallida, **When** intenta subirlo, **Then** recibe un error propio en español que explica cómo continuar, no se confirma un guardado inexistente y se conservan los demás datos del evento.
6. **Given** archivos estáticos legibles que cumplen los demás límites, **When** se suben JPEG, PNG y WebP, archivos de exactamente 5 242 880 bytes e imágenes con ancho o alto de exactamente 600 o 6000 px, **Then** se admiten; al repetir con 5 242 881 bytes o con cualquiera de las dimensiones de 599 o 6001 px, se rechazan sin sustituir la portada guardada.
7. **Given** archivos animados, ilegibles o de un formato no admitido, incluso renombrados con una extensión admitida, **When** se intenta subirlos, **Then** se rechazan con un mensaje propio en español y se conserva la portada guardada.

---

### User Story 2 - Reconocer el evento al descubrirlo y reservar (Priority: P1)

Como persona que busca un evento, quiero reconocer su portada en la cartelera y en el registro, y leer su título, fecha y acción de reserva sin que la imagen dificulte mi decisión.

**Why this priority**: Completa el valor público de la portada y protege la tarea principal de reservar incluso cuando la imagen tarda o falla.

**Independent Test**: Consultar una cartelera de eventos publicados con portadas horizontales, verticales y cuadradas, y eventos sin imagen; abrir sus registros y aplicar la matriz visual de SC-001 a SC-006.

**Acceptance Scenarios**:

1. **Given** eventos con imágenes de distintas proporciones, **When** se muestra «Próximos eventos», **Then** todas las zonas de portada tienen la misma proporción, no deforman la imagen y su altura no depende de las dimensiones del archivo original.
2. **Given** un evento con portada, **When** se pasa de la cartelera a su página de registro, **Then** ambas muestran la misma portada vigente, junto al título y fecha del evento correspondiente.
3. **Given** una imagen cuya carga se retrasa, **When** aparece finalmente o falla, **Then** no desplaza el título, la fecha, la acción de reserva ni el contenido posterior en ninguna de las dos páginas.
4. **Given** un evento sin portada o cuya portada no puede mostrarse, **When** se consulta cualquiera de las dos páginas, **Then** aparece un marcador visual coherente con DESIGN.md, sin icono de imagen rota ni espacio vacío, y se puede continuar con la reserva según las reglas vigentes.
5. **Given** portadas muy claras, muy oscuras o con mucho detalle y texto incrustado, **When** se muestran, **Then** el título, la fecha y la acción de reserva mantienen el contraste de SC-004, estén sobre la imagen o junto a ella. El texto incrustado no sustituye la información del evento.
6. **Given** un ancho de 375 px o 1440 px y un título largo, **When** se navega por ambas páginas, **Then** no hay desbordamiento horizontal de página, superposición ni ocultación de información esencial y la reserva sigue siendo accesible por teclado.
7. **Given** imágenes horizontales, verticales y cuadradas con marcas en el centro y los bordes, **When** su proporción difiere de la zona de portada en cartelera o registro, **Then** llenan esa zona sin deformarse, conservan el centro y recortan simétricamente el excedente de los lados o de arriba y abajo; no se ofrece ajuste manual del encuadre.

---

### User Story 3 - Mantener actualizada la portada (Priority: P2)

Como organizador autorizado, quiero cambiar o quitar la portada y modificar su descripción alternativa para mantener la presentación del evento al día.

**Why this priority**: Evita que una elección inicial sea irreversible y conserva el control del organizador sobre la presentación pública.

**Independent Test**: Partiendo de una portada guardada, sustituirla, editar su texto alternativo y quitarla; volver a abrir el evento tras cada guardado. En un evento publicado, abrir nuevas visitas a cartelera y registro después de cada confirmación de guardado y comprobar el estado vigente, sin una publicación adicional.

**Acceptance Scenarios**:

1. **Given** un evento con portada, **When** se guarda otra imagen admitida, **Then** la nueva sustituye a la anterior como única portada vigente, sin modificar los demás datos del evento.
2. **Given** una portada con descripción propia, **When** el organizador guarda una descripción distinta, **Then** las nuevas visitas a ambas páginas públicas usan la descripción vigente desde que se confirma el guardado; si la deja vacía, usan la derivada del título.
3. **Given** un evento con portada, **When** se guarda su eliminación, **Then** el evento queda sin portada y las nuevas visitas a ambas páginas públicas muestran el marcador visual desde que se confirma el guardado; sigue sujeto a las mismas reglas de publicación y reserva.
4. **Given** una sustitución, eliminación o edición de descripción que falla, **When** se informa el fallo, **Then** se conserva la última portada y descripción guardadas y el organizador puede reintentar sin perder los otros datos del evento.
5. **Given** una persona sin permiso para editar ese evento, incluido un rol que solo opera la puerta, **When** intenta cambiar su portada o descripción, **Then** el cambio se rechaza y el evento conserva su presentación anterior.
6. **Given** un evento publicado, con o sin portada, **When** se confirma el guardado de un alta, sustitución, eliminación o cambio de descripción y se abren nuevas visitas a cartelera y registro, **Then** ambas muestran el nuevo estado sin otra acción de publicación; no se exige actualizar automáticamente las páginas que ya estaban abiertas.

### Edge Cases

- Eventos existentes sin portada: muestran el mismo marcador que un evento nuevo sin imagen; no requieren intervención del organizador.
- Archivo ilegible, animado, de formato distinto de JPEG, PNG o WebP, de más de 5 MiB o con ancho o alto fuera del intervalo inclusivo de 600 a 6000 px: no sustituye una portada válida; el error explica el motivo con lenguaje propio del producto.
- Imagen muy ancha, muy alta o con información cerca de sus bordes: se muestra con recorte automático centrado para llenar la zona de portada, sin deformarse. Puede quedar fuera contenido de los bordes; no se ofrece ajuste manual del encuadre.
- Carga lenta o imagen inaccesible: se conserva el espacio de la portada y permanecen disponibles la información y las acciones de reserva.
- Fallo durante un cambio: no se presenta como una eliminación voluntaria ni como una operación completada; se conserva el último resultado guardado.
- Respuesta perdida al editar la descripción o quitar la portada: consultar el estado vigente y conservar los cambios locales hasta decisión explícita. Un estado coincidente se comunica como estado observado, sin atribuir éxito a la petición perdida; una edición concurrente requiere revisión antes de otro guardado. Si la consulta falla, permitir reintentar la consulta sin convertirla en ausencia de portada.
- Cambio de título: el texto alternativo derivado refleja el título vigente; un texto alternativo escrito por el organizador se conserva hasta que lo edite o lo quite.
- Título y descripción alternativa largos: no provocan desbordamiento de página; el título esencial puede partirse sin quedar oculto por truncado.
- Eventos agotados, registro cerrado o cualquier otro estado existente: la presencia o ausencia de portada no altera las acciones disponibles ni sus reglas.
- Una imagen incluye texto: el título, la fecha y la acción de reserva siguen existiendo como información legible y accesible independiente de ese texto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El organizador autorizado para editar un `Event` DEBE poder subir una portada opcional, sustituirla y quitarla. Cada evento tiene como máximo una portada vigente; no se incorpora una galería.
- **FR-002**: La portada DEBE ser opcional para crear, guardar y publicar un evento. Esta función NO DEBE añadir restricciones de imagen a las reglas de publicación existentes.
- **FR-003**: Las portadas y sus descripciones alternativas DEBEN persistir al volver a abrir el evento y conservarse mientras no se guarde otro cambio correctamente.
- **FR-004**: El organizador DEBE poder escribir texto alternativo al subir una portada y editarlo posteriormente. Toda portada mostrada DEBE disponer de texto alternativo propio o, si está vacío, derivado del título vigente del evento.
- **FR-005**: La cartelera pública y la página de registro DEBEN mostrar la misma portada vigente del evento y el texto alternativo correspondiente. Una portada no concede visibilidad pública a un evento que no la tiene.
- **FR-006**: Los cambios DEBEN respetar los permisos de edición del evento. Ser visitante, tener acceso al registro o disponer únicamente del rol de puerta no permite subir, sustituir, quitar ni describir la portada.
- **FR-007**: Al gestionar la portada, el organizador DEBE distinguir operación en curso, éxito y error mediante mensajes en español; los controles tienen etiquetas visibles y foco perceptible. Los errores no exponen mensajes crudos del proveedor y conservan los demás datos introducidos y la última portada guardada.
- **FR-008**: Todas las zonas de portada de la cartelera DEBEN compartir una proporción uniforme. Las imágenes NO DEBEN deformarse. Manteniendo el mismo ancho y contenido textual, cambiar el archivo, mostrar el marcador o pasar de carga a contenido NO DEBE modificar la altura de la tarjeta.
- **FR-009**: En la cartelera y en el registro, el espacio de la portada DEBE conservar sus dimensiones antes, durante y después de cargar o fallar, de modo que la imagen no provoque desplazamientos del contenido.
- **FR-010**: Un evento sin portada o con una imagen que falla DEBE mostrar un marcador visual reconocible como estado sin imagen, con explicación textual breve en español, superficie oliva suave y elementos en verde bosque u oliva de lectura conforme a DESIGN.md. Ocupa la misma zona de portada; no muestra una imagen rota, un hueco vacío ni simula una fotografía del evento.
- **FR-011**: El título, la fecha y la acción de reserva DEBEN seguir siendo información independiente de la imagen, legible con cualquier portada o marcador. Si se sitúan sobre la imagen o junto a ella, DEBEN cumplir SC-004 en todos sus estados.
- **FR-012**: La gestión de portada, la cartelera y el registro DEBEN ser utilizables a 375 px y 1440 px de ancho, sin desbordamiento horizontal de página, superposición ni ocultación de información esencial. Los controles conservan un mínimo de 48 px de altura y se pueden operar con teclado y foco visible.
- **FR-013**: La presentación añadida DEBE respetar DESIGN.md: fondo crema, superficies blancas u oliva suave, texto y acciones en verde bosque, Arial/Helvetica/sans-serif, jerarquía existente, espaciado acordado, bordes finos y sombras discretas. No incorpora una nueva paleta de interfaz, fuentes, degradados ni adornos de escritorio. Los colores de las fotografías no modifican estos roles.
- **FR-014**: La portada NO DEBE cambiar aforo, consumo o liberación de cupos, disponibilidad por `TicketType`, reglas de `Registration`, emisión ni estados de `Ticket`, fechas ni ventanas de registro. Su carga o fallo NO DEBE ser un requisito para reservar.
- **FR-015**: Solo se admiten imágenes estáticas JPEG, PNG y WebP de hasta 5 MiB (5 242 880 bytes), con ancho y alto, cada uno, entre 600 y 6000 px; todos los límites son inclusivos. Estos requisitos DEBEN comunicarse antes de seleccionar el archivo y validarse al subirlo. Se rechazan imágenes animadas, archivos ilegibles y otros formatos, aunque su extensión aparente estar admitida.
- **FR-016**: En la cartelera y en el registro, las imágenes DEBEN llenar la zona de portada sin deformarse mediante recorte automático centrado cuando su proporción no coincida con la zona. Se permite que quede fuera contenido de los bordes. No se ofrece ajuste manual del encuadre ni una herramienta de edición de imágenes; se mantiene FR-008.
- **FR-017**: En un evento publicado, las altas, sustituciones, eliminaciones y cambios de descripción DEBEN ser visibles en las nuevas visitas a cartelera y registro desde que se confirma el guardado, sin requerir una acción adicional de publicación. Ambas páginas muestran el mismo estado guardado. No se exige actualizar automáticamente páginas que ya estén abiertas. Guardar una portada no publica un evento que no lo esté.

### Key Entities *(include if feature involves data)*

- **Event**: Evento gestionado por el organizador y consultado por el público. Tiene una portada opcional y conserva su título, fecha, visibilidad y reglas vigentes.
- **Portada del evento**: Imagen asociada a un único evento en su presentación, con descripción alternativa propia opcional y alternativa derivada del título cuando falta. Puede estar ausente, guardada o en proceso de cambio; un fallo no sustituye el último estado guardado. Es un concepto de producto, sin prescribir una entidad de persistencia nueva.
- **TicketType, Ticket y Registration**: Entidades distintas que conservan sus responsabilidades y comportamiento. La portada no representa ninguna de ellas ni modifica su relación con el evento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 — Consistencia**: En cada ancho de prueba, el 100 % de las zonas de portada de la cartelera conserva una misma proporción entre ancho y alto, tanto con imágenes como con marcadores. A igual ancho de zona, sus alturas coinciden con tolerancia de 1 px por redondeo. Con el mismo texto y ancho, cambiar entre una imagen horizontal, vertical, cuadrada o ausente modifica la altura total de tarjeta en 0 px. Un patrón de prueba con un círculo conserva su forma circular en la parte visible de la imagen.
- **SC-002 — Estabilidad**: Retrasando la carga de cada portada 5 segundos y repitiendo con fallo de carga, el título, la fecha, la acción de reserva y el inicio del contenido posterior se desplazan 0 px por causa de la portada en cartelera y registro. Durante la espera se pueden leer los datos y acceder a las acciones permitidas.
- **SC-003 — Ausencia y fallo**: En el 100 % de los casos sin imagen, con imagen inaccesible o tras quitarla correctamente, ambas páginas muestran el marcador de FR-010 sin iconos rotos ni huecos vacíos. Se verifican sus colores, tipografía y geometría contra DESIGN.md.
- **SC-004 — Legibilidad**: El título, la fecha y el texto de la acción de reserva mantienen un contraste mínimo de 4,5:1 para texto normal y 3:1 para texto grande (al menos 24 px sin negrita o 18,67 px en negrita), cualquiera que sea la portada. Las muestras incluyen imagen blanca, negra, de alto contraste y con texto incrustado. Ningún recorte, superposición o truncado impide leer el título completo, la fecha o la acción.
- **SC-005 — Adaptación**: A 375 px y 1440 px de ancho, a zoom del 100 %, todas las combinaciones de la matriz visual permiten consultar el evento y llegar a la acción de reserva sin desbordamiento horizontal de página. Las acciones de portada y reserva tienen foco visible, orden de teclado coherente y controles de al menos 48 px de altura; con movimiento reducido no se añaden animaciones de carga.
- **SC-006 — Alternativas accesibles**: El 100 % de las portadas de la matriz visual exponen la descripción escrita por el organizador o la derivada del título cuando no existe una propia. Se comprueban descripción vacía, solo espacios, texto propio y cambio de título en ambas páginas.
- **SC-007 — Control del organizador**: Subir, sustituir, quitar y editar la descripción producen el estado guardado esperado al volver a abrir el evento en el 100 % de los escenarios de éxito. Los escenarios de fallo conservan los otros datos y la última portada guardada, con un error propio y posibilidad de reintento. Los intentos sin permiso producen 0 cambios.
- **SC-008 — Continuidad de la reserva**: Para los mismos eventos y condiciones de disponibilidad, los resultados de publicación y reserva coinciden antes y después de añadir, sustituir, quitar o provocar el fallo de una portada. No cambia ningún resultado de aforo, reserva o entrada debido a la imagen.
- **SC-009 — Actualización pública**: En el 100 % de los casos de alta, sustitución, eliminación y cambio de descripción guardados correctamente en eventos publicados, las nuevas visitas a cartelera y registro iniciadas después de confirmar el guardado muestran el mismo estado vigente, sin una publicación adicional. No se exige actualizar automáticamente páginas ya abiertas.

La matriz visual usa datos ficticios fijos: portadas horizontal, vertical y cuadrada; imágenes blanca, negra, de alto contraste y con texto; ausencia, carga retrasada y fallo; título corto y título largo. Se aplica a cartelera y registro en ambos anchos. La gestión se comprueba además en esos anchos, con estados en curso, éxito y error. Estos son criterios de aceptación futuros, no pruebas ya ejecutadas.

La revisión visual de la implementación DEBE hacerse con el skill `impeccable`, aplicando PRODUCT.md y DESIGN.md y registrando evidencias de los estados y tamaños anteriores. `impeccable` no se usa en esta fase de especificación. Esta revisión no autoriza un rediseño general del producto.

## Assumptions

- PRODUCT.md establece la prioridad del organizador y también el valor de descubrimiento y registro para el asistente. DESIGN.md y el skill `door-list-ui` delimitan la identidad visual; esta función la extiende a la portada sin sustituirla.
- Se conservan los permisos y la visibilidad existentes del evento conforme a la constitución. No se introduce un rol nuevo ni se da permiso de edición al rol de puerta.
- Supabase Storage es la restricción de almacenamiento indicada por el usuario. La configuración y su diseño técnico se decidirán en `plan`; esta especificación no define tablas, buckets, políticas, endpoints ni componentes.
- El alcance comprende una portada opcional por evento, su descripción alternativa y su presentación en las dos páginas indicadas. No incluye galerías, generación de imágenes ni portadas para correos o entradas.
- Las dimensiones originales pueden diferir de la zona de presentación y se aplica recorte automático centrado, sin ajuste manual. La proporción visual concreta se documentará en el diseño del plan y será uniforme en la cartelera.
- Los principios constitucionales de calendario, identidad, reservas y aforo conservan su vigencia. Esta función no los redefine ni acredita que el comportamiento existente ya los cumpla.

## Open Questions for `$speckit-clarify`

No quedan decisiones de producto pendientes de aclaración. Q1, Q2 y Q3 se resolvieron en la sesión 2026-11-24 y se integraron en los requisitos y escenarios de aceptación.
