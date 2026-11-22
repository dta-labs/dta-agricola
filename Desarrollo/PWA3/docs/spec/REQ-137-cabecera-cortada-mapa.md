# REQ-137 - La cabecera se cortaba al trabajar con el mapa

| Campo | Valor |
|---|---|
| Estado | **Corregido** (2026-11-22) - probar: usuario en iOS y Android |
| Alcance | `core.js` (`showWindow`, `ajustarAltoDelSistema`, `volverArriba`) |
| Pruebas | 2 en `test/unit/cabecera-fija.test.js` |
| Compilacion | `26.11.22.014` |

## Problema
En iOS y Android, a veces, al trabajar con el mapa la app "se salia de proporcion": la cabecera quedaba cortada como
con un margen superior negativo de la mitad de su alto, sin titulo ni controles.

## Causa
- La vista del sistema era mas alta que la pantalla: cabecera (62 px) + margen de 40 px + mapa de `calc(100vh - 40px)`.
  En el celular `100vh` es el alto **sin** las barras del navegador, asi que sobraba aun mas.
- `#contenido` tiene `overflow: hidden` (el usuario no puede desplazarlo), pero el navegador si lo desplaza por su
  cuenta para mostrar algo: al enfocar el mapa, abrir un popup cerca del borde, abrir y cerrar el teclado (iOS)... La
  vista quedaba desplazada hacia arriba (la cabecera cortada) y no habia forma de volver. La barra de controles que va
  sobre el borde inferior del mapa tambien quedaba en parte fuera de la pantalla.

## Solucion
1. **Alto del mapa segun el espacio real**: al entrar al sistema y al cambiar el tamaño de la pantalla (girar el
   telefono, aparecer o desaparecer barras, `visualViewport`), el mapa, su contenedor y la fila miden el alto visible
   menos la posicion donde empiezan (minimo 260 px). El mapa se recalcula solo (REQ-110, `ResizeObserver`).
2. **Siempre arriba**: si algo desplaza `#contenido` o la pagina, vuelve a 0 (al instante en `#contenido`; en la pagina,
   salvo mientras se escribe en un campo, y 150 ms despues de salir de un campo, que es cuando iOS deja la pagina
   corrida al cerrar el teclado).
