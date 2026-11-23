# Research: Mensaje de aforo mínimo por tipo de entrada

**Date**: 2026-11-23 | **Feature**: [spec.md](spec.md)

## 1. Clasificar la causa real del rechazo

**Decision**: Usar una lista cerrada de parejas `code` + `message` en un helper puro. El código `23514` solo no identifica la regla fallida.

**Rationale**: `app/organizador/page.tsx`, en `saveTicketType`, sustituye todos los errores de esa clase por el mensaje de máximo. `supabase/migrations/20261106120000_public_registration.sql`, en `check_ticket_capacity`, lanza el mismo código para mínimo, máximo y movimiento de tipo con registros. `supabase/migrations/20261110120000_entity_vocabulary.sql` renombra la función a `check_ticket_type_capacity` sin cambiar esas reglas. Las dos parejas relevantes están detalladas en el contrato; no se imprime ningún campo recibido del proveedor.

**Alternatives considered**:

- Distinguir solo por `code`: no separa las causas.
- Buscar palabras como «aforo» o «registros»: podría clasificar errores diferentes de forma incorrecta.
- Consultar el total antes del update: añade red, permisos y posibles fallos, y puede quedar desactualizado antes del guardado.
- Migrar a códigos distintos o identificadores de dominio en `details`: sería más estable a largo plazo, pero requiere nueva migración y coordinación de despliegue; innecesario para el fallo acotado.
- Crear un endpoint o Server Action: ampliaría la arquitectura sin necesidad de cambiar la operación actual.

**Risk**: Acoplamiento con los textos exactos de excepciones del repositorio. Mitigación: parejas exactas, pruebas de contrato con fixtures y fallback para desconocidos. El estado remoto no fue inspeccionado; la validación integral posterior detectará divergencias de despliegue.

## 2. Contrato del SDK existente

**Decision**: Reutilizar mediante import de tipo `PostgrestError` de `@supabase/supabase-js` y limitar la entrada del helper con `Pick<PostgrestError, "code" | "message">`. No crear otra entidad ni redefinir errores por archivo.

**Rationale**: La versión instalada es 2.119.0. Su `src/index.ts` exporta PostgrestError y el paquete instalado `@supabase/postgrest-js/src/PostgrestError.ts` declara `message`, `code`, `details` y `hint`; no ofrece un campo `constraint`. Los triggers revisados no asignan identificadores distintos a details/hint.

**Alternatives considered**: Comprobar un campo `constraint` inexistente; usar details/hint sin que la persistencia los fije; introducir una biblioteca traductora.

**Source**: Consulta de documentación oficial con Context7, contrastada con el SDK instalado: [PostgrestError](https://github.com/supabase/supabase-js/blob/master/packages/core/postgrest-js/src/PostgrestError.ts) y [PostgrestBuilder](https://github.com/supabase/supabase-js/blob/master/packages/core/postgrest-js/src/PostgrestBuilder.ts). La recomendación general de usar códigos estables requiere aquí desambiguación adicional porque el mismo código agrupa tres causas; el texto exacto se usa como adaptador de compatibilidad, no como mensaje visible.

## 3. Next.js y límite cliente

**Decision**: Conservar la ruta actual y su límite cliente. Tratar el rechazo de negocio como resultado esperado que se presenta en el formulario, sin una página de error global.

**Rationale**: Next.js instalado es 16.4.5. Su documentación oficial local indica que las páginas son Server Components por defecto y que el estado y los manejadores de eventos requieren cliente. `app/organizador/page.tsx` ya usa sesión, hooks y eventos; el helper será TypeScript puro, sin una nueva directiva de cliente.

**Alternatives considered**: Migrar toda la ruta a otro patrón de escritura o añadir error.tsx para un fallo de validación esperado; ambas amplían el alcance.

**Sources**: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` y `10-error-handling.md`, incluidos en la versión instalada; referencias públicas: [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Error Handling](https://nextjs.org/docs/app/getting-started/error-handling).

## 4. Estado del formulario y accesibilidad

**Decision**: Mantener Notice con role alert, el diálogo abierto, los valores y la salida anticipada al fallar. Asociar el aviso al campo Aforo cuando la causa corresponda al aforo; mantener la ayuda existente. No cambiar geometría, colores ni componentes canónicos.

**Rationale**: El flujo actual ya conserva los valores en la rama de error. `components/ui/notice.tsx` propaga atributos accesibles. La skill `door-list-ui` exige conservar lo escrito y anunciar errores propios. Sus referencias y ejemplo de formulario se revisaron para el diseño.

**Alternatives considered**: Cerrar y reabrir el diálogo, borrar datos o mostrar el mensaje crudo del proveedor; incumplen el flujo esperado.

## 5. Validación proporcional y concurrencia

**Decision**: Añadir pruebas focalizadas de clasificación y flujo, sin red real. Mantener separada la validación transaccional contra una base aislada autorizada.

**Rationale**: `tests/login.test.mjs` muestra helpers con node:test; `tests/dashboard.test.mjs` carga módulos con TypeScript/VM y dependencias inyectadas; `tests/attendees.test.mjs` sustituye global.fetch del SDK; `tests/dashboard-query.test.mjs` usa estado y promesas diferidas. No hacen falta dependencias. El trigger y register_attendee declaran bloqueo sobre el Event; simular su error acredita la reacción de la UI, no el bloqueo real.

**Alternatives considered**: Ejecutar pruebas integrales existentes sin revisar efectos: pueden consultar DB, crear eventos y enviar correo. No se ejecutan en planificación.

## Resultado

Todas las decisiones técnicas necesarias están resueltas. Se conserva la regla de cómputo de FR-009 y el alcance aprobado. No se accedió a bases de datos ni se instalaron dependencias; los hallazgos de persistencia provienen de leer archivos SQL.
