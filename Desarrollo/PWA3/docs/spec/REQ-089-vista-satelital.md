# REQ-089 - Vista satelital (NDVI) en pivote, red de sensores y estacionario

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-08) - probar: usuario. Fuente de imagenes **provisional** |
| Alcance | `logic/satelite.js` (nuevo), `core.js` (capa NDVI), `index.html` (menu lateral), `components/sistema/panel-sensores/`, `panel-estacionario/`, `paneles.css`, `style.css` |
| Pruebas | 402/402 en Node (8 nuevas en `satelite.test.js`) |
| Compilacion | `26.11.08.013` |

## Pedido (antes de la integracion con DTA-AgroSat)

| Donde | Que |
|---|---|
| Menu lateral de pivote, red de sensores y estacionario | "Vista satelital" antes de "Usuarios" |
| Barra flotante de red de sensores y estacionario | "Satelite" entre Sensores/Planes y Usuarios; en el celular se oculta Usuarios |
| Satelite (red y estacionario) | Muestra/oculta el NDVI de **todas las parcelas del usuario** a la vez |
| Pivote | Desde el menu lateral, el NDVI del **area circular del pivote** |

## Implementacion

- `logic/satelite.js`: Web Mercator, rectangulo de cada area (poligono o circulo, con 4 % de margen), tamaño de
  imagen a ~5 m por pixel (32..1024 px), URL de la imagen, recorte en coordenadas de la imagen y lista de parcelas del
  usuario (areas de sensores y parcelas de estacionarios con contorno valido).
- Mapa: una imagen por area (`L.svgOverlay`) **recortada al contorno** (`clipPath` de poligono o circulo), en un panel
  propio **debajo de las parcelas** (z 350): las parcelas se siguen pudiendo tocar; con la imagen visible su sombreado
  pasa a casi transparente (quedan los bordes). Leyenda "Vigor (NDVI) · Escaso -> Vigoroso · Sentinel-2 · Esri, ESA".
- En una red de sensores en mosaico, activar Satelite pasa al mapa. Al cambiar de sistema la vista se apaga.
- Sin parcelas o sin ubicacion del pivote: aviso. Si la imagen no carga: aviso una vez.
- Menu: marca ✓ cuando esta activa. Barra: "Satelite" resaltado (verde) cuando esta activa.

## Fuente de imagenes (provisional)

DTA-AgroSat usa Copernicus Data Space (Sentinel Hub) a traves de `server/sentinel.php`, que exige **sesion de AgroSat**
(y 300 consultas al dia por cuenta): PWA3 (Firebase, otro dominio) no puede usarlo hasta la integracion. Mientras tanto
se usa el servicio publico de Esri **Sentinel-2 Views** (`sentinel.arcgis.com`, render "NDVI Colormap", mejor imagen
reciente de los ultimos 14 meses), que respondio sin credenciales. Para cambiar de fuente basta con `urlNdvi`.

**Pendiente**: (1) confirmar los terminos de uso de Esri para uso comercial; (2) la imagen no se pudo probar en vivo
desde el entorno de desarrollo (sin salida a internet): probar en el navegador; (3) la fecha de la imagen no se
muestra (mosaico); con Sentinel Hub (integracion) se podra elegir y mostrar la fecha, como en AgroSat.

REQ-090 (2026-11-08): el texto "Satelite" de la barra flotante se alinea con "Historial" y "Sensores/Planes" (misma
compensacion de -10 px que "Historial", que usa el mismo tipo de icono). Compilacion `26.11.08.014`.
