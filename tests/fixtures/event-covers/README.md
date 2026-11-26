# Fixtures de portadas

Ejecutar `node tests/fixtures/event-covers/generate.mjs` con sharp ya instalado.
El generador no instala dependencias ni accede a servicios. Los binarios derivados
se guardan en `generated/`, ignorado por Git; su manifiesto incluye pesos exactos.

Hay JPEG/PNG/WebP, límites independientes de ancho y alto, 36 MP, tres pesos
alrededor de 5 MiB, transparencia, orientación EXIF, corrupción, cero bytes,
extensión incorrecta y contenedores animados APNG/WebP. El relleno de tamaño es
un chunk PNG auxiliar válido con CRC. Las imágenes de geometría contienen círculo,
cruz central y bordes, en horizontal/vertical/cuadrado; blanco y negro sirven
para revisar contraste. El harness aporta títulos cortos y largos fijos.
