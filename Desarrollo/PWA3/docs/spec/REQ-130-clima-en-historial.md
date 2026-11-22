# REQ-130 - Iconos del clima en las tablas y graficas del historial

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `index.html` (tablas del historial), `core.js` (`loadChartWeather`, `climaDe`), `logic/historial.js`, `style.css` |
| Pruebas | 1 en `test/unit/historial-sensores.test.js` |
| Compilacion | `26.11.22.007` |

## Pedido
- Iconos del clima en las graficas y en las tablas de Semana, Mes y Ciclo.
- En las tablas, en una columna inmediatamente despues de la fecha.

## Solucion
- **Tablas** (sensores de humedad/temperatura y de presion): columna "Clima" despues de "Fecha" con el icono del dia
  (descripcion al pasar o dejar el dedo encima); "--" si no hay dato. No aparece en "Dia" (una sola fecha).
- Los iconos salen del mismo clima que ya cargaba la grafica (`loadChartWeather`), que ahora tambien se guarda por
  equipo y dia (`$scope.climaHistorial`, `climaDe(reg)`).
- **Ultimos dias**: el archivo historico de Open-Meteo publica cada dia con algunos dias de retraso, asi que la grafica
  de la semana salia casi sin iconos. Los dias de los ultimos 7 dias se piden al pronostico (`api.open-meteo.com`,
  `past_days=7`, ya permitido en la CSP por REQ-114); los anteriores, al archivo. Hoy sigue usando el clima actual.
- La descripcion dice "Nublado", "Lluvia"... (`historial.descripcionWmo`) en lugar de "Codigo meteorologico 3".
- En la grafica los iconos siguen sin solaparse (REQ-092): en Mes y Ciclo se ve uno cada pocos dias.
- Neveras: sin clima (equipo en interior), como antes.
