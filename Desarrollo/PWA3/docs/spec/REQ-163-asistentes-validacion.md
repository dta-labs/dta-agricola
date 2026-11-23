# REQ-163 - Asistentes de alta: sin latitud/longitud repetidas y sin avanzar con datos faltantes

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-23) |
| Alcance | `index.html` (`#modalNuevoEquipo`, `#modalNuevoSensor`), `core.js` |
| Pruebas | 2 en `test/unit/asistentes-alta.test.js` (+2 ajustadas de REQ-162) |
| Compilacion | `26.11.23.001` |

## Agregar equipo

- **Latitud y longitud repetidas**: el selector de mapa ya trae sus campos; se quitaron los que agregó REQ-162.
  En la fila queda la *Zona horaria*.
- Sin **tipo** no se puede ir a ningún paso; sin **nombre e identificación** no se llega a *Configuración* (ni con
  "Siguiente" ni con la barra de pasos): el botón se ve atenuado y al tocarlo dice "Falta: nombre, identificación".
  `puedeIrPasoEquipo(i)` / `irAPasoEquipo(i)`.

## Agregar sensor

- Sin **tipo** no se navega (barra ni "Siguiente"). Sin **nombre e identificador** no se pasa de *Identificación*.
  `puedeIrPasoSensor(i)` / `irAPasoSensor(i)`; "Falta: nombre, identificador" también al agregar.
- **Cada alta empieza de cero** (`iniciarNuevoSensor()` al abrir con "+"): antes quedaban el tipo y los datos del
  sensor anterior, y como el sensor agregado era el mismo objeto, seguir editando en el asistente cambiaba también el
  sensor ya guardado en la red. Tras agregar, `newSensor` es un objeto nuevo.
