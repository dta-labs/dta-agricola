# REQ-125 - Controles de la grafica solo en la vista de PC

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `assets/css/style.css` |
| Pruebas | 1 en `test/unit/historial-sensores.test.js` |
| Compilacion | `26.11.22.002` |

La barra de la grafica del historial (REQ-093: acercar, alejar, ver todo, ir a fecha, exportar CSV, guardar PNG) se
oculta en pantallas de hasta 992 px (celular y tableta, el punto de corte "l" de Materialize) y en pantallas tactiles
sin raton (`hover: none` y `pointer: coarse`), aunque sean anchas. En PC se ve como antes. En el celular siguen el
zoom con dos dedos, el arrastre y la informacion al tocar un punto.
