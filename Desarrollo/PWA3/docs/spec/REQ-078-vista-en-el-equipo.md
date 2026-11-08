# REQ-078 - Vista de la red y valor principal del sensor guardados en el equipo

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-08) - probar: usuario |
| Sustituye a | REQ-077 (las guardaba en las preferencias del usuario) |
| Alcance | `services/repositorio.js` (`actualizarAjustesSistema`), `core.js`, `components/sistema/panel-sensores/`, `index.html`; `logic/ids.js` (correccion aparte) |
| Pruebas | 384/384 en Node (3 de REQ-077 sustituidas) |
| Compilacion | `26.11.08.002` |

Aclaracion del usuario: mapa/mosaico es una preferencia **de la red de sensores** y Ms/temperatura **de cada sensor**.
Se guardan en los ajustes del equipo, asi todos los que comparten la red ven lo mismo.

| Ajuste | Ruta | Valores |
|---|---|---|
| Vista de la red | `systems/{red}/settings/viewMode` | `"map"` (o sin campo) / `"tiles"` |
| Valor principal del sensor | `systems/{red}/settings/sensors/{S#}/primaryValue` | `"temperature"`; sin campo = humedad del suelo |

- Campos **nuevos y opcionales** (en ingles como el resto de los ajustes); no cambian ninguno existente (R-01).
- Se guardan con `update()` parcial (no se reescriben los ajustes); volver a la humedad borra el campo (`null`).
- Se aplican al momento en el objeto del equipo (`actualSystem`), asi un guardado completo posterior de los ajustes
  (`setMachineSettings`) los conserva.
- Al seleccionar una red se toma su `viewMode`; el componente lee `primaryValue` del propio sensor.
- Sale todo lo de REQ-077 (`users/{email}/preferences`, `guardarPreferencia`, `aplicarPreferencias`).

## Correccion incluida: identificadores repetidos (REQ-004)

`logic/ids.js -> generarIdUnico` usaba la hora + 5 caracteres aleatorios (a veces menos): en el mismo milisegundo
podian repetirse y la prueba REQ-004.8 fallaba de forma intermitente (~1 %). Ahora: hora + contador (2 cifras base36)
+ 6 aleatorios garantizados. 200.000 seguidos sin repetir.
