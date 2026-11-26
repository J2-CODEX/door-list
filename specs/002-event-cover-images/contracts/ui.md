# Contrato de UI: gestión y presentación de portadas

Fuentes: FR-001–017 y SC-001–009 de [spec.md](../spec.md), `DESIGN.md`, `PRODUCT.md` y `.agents/skills/door-list-ui/`. Este es diseño previo a implementación; no acredita revisión visual ejecutada. La checklist [ux.md](../checklists/ux.md) conserva sus marcadores pendientes.

## Superficies y jerarquía

- **Organizador, modo operativo**: una sección «Portada del evento (opcional)» dentro del panel de edición existente, después de información del evento. Orden: ayuda previa, selección, previsualización 16:9, descripción alternativa, estado y acciones. No crear formularios anidados; las acciones de portada son botones explícitos independientes del envío de los demás datos.
- **Cartelera**: portada antes del encabezado de cada tarjeta, manteniendo título, fecha, lugar y reserva sobre su superficie de lectura habitual.
- **Registro**: portada antes del resumen del evento; el formulario conserva su posición y sus reglas.
- **Geometría compartida**: ancho disponible, proporción 16:9 en los tres contextos, imagen centrada que llena el marco sin deformación. El marco existe antes de la respuesta de imagen. Cambio de archivo, espera o fallback no modifica su altura.

