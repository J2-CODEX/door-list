# Door List

Landing de un evento con Next.js, App Router, TypeScript y Tailwind CSS v4.
Solo utiliza las dependencias del scaffold. No incluye autenticación ni base de datos.

## Desarrollo

Requiere Node.js 20.9 o superior y npm.

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Producción

```bash
npm run build
npm start
```

## Estructura

- `app/page.tsx`: única landing en `/`, con un evento hardcodeado y botón «Registrarme» sin funcionalidad.
- `app/layout.tsx`: layout raíz, idioma español y metadatos.
- `app/globals.css`: importación de Tailwind CSS v4 y estilos globales.

Puedes modificar los datos del evento en la constante `event` de `app/page.tsx`.
