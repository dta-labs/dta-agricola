# REQ-128 - Historial: unidades frio acumuladas ("U.Frio")

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `assets/js/logic/frio.js` (`acumuladoPorRegistro`), `core.js` (`ufAcumuladaDe`), `index.html` (tabla del historial) |
| Pruebas | 1 en `test/unit/historial-sensores.test.js` |
| Compilacion | `26.11.22.005` |

## Pedido
- Cambiar el titulo "H.Frio" por "U.Frio".
- Los valores son acumulables y se mostraban puntuales.

## Decision sobre el titulo
Desde 2026-11-21 el servidor calcula el indice 6 con el **modelo Utah** (Richardson, 1974; `WS/v7/lib/Agronomy.php`):
cada hora suma entre -1 y +1 segun la temperatura, no "1 por hora bajo 7 °C". Eso son **unidades frio**, no horas
frio: el titulo correcto es "U.Frio" (la ficha del sensor ya dice "Unidades frio acumuladas", REQ-123).

## Solucion
- Columna "U.Frio acum." en Semana, Mes y Ciclo (en "Dia" sigue la bateria).
- Cada fila muestra el **acumulado** desde el dia mas antiguo del periodo mostrado hasta ese dia; vuelve a 0 al
  empezar la temporada (1 de noviembre), como en la ficha. Los dias sin dato no suman. El valor del dia aparece al
  pasar o dejar el dedo sobre la celda.
- `frio.acumuladoPorRegistro(registros, sensor)` (puro) y `$scope.ufAcumuladaDe(reg, idx)` con cache por lista de
  registros y sensor.

## Limitacion
El acumulado de la tabla empieza en el primer dia cargado (7, 30 o 180 dias). Para el total de la temporada completa,
la ficha del sensor (opcion "Cultivo", REQ-123) suma desde el 1 de noviembre.
