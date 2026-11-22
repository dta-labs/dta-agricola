# REQ-127 - Historial: grafica de "Agua disponible"

| Campo | Valor |
|---|---|
| Estado | **Corregido** (2026-11-22) - probar: usuario |
| Alcance | `index.html` (pestaña), `core.js` (`processResultsFromWMSensors`, `processResultsFromMsSensors`, eje y tooltip), `logic/historial.js` |
| Pruebas | 3 en `test/unit/historial-sensores.test.js` |
| Compilacion | `26.11.22.004` |

## Problemas encontrados
1. **La pestaña no redibujaba**: el atributo estaba partido (`ng-click="setChartType('moisture')" ng-show="..."` y
   `setChart(idx, ...)` suelto fuera de las comillas). Al tocar "Agua disponible" solo cambiaba el tipo; la grafica
   seguia mostrando la anterior (humedad ambiente o temperatura).
2. **Lecturas invalidas como 100 %**: `cbToPercent` convertia 0 ("no listo"), -99 y valores negativos en 100 % de agua
   disponible (240 ya era "sin dato"). Ahora 0, 240 o mas, negativos y NaN son "sin dato" (`historial.cbValido`).
3. **Eje mal rotulado**: el eje (en %) mostraba cb por una tabla fija que no coincidia con la conversion (50 % decia
   40 cb, son 45; 10 % decia 200, son 195). Ahora cada tick (cada 10 %) muestra la inversa exacta
   (`historial.cbDeAguaDisponible`) y el eje se titula "Tension (cb)".
4. La informacion al tocar un punto dice "Agua disponible: 72 % (≈ 16 cb)" (antes "Humedad del Suelo: 72").

## Tambien
- **Sensores Ms**: la grafica de humedad leia `dataRaw[i]` (otra posicion del registro: otro dato u otro sensor) y lo
  convertia con un rango de ADC que ya no existe. Ahora lee `dataRaw[i*8]`, ya en % como la tabla y la ficha. La
  pestaña "Humedad suelo" aparece tambien para los Ms.

## Pendiente (servidor)
El resumen diario (`WS/v7/lib/DayLogAggregator.php`) promedia la tension con todas las lecturas del dia; si incluye
0 ("no listo") o 240 (error), el promedio diario de un tensiometro sale sesgado. No se cambio el servidor.
