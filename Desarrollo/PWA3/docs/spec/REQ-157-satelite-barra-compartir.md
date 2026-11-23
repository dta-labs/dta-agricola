# REQ-157 - Vista satelital más ágil, barra inferior en iPhone y "Compartir la app" en el menú lateral

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario (iPhone y vista satelital con conexión real) |
| Alcance | `logic/satelite.js`, `services/cache-satelite.js` (nuevo), `core.js` (NDVI), `css/style.css`, `components/sistema/paneles.css`, `components/comunes/compartir-app/*` (nuevo), `components/ayuda/*`, `index.html` |
| Pruebas | 6 en `test/unit/satelite-cache-compartir.test.js`; 4 ajustadas (ayuda, estructura, satelite) |
| Compilacion | `26.11.22.033` |

## 1. Vista satelital (pivotes, estacionarios, redes de sensores)

- **Progreso**: mientras llegan las imágenes, un aviso sobre el mapa con spinner, "Cargando imágenes satelitales
  3 de 12" y barra. Al terminar desaparece; si alguna falló (también con el render de respaldo de Esri):
  "N imágenes no se pudieron cargar · **Reintentar**".
- **Todas las áreas del usuario a la vez**, sin importar el equipo abierto (`satelite.areasDelUsuario`): círculo de
  cada pivote central con ubicación (0,0 = sin ubicación) y parcelas de todas las redes de sensores y estacionarios.
  Antes, en un pivote solo se veía su círculo y en los demás no aparecían los pivotes.
- **Copia local** (`services/cache-satelite.js`, Cache Storage `dta-satelite-v1`):
  - sin copia: se descarga, se guarda y se muestra;
  - con copia: se muestra al instante; como mucho cada **12 h** por área se consulta el catálogo de Sentinel-2
    (`ImageServer/query`, `acquisitiondate` más reciente del rectángulo) y **solo si hay una imagen posterior a la
    descarga** se vuelve a pedir y se cambia en el mapa;
  - copias sin usar en 90 días se borran; si el navegador no tiene Cache Storage o el servicio no deja leer la imagen
    (CORS), se usa la URL directa como antes.
  - CSP: `connect-src` incluye `https://sentinel.arcgis.com`.

## 2. Barra inferior cortada en iPhone (pivote y estacionario)

La barra estaba en `top: calc(100vh - 65px)`: en Safari de iPhone `100vh` es más alto que lo visible (barra del
navegador) y quedaba por debajo. Ahora está anclada abajo (`bottom: 0`) con el margen del área segura
(`env(safe-area-inset-bottom)`). El mapa usa `100dvh` como respaldo (el alto real ya lo ajusta `ajustarAltoDelSistema`).

## 3. Compartir la app (pie del menú lateral, antes de la versión)

`<dta-compartir-app>`, solo iconos: **WhatsApp**, **Telegram**, **Correo** (asunto y texto), **SMS**, **Copiar
enlace** (aviso "Enlace copiado"), **QR** y **Más** (hoja de compartir del sistema, si el navegador la tiene).
El QR se abre a pantalla completa: fondo oscuro, hoja blanca, código negro puro lo más grande posible
(`min(80vw, 62vh, 520px)`, bordes nítidos), "Escanea con la cámara del teléfono" y la dirección; se cierra con el
botón, tocando fuera o con Escape. La sección "Compartir la aplicación" sale de la Ayuda.

Nota: el QR actual (`assets/images/qr-app.png`) apunta a `http://dta-agricola.web.app` (Firebase lo pasa a https).
