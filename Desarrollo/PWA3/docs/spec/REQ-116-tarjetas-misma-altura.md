# REQ-116 - Listado: tarjetas de la misma altura

| Campo | Valor |
|---|---|
| Estado | **Corregido** (2026-11-20) - probar: usuario |
| Alcance | `index.html`, `assets/css/style.css` |
| Pruebas | 469/469 en Node (1 nueva en `test/unit/resumen.test.js`) |
| Compilacion | `26.11.20.017` |

## Problema
En escritorio, las columnas de Materialize son flotantes: una tarjeta un poco mas alta (con la etiqueta de alerta o
las valvulas) "enganchaba" a las siguientes y dejaba huecos grandes en la cuadricula.

## Solucion
La fila del listado (`.row.lista-equipos`) es flexible con salto de linea (sin flotantes ni clearfix) y el enlace de la
tarjeta tiene altura fija de 112 px (el contenido mas alto cabe; textos largos ya se recortan con "…"). Comprobado con
tarjetas de pivote, estacionario, bomba y red de sensores a 1440 y 390 px: todas miden lo mismo.
