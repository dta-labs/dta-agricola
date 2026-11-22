# REQ-144 - Invernadero: varios cultivos por sensor

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `logic/cultivos.js` (`cultivosDeSensor`, `normalizarCultivosDeSensor`), `core.js`, `index.html` (nuevo / editar sensor), `logic/nevera.js`, `panel-nevera`, `logic/tablero.js`, `ventana.css`, `paneles.css` |
| Pruebas | 4 en `test/unit/invernadero-cultivos.test.js` |
| Compilacion | `26.11.22.021` |

## Pedido
El invernadero funciona como la nevera (REQ-143: solo tarjetas, sin mapa). La unica diferencia: en la configuracion
de cada sensor del invernadero se pueden agregar **varios cultivos**.

## Datos
`settings.sensors.S#.cultures = [{ culture, phenologicalStage }, ...]`. Al guardar se quitan los vacios y los
repetidos (por nombre) y el **primero** se copia tambien en `culture` / `phenologicalStage`, que es lo que ya leen las
partes que esperan un solo cultivo (alertas de plagas del servidor, etc.). Un sensor que solo tenga `culture` (de
antes) se lee como un cultivo.

## Pantallas
- **Nuevo sensor / Editar sensor** (solo si el equipo es un invernadero): bloque "Cultivos del invernadero" con una
  fila por cultivo (cultivo y fase fenologica; el primero dice "Cultivo principal"), boton para quitar cada uno y
  "Agregar cultivo".
- **Tarjeta del sensor** (panel de la nevera/invernadero): linea con los cultivos ("Tomate · Pepino").
- **Resumen \ Mis cultivos**: cada cultivo de los sensores del invernadero, con el invernadero como equipo (REQ-138).
