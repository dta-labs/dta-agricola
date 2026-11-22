# REQ-120 - Ajustes de la red de sensores: estacion meteorologica local

| Campo | Valor |
|---|---|
| Estado | **Sustituido** por REQ-121 (2026-11-20), sin publicar |
| Alcance | `index.html` (`#modalAdjust`, fila `ajusteEstacion`), `core.js` (`setMachineSettings`) |
| Pruebas | 4 nuevas en `estacion-meteorologica.test.js` |
| Compilacion | `26.11.20.021` |

## Pedido

Crear la clave `settings.station` en los sistemas para asignar a cada productor su estacion meteorologica local:
sus datos climaticos son mas certeros que los de los servicios meteorologicos.

## Contexto

Los Web Services v7 (`Desarrollo/WS/v7`, `updateSensorDB.php`) completan la HR y la temperatura que le falten a un
sensor con: promedio de los demas sensores -> **estacion local** (`estaciones.php`, codigo como `_fac`) -> Open-Meteo.
La estacion se lee de `systems/{red}/settings/station`; si no existe, de la tabla del servidor
(`lib/SensorNetwork.php`). Para crear la clave en los 19 sistemas de esa tabla: `php tools/migrar_station.php --aplicar`.

## Solucion

- Fila **"Estacion meteorologica"** en "Ajustes del sistema", solo en redes de sensores (`Sensor`), antes de la WiFi
  del gateway. Campo de texto editable con el lapiz (como el resto de ajustes) y sugerencias de las estaciones
  conocidas (`_bac`, `_bas`, `_fac`, `_lac`, `_lbr`, `_lju`, `_mmi`, `_mrc`, `_nal`, `_osm`, `_ros`); admite otros
  codigos para estaciones nuevas.
- Al confirmar los ajustes se guarda en `settings.station` sin espacios; vacio = sin estacion (el servidor usa la
  tabla o Open-Meteo).

## Limitaciones

- La app solo conoce los codigos, no el nombre ni la ubicacion de cada estacion.
