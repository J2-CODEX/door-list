# Portadas de desarrollo

Siete portadas de ejemplo a partir de seis fotografías de Unsplash, descargadas y convertidas a WebP de 1280 × 720 px. «Noche de jazz íntimo» reutiliza la fotografía de concierto con una ruta de objeto propia. Son imágenes ilustrativas; no representan los lugares ni las personas de los eventos ficticios. Uso conforme a la [licencia de Unsplash](https://unsplash.com/license).

`npx supabase seed buckets --remote=TU_PROJECT_REF` carga únicamente el contenido de `event-covers/` al bucket privado del mismo nombre en el proyecto de desarrollo en la nube. Sustituye `TU_PROJECT_REF` por el identificador del mismo proyecto donde ejecutaste `supabase/seed.sql`. La ruta relativa de cada archivo es `<eventId>/<imageId>.webp`, coincidente con `public.event_covers` en la semilla. Este README queda fuera del directorio de objetos para que no se suba al bucket. La carga no necesita Docker, una base local, descargar fotografías ni instalar paquetes adicionales si ya tienes Supabase CLI.

| Evento | Archivo dentro de `event-covers/` | Fuente |
| --- | --- | --- |
| Encuentro de comunidades creativas | `d0010000-0000-4000-8000-000000000001/d0040000-0000-4000-8000-000000000001.webp` | [Fotografía de encuentro](https://images.unsplash.com/photo-1511795409834-ef04bbd61622) |
| Música en el patio | `d0010000-0000-4000-8000-000000000002/d0040000-0000-4000-8000-000000000002.webp` | [Fotografía de concierto](https://images.unsplash.com/photo-1514525253161-7a46d19cd819) |
| Laboratorio de tecnología abierta | `d0010000-0000-4000-8000-000000000003/d0040000-0000-4000-8000-000000000003.webp` | [Fotografía de trabajo en equipo](https://images.unsplash.com/photo-1517048676732-d65bc937f952) |
| Sabores de nuestra tierra | `d0010000-0000-4000-8000-000000000004/d0040000-0000-4000-8000-000000000004.webp` | [Fotografía gastronómica](https://images.unsplash.com/photo-1414235077428-338989a2e8c0) |
| Taller de arte y color | `d0010000-0000-4000-8000-000000000005/d0040000-0000-4000-8000-000000000005.webp` | [Fotografía de pintura](https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b) |
| Caminata por el bosque | `d0010000-0000-4000-8000-000000000006/d0040000-0000-4000-8000-000000000006.webp` | [Fotografía de bosque](https://images.unsplash.com/photo-1441974231531-c6227db76b6e) |
| Noche de jazz íntimo | `d0010000-0000-4000-8000-000000000007/d0040000-0000-4000-8000-000000000007.webp` | [Fotografía de concierto reutilizada](https://images.unsplash.com/photo-1514525253161-7a46d19cd819) |

Las fuentes se descargaron añadiendo `?w=1280&h=720&fit=crop&q=85`; la conversión final usó `sharp` con orientación automática, recorte 16:9 y calidad WebP 82. Los archivos finales están versionados, sin dependencias de URLs externas al ejecutar la aplicación.
