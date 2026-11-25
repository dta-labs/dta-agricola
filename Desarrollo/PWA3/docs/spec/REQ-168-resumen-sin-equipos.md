# REQ-168 - Resumen: la bienvenida siempre que no hay equipos (nunca el resumen en cero)

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-24) |
| Alcance | `core.js` (`getUserData`, `loadSystems`), `logic/tablero.js`, `components/tablero/*` |
| Pruebas | 2 en `test/unit/resumen-sin-equipos.test.js` (+1 ajustada) |
| Compilacion | `26.11.24.005` |

**Problema**: un usuario sin equipos veía unas veces la bienvenida y otras el resumen con todo en cero.

**Causas**:
- Usuario **sin registro** en la base (cuenta recién creada): no se llamaba a `loadSystems` y `sinEquipos` quedaba
  sin valor → resumen en cero.
- Lista de equipos **vacía** (`{}`, p. ej. tras quitar el último): contaba como "con equipos".
- Mientras llegaban los equipos (o si ninguno llegaba: borrados o sin permiso) se veía el resumen en cero.

**Cambios**:
- Sin registro o con la lista vacía: `sinEquipos = true` → **bienvenida**.
- Mientras llegan los equipos: "**Cargando tus equipos…**" (ni bienvenida ni resumen en cero; `tablero.cargando`).
- Si a los **10 s** no llegó ninguno: bienvenida.
- Con equipos: el resumen.
