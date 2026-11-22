# REQ-126 - Colores de los datos del historial

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `assets/js/logic/historial.js` (nuevo), `index.html` (tabla del historial), `core.js` (bandas de la grafica) |
| Pruebas | 4 en `test/unit/historial-sensores.test.js` |
| Compilacion | `26.11.22.003` |

## Pedido
- Humedad del suelo (%): en base a la capacidad de campo.
- Tension (cb): < 10 azul, < 30 verde, < 60 amarillo, 60+ rojo.
- Temperatura: con los umbrales definidos; sin umbrales, 2 y 20 °C: < Tmin azul, entre Tmin y Tmax verde, Tmax+ rojo.

## Solucion
`DTALogic.historial` (puro):

| Dato | Azul | Verde | Amarillo | Rojo | Gris |
|---|---|---|---|---|---|
| Humedad (%) | >= CC | umbral de riego .. CC | - | < umbral de riego | sin dato / -99 |
| Tension (cb, WM) | < 10 | 10 .. < 30 | 30 .. < 60 | >= 60 | 0 ("no listo"), 240 (error), sin dato |
| Temperatura (°C) | < Tmin | Tmin .. < Tmax | - | >= Tmax | sin dato |

- **Capacidad de campo (CC)**: el umbral "No regar" del sensor (`h.maxValue`; por encima: suelo saturado) y el
  **umbral de riego** es "Regar" (`h.minValue`). Sin umbrales validos: 25 % y 60 % (los mismos por defecto que el
  mapa, REQ-052). Los sensores no tienen un tipo de suelo propio para calcular la CC: se toma del umbral configurado.
- **Temperatura**: `t.minValue` / `t.maxValue`; si faltan o son incoherentes, 2 y 20 °C. El color se calcula en °C
  aunque la tabla muestre °F.
- La tabla del historial usa `colorHistorial(sensor, medida, valor)`; antes solo rojo/verde por "fuera de rango".
- Las **bandas de la grafica** siguen los mismos criterios: humedad (%) con CC y umbral de riego del sensor (antes
  fijas 15/40 %); agua disponible (WM) en 4 zonas equivalentes a 10/30/60 cb (antes 6 zonas con otros colores);
  temperatura con Tmin/Tmax del sensor (antes fijas 5/25 °C).
