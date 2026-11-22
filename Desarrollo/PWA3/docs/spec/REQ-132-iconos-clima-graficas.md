# REQ-132 - Iconos del clima en las graficas del historial

| Campo | Valor |
|---|---|
| Estado | **Corregido** (2026-11-22) - probar: usuario |
| Alcance | `core.js` (`chartWeatherPlugin`, `abrirSensorDelHistorial`, `reloadSystemLog`, `selectSystem`), `index.html` |
| Pruebas | 1 en `test/unit/historial-sensores.test.js` |
| Compilacion | `26.11.22.009` |

## Problema
Tras REQ-130 la tabla mostraba el clima pero las graficas no.

## Causas
1. **Periodo no cargado**: al entrar al equipo se cargan las ultimas lecturas del dia (`dayLogs`, 7 registros), pero el
   boton "Semana" aparece elegido. Al abrir un sensor del historial la grafica se dibujaba con esas lecturas: un solo
   dia, un solo icono.
2. **Iconos del borde descartados**: el icono de un dia se dibuja sobre su primer punto; en una grafica de linea el
   primer y el ultimo punto estan en el borde, a menos de medio icono, y se descartaban. Con un solo dia (causa 1) no
   quedaba ninguno; con una semana se perdian el primer dia y hoy.
3. **Redibujo**: el icono que tardaba en cargar solo redibujaba la grafica que lo pidio; si para entonces se habia
   reemplazado, la nueva quedaba sin iconos hasta tocarla.

## Solucion
1. `abrirSensorDelHistorial(idx)` (encabezado del sensor): si el periodo elegido no es el cargado, lo carga
   (`reloadSystemLog`); si ya lo esta, solo dibuja. `periodoCargado` se marca al terminar `reloadSystemLog` y se borra
   cuando `selectSystem` carga las lecturas iniciales.
2. Los iconos del borde se acercan hacia dentro en lugar de descartarse (los que quedan fuera al hacer zoom o
   desplazar se siguen omitiendo; sigue sin solaparse ninguno).
3. Al cargar un icono se redibujan todas las graficas vivas (`Chart.instances`).

Comprobado con el codigo real de la grafica (tensiometro, semana de 7 dias: 7 iconos, antes 5; un solo dia: 1 icono,
antes 0).
