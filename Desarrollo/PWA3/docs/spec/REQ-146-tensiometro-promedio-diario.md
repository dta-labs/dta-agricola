# REQ-146 - Servidor: promedio diario de los tensiometros sin lecturas invalidas

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - falta subir `WS/v7` al servidor |
| Alcance | `Desarrollo/WS/v7/lib/DayLogAggregator.php`, `src/SensorDbUpdater.php` |
| Pruebas | PHP: `DayLogAggregatorTest::testSummarizeIgnoresInvalidTensiometerReadings` (62/62) |

## Problema
El resumen diario (`logs`) promedia la humedad del suelo de todas las lecturas del dia. En los tensiometros (WM) la
lectura 0 significa "no listo" y 240 "error": entraban al promedio y lo sesgaban (hacia saturado o hacia seco).

## Solucion
`DayLogAggregator::summarize($dayLogs, $types)` recibe el tipo de cada sensor (de `settings.sensors.S#.type`). En los
`WM` se descartan las tensiones <= 0 y >= 240 (`validTension`). Si en todo el dia no hubo una lectura valida, el
promedio queda "NaN". En los demas tipos no cambia nada (un 0 % de humedad sigue contando).

La app ya trataba esas lecturas como "sin dato" en la grafica y la tabla (REQ-127).
