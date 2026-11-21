# REQ-117 - Mapa encuadrado en la zona del equipo

| Campo | Valor |
|---|---|
| Estado | **Corregido** (2026-11-20) - probar: usuario |
| Alcance | `logic/geo.js` (`limitesDeEquipo`), `core.js` |
| Pruebas | 471/471 en Node (2 nuevas en `test/unit/geo.test.js`) |
| Compilacion | `26.11.20.018` |

## Problema
Al entrar a la vista de mapa, los equipos salian muy desplazados de su zona y parecia que no se mostraba nada.
Causa: el mapa se centraba (`setView`) cuando la pantalla del sistema aun estaba oculta (0x0); al hacerse visible,
Leaflet recalculaba el tamaño sin desplazar (`invalidateSize({ pan: false })`, REQ-110), de modo que el punto
centrado quedaba en la esquina superior izquierda. Ademas solo se usaba la ubicacion del equipo, que en las redes de
sensores puede estar lejos de los sensores.

## Solucion
- `geo.limitesDeEquipo(sistema)`: la zona del equipo. Red de sensores: puntos y parcelas de sus sensores; estacionario:
  sus parcelas; pivote central: el circulo (radio `length`); si no hay nada, la ubicacion del equipo. Se ignoran los
  puntos (0, 0) y los que estan a mas de 20 km de la mediana (un sensor mal ubicado no aleja el mapa).
- `core.js`: al entrar a un equipo y al volver de mosaico a mapa se pide el encuadre; se hace en cuanto el mapa tiene
  tamaño (al momento si ya se ve, o cuando el contenedor se hace visible). `fitBounds` con margen de 40 px y zoom
  maximo 17 (un solo punto: zoom 16).
- Los ajustes que llegan del mismo equipo mientras se mira ya no recentran el mapa (antes, cada cambio de ajustes
  volvia a `setView`); al volver al listado y entrar de nuevo, se encuadra otra vez.
