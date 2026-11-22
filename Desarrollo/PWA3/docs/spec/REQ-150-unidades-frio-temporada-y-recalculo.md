# REQ-150 - Unidades frío: horas cálidas restan, temporada propia por sensor y recálculo desde el 1/11

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `assets/js/logic/frio.js`, `assets/js/core.js`, `index.html` (Editar sensor, tabla del historial) |
| Pruebas | 4 en `test/unit/frio-temporada.test.js` (+1 ajustada en `historial-sensores.test.js`) |
| Compilacion | `26.11.22.026` |

## Decisiones del usuario

1. Los días cálidos **restan** (modelo Utah completo, como el WS v7: -0.5 entre 16 y 18 °C, -1 sobre 18 °C).
   No se usa "Utah positivo".
2. La temporada de frío es **configurable por sensor**, con la del cultivo como valor por defecto.
3. "Resetea el cálculo al 1/11": los resúmenes anteriores al 21/11/2026 estaban inflados.

## Recálculo de los días inflados

El WS v6 sumaba cada registro de 10-30 min como si fuera una hora (2 a 6 veces de más). El v7 usa el promedio
horario x 24. La app ya no tiene los registros horarios de esos días, pero sí la **Tmin y Tmax** de cada resumen:

- Resumen con fecha anterior a `CORTE_V7 = 20261121`, o con más de 24 UF en un día (imposible): las UF se
  **recalculan** con una curva horaria (coseno, mínima a las 3:00 y máxima a las 15:00) y Utah en cada hora.
- Sin Tmin/Tmax: se usa el valor guardado solo si es posible (|UF| <= 24); si no, el día no suma.
- El acumulado de la temporada (popup "Cultivo" y columna U.Frío del historial) empieza el 1/11 (o el inicio de la
  temporada) con los valores corregidos. El título "Del día" de la tabla muestra también el valor corregido.
- No se modifica la base de datos.

## Temporada propia (Editar sensor, bloque "Cultivo que mide el sensor")

- Casilla **"Temporada de frío propia"**. Sin marcar: se indica la del cultivo ("Por defecto: Nogal pecanero:
  1 nov – 28 feb") o que el cultivo no tiene temporada conocida.
- Marcada: inicio y fin (día y mes), precargados con la del cultivo (o 1 nov – 28 feb). Se guarda en
  `sensor.chillSeason = { start: "MM-DD", end: "MM-DD" }` al guardar el sensor. Desmarcar la borra.
- Sirve también para cultivos que la app no reconoce (sin temporada por defecto).
- Las fechas propias se usan tal cual (no se desplazan en el hemisferio sur).
- El "En reposo" del resumen (REQ-138) sigue usando la temporada del cultivo.
