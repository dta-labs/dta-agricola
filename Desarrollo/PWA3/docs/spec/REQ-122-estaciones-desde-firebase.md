# REQ-122 - Catalogo de estaciones desde Firebase (`/stations`)

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-21) - probar: usuario (formato real de `/stations` sin verificar) |
| Alcance | `logic/estaciones.js` (`desdeFirebase`), `services/repositorio.js` (`leerEstaciones`), `core.js`, `database.rules.json` |
| Pruebas | 4 nuevas en `estacion-meteorologica.test.js` |
| Compilacion | `26.11.21.001` |

## Pedido

Las estaciones estan en la base de datos de Firebase, en `stations`: usarlas como catalogo de REQ-121.

## Solucion

- `repositorio.leerEstaciones()` lee `/stations`. Se llama la primera vez que se abre una red de sensores (ya con
  sesion, porque las reglas piden `auth != null`).
- `estaciones.desdeFirebase(valor)` convierte el nodo en `[{ id, name, region }]`. Como no se pudo ver el nodo real,
  acepta: lista u objeto de `{ id, name, region }` (o `estacion`/`nombre`), objeto con las estaciones bajo su id, o
  agrupado por region (`{ "NAMIQUIPA": { "_osm": "Óscar Soto Maynez" } }`, con objetos o con listas). En el agrupado,
  la region no empieza con `_` y el id de estacion si, salvo que traiga `id`.
- Hasta que llega `/stations`, o si no se puede leer o viene vacio, se usa `assets/data/estaciones.json` (REQ-121);
  queda un aviso en la consola.
- `database.rules.json`: `stations` de solo lectura con sesion (`.read: auth != null`, `.write: false`). Sin esa
  regla, al desplegar las reglas de REQ-022 (raiz cerrada) la app no podria leerlo.

## Limitaciones

- Verificar en el navegador que no aparezca "[estaciones] /stations vacio o con formato no reconocido"; si aparece,
  el formato de `/stations` es otro y hay que ajustar `desdeFirebase`.
