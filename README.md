# Door List

Aplicación Next.js para mostrar un evento y gestionar eventos y tipos de entrada de organizadores.

## Configuración

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` a `.env.local` y configura la URL y la clave pública (anon o publishable) de tu proyecto Supabase. Nunca uses la clave de servicio en el navegador.
3. Aplica las migraciones de `supabase/migrations` en orden a tu proyecto Supabase.
4. Habilita el acceso por correo y contraseña en Supabase Auth y crea las cuentas de organizador allí.
5. Ejecuta `npm run dev` y entra en `/organizador`.

Cada usuario autenticado administra únicamente sus propios eventos gracias a las políticas RLS. Los eventos publicados y sus tipos de entrada son visibles públicamente mediante la API de Supabase. La landing de `/` sigue mostrando datos de ejemplo.

Cada evento tiene un límite de asistentes. La suma del aforo de sus tipos de entrada no puede superar ese límite; tampoco se puede reducir el límite por debajo de la suma asignada. La regla se comprueba en la interfaz y en la base de datos, incluso para operaciones concurrentes. Las fechas se introducen y muestran en la zona horaria del navegador.
