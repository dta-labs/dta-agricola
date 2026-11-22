# REQ-131 - Tablas del historial responsivas

| Campo | Valor |
|---|---|
| Estado | **Corregido** (2026-11-22) - probar: usuario |
| Alcance | `index.html` (modal Historial), `assets/css/style.css` |
| Pruebas | 1 en `test/unit/historial-sensores.test.js` |
| Compilacion | `26.11.22.008` |

## Problema
En el celular, las tablas del historial (fecha, clima, humedad, HR, temperatura, ETo, U.Frio...) son mas anchas que
la pantalla y, sin contenedor con desplazamiento, movian toda la ventana.

## Solucion
- Cada tabla va dentro de `.tabla-desplazable` (`overflow-x: auto`, desplazamiento tactil, sin arrastrar la pagina:
  `overscroll-behavior-x: contain`). La tabla mide lo que necesita (`min-width: max-content`), sin partir las celdas.
- La columna de fecha (`.historial-fecha`, en "Dia" la hora) queda fija a la izquierda al desplazar, con una sombra
  ligera.
- Celdas mas compactas (8 px) y centradas.
- Comprobado a 390 px: la pagina no se desplaza (ancho 390), la tabla si (442 px dentro de una caja de 243 px).
