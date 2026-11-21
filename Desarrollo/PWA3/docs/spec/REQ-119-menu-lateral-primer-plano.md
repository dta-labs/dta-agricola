# REQ-119 - Menu lateral en primer plano

| Campo | Valor |
|---|---|
| Estado | **Corregido** (2026-11-20) - probar: usuario |
| Alcance | `index.html`, `assets/css/style.css` |
| Pruebas | 471/471 en Node (REQ-058 ajustada) |
| Compilacion | `26.11.20.020` |

## Problema
El menu lateral (Materialize `.sidenav`, z-index 999) quedaba por debajo de la cabecera (`.top-navbar`, z-index
1000) y empezaba 50 px mas abajo (`margin-top: 50px` de cuando la cabecera medía 50 px): la parte de arriba del menu
quedaba tapada y la cabecera seguia sin oscurecer.

## Solucion
El menu se abre desde arriba (`top: 0`, sin margen, altura completa, respetando la zona segura de iOS) con z-index
1002, y el fondo oscuro (`.sidenav-overlay`) sube a 1001 para cubrir tambien la cabecera. Las ventanas modales
(Materialize 1003+, Bootstrap 1055) y los avisos siguen por encima.
