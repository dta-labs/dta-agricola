# REQ-004 - Dominio devices: estado y tiempos del equipo (slice 1)

| Campo | Valor |
|---|---|
| Estado | **Implementado y verificado** |
| Alcance | `assets/js/logic/estado.js`, `assets/js/logic/ids.js` |
| Pruebas | `test/unit/estado.test.js` (6), `test/unit/ids.test.js` (2) |
| Riesgo | Bajo: delegacion 1:1 |

## 1. Objetivo

Extraer del `#region DEVICES` (1.115 lineas) la logica que **no depende de `$scope`, Firebase ni DOM**.
El analisis previo identifico 9 candidatas; 4 ya estaban extraidas (REQ-001..003) y 5 resultaron
depender del DOM o de variables globales. Quedan estas tres, que son las que se mueven aqui.

## 2. Requisitos

| ID | Requisito | Criterio de aceptacion |
|---|---|---|
| REQ-004.1 | Interpretar la marca del dispositivo `YYYYMMDD HHMMam\|pm` | 3 casos con componentes locales |
| REQ-004.2 | `12pm` se interpreta como hora 24 | se documenta el defecto D-08 |
| REQ-004.3 | Diferencia entre dos marcas validas en `{day,hour,min}` | 1 h y 30 h |
| REQ-004.4 | Sin `update` devuelve el **numero 0** | se documenta D-07 |
| REQ-004.5 | La diferencia se contamina con `12pm` | hora negativa: se documenta D-08 |
| REQ-004.6 | `calcStatusTime` siempre devuelve `"-1"` | se documentan D-07 y D-10 |
| REQ-004.7 | `generarIdUnico` devuelve base36 no vacio | tipo, longitud, alfabeto |
| REQ-004.8 | 1.000 identificadores sin repetir | set de 1.000 |

## 3. Trazabilidad

| Requisito | Prueba | Archivo | Estado |
|---|---|---|---|
| REQ-004.1 | `interpreta la marca del dispositivo` | estado.test.js | PASS |
| REQ-004.2 | `'12pm' se interpreta como hora 24` | estado.test.js | PASS |
| REQ-004.3 | `diferencia entre dos marcas validas` | estado.test.js | PASS |
| REQ-004.4 | `sin marca de actualizacion devuelve el NUMERO 0` | estado.test.js | PASS |
| REQ-004.5 | `D-08 contamina la diferencia` | estado.test.js | PASS |
| REQ-004.6 | `calcStatusTime siempre devuelve '-1'` | estado.test.js | PASS |
| REQ-004.7 | `generarIdUnico devuelve base36 no vacio` | ids.test.js | PASS |
| REQ-004.8 | `mil identificadores no se repiten` | ids.test.js | PASS |

## 4. Defectos nuevos detectados

| ID | Defecto | Impacto real | Reclamacion |
|---|---|---|---|
| **D-07** | `getTimeDiference` devuelve el numero `0` cuando falta `update`, no un objeto | quien haga `dif.day` obtiene `undefined` | REQ-007 |
| **D-08** | `12pm` se convierte en hora **24** (dia siguiente) | fechas 12:00–12:59 pm se corren 12 h | REQ-007 |
| **D-10** | `calcStatusTime` recibe `update` y **lo ignora** (pasa `null`) | **siempre devuelve `"-1"`** | REQ-007 |
| **D-11** | Rama `new Date()` de `getTimeDiference` inalcanzable por el guard | codigo muerto | REQ-008 |

### Consecuencia visible de D-07 + D-10

Las dos unicas llamadas del sistema pasan `null`:

```
core.js L558  let dif = getTimeDiference(log.update, null);
core.js L571  let dif = getTimeDiference(date, null);      // dentro de calcStatusTime
```

Por tanto `dif` es `0` (numero) y **`calcStatusTime` devuelve siempre `"-1"`**; ademas el indicador
de retraso de comunicacion (`+2h`, `+1d`) **nunca se muestra**. Es un defecto de producto, no solo de
codigo: la columna de "tiempo de estado" del listado es inutil desde que se introdujo.

### Criterio de aceptacion para la correccion (REQ-007)

1. `getTimeDiference` devuelve **siempre** `{day,hour,min}` (o `null` si no hay datos validos), nunca un numero.
2. `calcStatusTime(date, update)` usa **su** `update`; si no llega, usa el `log.update` del equipo.
3. `12pm` = 12:00, `12am` = 00:00.
4. Pruebas en rojo primero, y las de caracterizacion actualizadas en la misma reclamacion.

## 5. Decisiones

1. El parser de la marca del dispositivo se extrae como **funcion con nombre**
   (`instanteDeFechaDispositivo`), en lugar de una expresion anidada repetida: es lo que la hace
   testeable y permite corregir D-08 en un solo sitio.
2. `generarIdUnico` va en su propio modulo (`ids.js`): no depende de nada y tiene otra
   responsabilidad (SRP).
3. Se conserva la firma `calcStatusTime(date, update)` aunque `update` no se use: cambiarla ahora
   romperia la llamada existente y mezclaria refactor con correccion.

## 6. Pendiente del dominio devices

| Item | Motivo por el que NO se extrae ahora |
|---|---|
| `loadSystems`, `loadSystemUsers`, `selectSystem` | dependen de `$scope` y Firebase |
| `processingAlerts`, `sendAlertSMS` | `$scope` + efectos externos (SMS) |
| `renderColdRoomSensorChart` | DOM + Chart.js |
| `verifyPlots`, `hideSpinner`, `hideTheSpinner` | DOM |
| `createStationaryProgram`, `runLoop`, `excecuteProgram` | mutan `$scope.actualSystem.plots`: van a **REQ-005 (riego)** |
