# REQ-121 - Ajustes de la red de sensores: estacion meteorologica por region y estacion

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-20) - probar: usuario |
| Sustituye a | REQ-120 (campo de texto `settings.station = "_fac"`, sin publicar) |
| Alcance | `assets/data/estaciones.json`, `assets/js/logic/estaciones.js`, `index.html` (`#modalAdjust`, fila `ajusteEstacion`), `core.js` |
| Pruebas | 6 en `estacion-meteorologica.test.js` |
| Compilacion | `26.11.20.022` |

## Pedido

- Funcional: en "Ajustes del sistema", campos para definir la estacion (region y estacion); guardar
  `settings.station.region` y `settings.station.id`.
- No funcional: catalogo JSON de las estaciones con la estructura `{ id, name, region }`.

## Contexto

Las estaciones locales dan datos climaticos mas certeros que los servicios meteorologicos. El servidor
(WS v7, `updateSensorDB.php`) las consulta asi:

`https://dtaamerica.com/ws/estaciones.php?fi=aaaa-mm-dd&ff=aaaa-mm-dd&tp=Hora&re=<region>&es=<id>`

p. ej. `...?fi=2026-04-06&ff=2026-04-06&tp=Hora&re=NAMIQUIPA&es=_osm`. Responde un renglon por dia.

## Solucion

- `assets/data/estaciones.json`: 29 estaciones en 6 regiones (BACHINIVA, CARICHI, CUAUHTEMOC, GUERRERO,
  CUSIHUIRIACHI, NAMIQUIPA). Para agregar una estacion basta editar este archivo (y su copia del servidor,
  `WS/v7/data/estaciones.json`).
- `logic/estaciones.js` (UMD, puro): `regiones`, `deRegion`, `buscar`, `normalizar`, `paraGuardar`, `etiqueta`.
- Ajustes (solo `Sensor`): selector de **region** y, al elegirla, selector de **estacion** de esa region.
  Cambiar de region limpia la estacion. Se bloquean con el lapiz como el resto de ajustes.
- Al confirmar: `settings.station = { region, id }` si el par existe en el catalogo; si no, `null` (sin estacion).
- Compatibilidad: un `settings.station` de texto (REQ-120) o sin region se completa con la region del catalogo.

## Limitaciones

- La estacion `_mmi`, que el servidor tenia asignada a 4 sistemas, no esta en el catalogo: esos sistemas quedan
  sin estacion hasta agregarla o elegir otra.
- Al 2026-11-20 estaciones.php no tiene datos desde julio (`_osm` 2026-07-12, `_fac` 2026-07-13), tambien con la
  region correcta en `re`.
