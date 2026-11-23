# REQ-161 - "Agregar equipo" en dos columnas

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) |
| Alcance | `index.html` (`#modalNuevoEquipo`), `assets/css/style.css` |
| Pruebas | 1 en `test/unit/agregar-equipo.test.js` |
| Compilacion | `26.11.22.037` |

**Problema**: los tipos de equipo (Pivote, Sectorial, Sensores, Nevera, Invernadero, Bombeo) salían uno por fila y
pegados a la derecha aunque cada uno es `col s6`. El contenedor era `.input-field` (flex en columna) y Materialize da
a `.col` `margin-left: auto`: cada tarjeta ocupaba su propia fila y el margen automático la empujaba a la derecha.

**Solución**: el contenedor es `.nuevo-equipo-tipos`, una rejilla CSS de **2 columnas** (3 desde 600 px) con
separación de 14 px; las `.col` sin flotado, ancho ni márgenes, y las tarjetas con la misma altura.
