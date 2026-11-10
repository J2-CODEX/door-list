---
name: door-list-ui
description: Aplica el sistema visual de Door List al crear, modificar o revisar pantallas, formularios, tablas y componentes de UI de este repositorio, incluidos sus estados y comportamiento responsive. No aplica a tareas exclusivamente de API, base de datos o lógica sin cambios visuales.
---

# Door List UI

Mantén la identidad del proyecto con medidas, componentes y estados definidos. Aplica esta skill también a cambios pequeños de UI, como añadir una columna o corregir un campo.

## Fuentes y alcance

- Respeta `AGENTS.md` en la raíz del repositorio. Esta skill añade reglas visuales y no sustituye sus convenciones ni permisos.
- Lee [visual-system.md](references/visual-system.md) para cualquier cambio visual.
- Para los componentes afectados, lee [component-patterns.md](references/component-patterns.md) y abre el ejemplo correspondiente. Los paths `@/` de los ejemplos apuntan a la raíz del proyecto.
- Usa [acceptance-cases.md](references/acceptance-cases.md) para elegir comprobaciones y evaluar activación.
- Antes de escribir código de Next.js, consulta la versión realmente instalada en `node_modules/next/package.json` y su documentación oficial. Si existe, consulta `node_modules/next/dist/docs/`; usa Context7 o documentación oficial como alternativa. No deduzcas la versión instalada del rango de `package.json`.

## Reglas esenciales

1. Reutiliza los componentes canónicos de las referencias. Inspecciónalos antes de asumir props o variantes nuevas. No copies su CSS por pantalla.
2. Usa los valores y roles de `visual-system.md`. Si falta un token, añádelo a `app/globals.css` dentro del cambio de UI autorizado. Evita nuevos colores literales en consumidores y mantén los valores ejecutables centralizados en CSS y componentes.
3. Reserva `className` de consumidores para distribución, ancho y separación externa. Cambia colores, padding interno, radios y tipografía de controles mediante variantes explícitas en su componente canónico.
4. Usa Server Components por defecto. Añade `"use client"` para estado, efectos, eventos o APIs del navegador; conserva el límite en el componente interactivo más pequeño que resulte práctico.
5. Coloca componentes exclusivos junto a su ruta en `app/`; comparte en `components/` los usados por dos o más rutas. Usa `components/ui/` para primitivas y `lib/` para lógica, tipos compartidos y formato.
6. Usa identificadores en inglés y UI en español. Mantén Event, TicketType, Ticket y Registration como entidades distintas. Reutiliza tipos y helpers de `lib/`.
7. Distingue carga inicial, error inicial, vacío, sin coincidencias, contenido, actualización y fallo de actualización. No conviertas un error en una lista vacía ni borres el último resultado al actualizar.
8. Si falta un patrón, compón con las reglas existentes y comunica la decisión nueva al entregar. No inventes otra paleta, familia tipográfica o escala. Si el usuario pide cambiar el sistema, actualiza juntos sus reglas, ejemplos e implementación afectada.

## Forma de trabajo

1. Identifica componentes, estados y tamaños afectados por la petición.
2. Inspecciona sus implementaciones y el ejemplo aplicable antes de editar.
3. Aplica el patrón al alcance pedido. Las discrepancias heredadas no autorizan una migración general.
4. Verifica los estados afectados con datos ficticios fijos. Los ejemplos de esta skill no consultan servicios ni bases de datos.
5. Ejecuta las comprobaciones locales pertinentes disponibles. Revisa los comandos antes de ejecutar builds, servidores o pruebas: no accedas a una base de datos ni instales dependencias sin la confirmación exigida por `AGENTS.md`.
6. Si hay vista previa disponible sin acceso a datos reales, comprueba 390 × 844 y 1280 × 900 px, teclado, texto largo y movimiento reducido. No añadas rutas públicas de demostración salvo petición expresa.
7. Entrega un resumen del cambio, comprobaciones realizadas, decisiones nuevas y verificaciones pendientes. No afirmes haber hecho revisión visual si solo comprobaste tipos o HTML.

## Criterio de finalización

El cambio usa componentes y valores acordados, cubre los estados aplicables y conserva la estructura responsive. Un ejemplo de referencia no equivale a una funcionalidad conectada: conecta acciones y datos reales únicamente dentro del alcance autorizado.
