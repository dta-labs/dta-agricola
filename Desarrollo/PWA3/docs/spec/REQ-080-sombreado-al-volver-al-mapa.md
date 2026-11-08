# REQ-080 - El sombreado de las parcelas se perdia al volver del mosaico al mapa

| Campo | Valor |
|---|---|
| Estado | **Diagnostico incompleto**: la causa principal era otra, ver REQ-081 (se conserva el redibujado al volver) |
| Alcance | `core.js` (`toggleSensorMapView`, `setDeviceData`, nueva `volverAMostrarMapa`) |
| Pruebas | 385/385 en Node (1 nueva) |
| Compilacion | `26.11.08.004` |

## Causa

En la vista de mosaico el mapa queda oculto (0x0), pero los datos siguen llegando y las areas se actualizan en su
sitio (REQ-067: `setLatLngs` -> `redraw`). Leaflet recorta cada poligono a la zona visible del mapa, que con el mapa
oculto es nula: los poligonos quedaban vacios aunque siguieran en el mapa. Al volver solo se llamaba a
`invalidateSize()`, que no siempre vuelve a recortarlos.

## Correccion

`volverAMostrarMapa()`: tras `invalidateSize()`, redibuja todas las capas vectoriales (`L.Path`: parcelas, rayas de
lectura vieja, sectores; no las teselas, que no se vuelven a descargar) y repinta las areas de la red. Se usa al pulsar
el boton de mapa y al seleccionar una red cuya vista guardada es "mapa" viniendo de otra en mosaico (REQ-078).

Nota: diagnostico por el funcionamiento de Leaflet con el contenedor oculto; no se reprodujo en navegador.