Reutilizar `Card`, `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `Input`, `Textarea`, `Button` y `Sheet` tras inspeccionar su implementación. El patrón nuevo de portada debe documentarse en las referencias de `door-list-ui` durante implementación; no cambiar escalas o primitivas ajenas. DESIGN.md y valores ejecutables actuales resuelven las referencias antiguas sobre variantes ya disponibles.

## Información antes de seleccionar

Etiqueta visible «Imagen de portada». Ayuda: «JPEG, PNG o WebP estático. Máximo 5 MiB. Ancho y alto entre 600 y 6000 px. La imagen se recorta desde el centro; parte de los bordes puede quedar fuera.»

Campo nativo para un solo archivo, sin herramienta propia de arrastre, edición o encuadre. El selector del sistema puede ofrecer sus fuentes habituales en móvil. Cancelar el selector conserva la selección anterior. Nombre largo puede partirse y no sustituye la descripción alternativa.

Descripción: «Descripción de la imagen (opcional)», con ayuda «Describe lo que aporta la imagen. Si lo dejas vacío, usaremos el nombre del evento.» No usar placeholder como etiqueta ni introducir un máximo de caracteres de producto no acordado.

## Estados de gestión

| Estado | Presentación y acciones |
| --- | --- |
| Lectura inicial | Reservar la geometría; «Cargando portada…»; distinguir fallo de lectura de ausencia |
| Fallo de lectura | «No pudimos consultar la portada.» y «Volver a intentar»; no ofrecer quitar una portada supuestamente vacía |
| Sin portada | Marcador y selección disponible; opcionalidad explícita |
| Guardada | Portada actual y descripción editable; «Elegir otra imagen», «Guardar descripción», «Quitar portada» |
| Selección local | Mostrar previsualización marcada «Vista previa sin guardar»; mantener separado el estado persistido; «Guardar portada» y «Descartar cambios» |
| Transferencia | «Subiendo imagen…»; indicador indeterminado, sin porcentaje inventado; mantener el estado guardado y evitar otro guardado concurrente desde ese editor |
| Validación/commit | «Revisando y guardando portada…»; no anunciar éxito antes del commit |
| Éxito | «Portada guardada.», «Descripción guardada.» o «Portada eliminada.» según operación; actualizar solo estado de portada |
| Error conocido | Mensaje propio asociado, portada anterior conservada y selección local disponible para reintento; no borrar los demás campos del evento |
| Resultado incierto | En una subida, consultar la operación por `uploadId`; en edición de descripción o eliminación, consultar el estado actual sin `uploadId`; «Consultando el resultado…» y reintento de consulta; conservar borrador y no afirmar reversión ni guardar otra vez a ciegas |
| Conflicto | Explicar que otra edición cambió la portada; ofrecer «Actualizar portada» y conservar selección/descripcion local hasta decisión explícita |
| Sesión vencida | Mantener campos mientras la página exista, indicar que debe iniciar sesión y deshabilitar mutaciones hasta recuperar acceso |

Solo una operación de portada por editor. Una espera de red sin resultado durante 60 segundos pasa a reconciliación; abortar una petición del navegador no se considera cancelación de un commit del servidor. La intención de subida expira a los 30 minutos; tras caducar, crear otra intención. Ese plazo no corresponde a las mutaciones de descripción o eliminación. Durante una petición crítica puede bloquearse el cierre siguiendo el patrón actual de Sheet; cuando se llegue a reconciliación o error, permitir salir conservando el último estado guardado.

Para descripción/eliminación sin respuesta, seguir [Recuperación de PATCH y DELETE sin respuesta](api.md#recuperación-de-patch-y-delete-sin-respuesta). Si la consulta muestra el cambio solicitado, anunciar «La descripción actual coincide con el cambio solicitado.» o «El evento está sin portada.»; no anunciar «Descripción guardada.» o «Portada eliminada.» como resultado de esa petición incierta. Mantener el borrador hasta «Descartar cambios» o «Usar estado actual», acciones explícitas dentro de la sección, sin otro diálogo. Si sigue la revisión base sin el cambio, mostrar «No pudimos confirmar el cambio. Puedes volver a intentarlo.» y ofrecer reintento explícito con la revisión original. Si otra revisión muestra un cambio distinto, presentar conflicto y «Actualizar portada», conservando lo escrito hasta que la persona decida; actualizar no autoriza guardar automáticamente sobre esa revisión. Un fallo de consulta conserva los datos y permite «Volver a consultar», con mutaciones deshabilitadas. La descripción solo coincide si también coincide la imagen que se estaba describiendo.

«Descartar cambios» restaura archivo y descripción del último estado consultado. Cerrar el panel sin una operación pendiente descarta únicamente los cambios locales de portada; no quita la portada guardada. No añadir otro diálogo de confirmación. Tras error no se cierra el panel automáticamente.

## Creación de un evento

Se permite elegir una portada local antes de crear. El envío «Crear evento» guarda los datos existentes y obtiene el ID; no presenta una transacción conjunta con la imagen. Si hay portada pendiente, el panel permanece abierto y anuncia «Evento creado. Guarda ahora la portada.»; la sección habilita «Guardar portada». Si no hay portada pendiente, el cierre habitual permanece. Un fallo posterior de imagen no vuelve a crear el evento ni revierte los datos ya guardados. No asociar ni publicar automáticamente una imagen por el hecho de crear.

En edición, «Guardar cambios» sigue guardando los demás datos; si queda portada local pendiente, el panel permanece abierto e indica que falta guardar la portada. La actualización de metadatos no reinicia el formulario ni sus valores. El organizador puede crear, guardar o publicar sin imagen según las reglas existentes.

## Presentación pública y alternativas

Marco en superficie oliva suave, con texto «Sin imagen de portada» en verde bosque/oliva de lectura para ausencia y error. Decoración simple `aria-hidden`, sin simular fotografía. El texto visible constituye la alternativa del marcador; no anunciar dos veces una imagen ficticia con el mismo contenido.

Imagen real con `alt` propio o título vigente; el nombre de archivo nunca es alternativa. En espera, conservar marco y contenido esencial; no anunciar por lector de pantalla cada imagen de una cartelera. Ante error ocultar el elemento roto y mostrar marcador en el mismo marco. Reiniciar el fallback cuando cambie `imageId`. La imagen es informativa; no añadirle un enlace redundante cuando la acción de reserva ya está disponible.

No esperar a que cargue la imagen para presentar o habilitar la reserva. No mostrar información esencial exclusivamente en la fotografía. Los cambios guardados se ven en nuevas visitas desde el commit; las páginas abiertas no requieren actualización automática. Durante ediciones posteriores cada visita obtiene el estado vigente de ese momento, sin prometer una instantánea entre dos peticiones separadas.

## Accesibilidad y adaptación

- Labels asociados, ayudas y errores vinculados al campo; estado de operación anunciado con región de estado y error anunciado una sola vez, sin duplicar `role=alert` de FieldError.
- Todas las acciones accesibles por teclado; orden acorde al contenido. Al desaparecer «Quitar portada», foco al selector de imagen; tras guardar, conservar foco en acción estable o encabezado de sección si la acción desaparece. No enviar foco al inicio de la página.
- Contraste de texto normal ≥4,5:1 y grande ≥3:1; indicadores y bordes de controles afectados con objetivo de 3:1 contra su entorno; foco visible no oculto por el pie del panel. No afirmar certificación global de accesibilidad.
- Altura mínima de controles de 48 px, ayudas legibles, título y datos esenciales sin truncado. El marco no produce scroll horizontal de página.
- Aceptación obligatoria a 375 y 1440 px; referencias adicionales a 390×844 y 1280×900. Incluir teclado, texto largo, ampliación de texto al 200 % y movimiento reducido. No sustituir los tamaños de aceptación por los de referencia.
- Sin animaciones añadidas con movimiento reducido. Evitar progreso ficticio y transiciones decorativas; la reserva conserva su disponibilidad durante esperas de imagen.

La revisión visual de la implementación utilizará `impeccable`, con evidencias de estados y tamaños indicados, conforme a la especificación. Este contrato no autoriza un rediseño general.
