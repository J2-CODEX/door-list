### Instalar
`npx impeccable install`

### Crear PRODUCT.md
`$impeccable init`

### Crear DESIGN.md
`$impeccable document`

### Diagnostico
`$impeccable critique the events home page`

### Perfeccionar
`$impeccable polish the events home page`

### Tarea
http://localhost:3000/entradas/084a54b10bf94050a0b7c5d1d7ec3ea4fe83bd41b1d24fc0a98264683da48723


### Instalacion Spec-Kit
```
brew install uv
uv tool install specify-cli
specify init --here --integration codex
```
### Spec constitution
```
$speckit-constitution Reglas que no se negocian en door-list:

Método
- Toda feature nueva o cambio de comportamiento entra por una spec en
  specs/. Nada de cambios de producto por prompt suelto.
- Ninguna regla de negocio vive solo en un trigger, una función SQL o el
  código: si está ahí, está también en una spec que la explique.
- Todo cambio de esquema vive en una migración nueva; las migraciones ya
  aplicadas no se reescriben.

Calendario
- Toda fecha se guarda en UTC y cada evento guarda su propia zona horaria;
  mostrar fechas, abrir y cerrar el registro y permitir el ingreso se
  calculan con esa zona, nunca con una constante.
- El cierre del registro y la ventana de ingreso son campos explícitos del
  evento; no se deducen de "el día del evento".

Identidad y cantidad
- Cada entrada identifica a un asistente; cuántas entradas puede reservar
  un email se decide en la spec, no en un índice único.
- Una reserva con email sin verificar caduca y libera su cupo.

Aforo
- Toda regla de aforo debe tener un criterio de aceptación con número.
- El aforo del evento es el límite global; un cupo por tipo de entrada solo
  es estricto si el organizador lo declara.
- Ningún límite puede bajarse por debajo de lo ya consumido.
- Un evento no se publica sin al menos un tipo de entrada con cupo.

Acceso
- Todo identificador que viaje en un QR o en una URL pública debe ser
  imposible de adivinar o enumerar, y su vista pública no muestra nombre
  ni email.
- Operar la puerta es un rol por evento, separado de editar y exportar.
- Una entrada revocada se conserva con su estado: sale de la lista
  operativa, no de la base ni de la exportación de auditoría.
```