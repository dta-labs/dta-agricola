# REQ-005 - Correccion de los defectos de estado (D-07, D-08, D-10)

| Campo | Valor |
|---|---|
| Estado | **Implementado** (TDD: rojo -> verde) |
| Alcance | `assets/js/logic/estado.js` |
| Pruebas | 10 en `test/unit/estado.test.js` + 3 en `test/smoke.html` (navegador) |
| Riesgo | **Medio**: cambia lo que ve el usuario (por diseno) |

## 1. Por que esta reclamacion va antes de seguir extrayendo

`calcStatusTime` devolvia **siempre** `"-1"` (D-07 + D-10), asi que la columna de tiempo de estado del
listado era inutil y el indicador de retraso de comunicacion (`+2h`, `+1d`) **nunca** aparecia. Es un
defecto visible en produccion, no una cuestion de estilo, y el arreglo es pequeno y muy testeable.

## 2. Requisitos

| ID | Requisito | Antes | Despues |
|---|---|---|---|
| REQ-005.1 | Sin marca del equipo, `getTimeDiference` devuelve `null` | devolvia el numero `0` | `null` |
| REQ-005.2 | Sin `update`, la diferencia se mide contra **ahora** | rama inalcanzable | usa `Date.now()` (o el reloj inyectado) |
| REQ-005.3 | La funcion devuelve **siempre** `{day,hour,min}` o `null` | podia devolver un numero | contrato estable |
| REQ-005.4 | `12pm` = 12:00 y `12am` = 00:00 | `12pm` = hora 24 (dia siguiente) | correcto |
| REQ-005.5 | `12:30 pm` no se corre de dia | se corria 12 h | correcto |
| REQ-005.6 | `calcStatusTime` usa **su** parametro `update` | lo ignoraba | `+1h`, `+1d`, `14m` |
| REQ-005.7 | Por debajo del umbral (10 min) sigue siendo `-1` | igual | igual |
| REQ-005.8 | Sin fecha no hay etiqueta | `-1` | `-1` |

## 3. Trazabilidad

| Requisito | Prueba | Archivo | Estado |
|---|---|---|---|
| REQ-005.1 | `sin marca del equipo devuelve null, no un numero` | estado.test.js | PASS |
| REQ-005.2 | `sin marca de actualizacion compara contra AHORA` | estado.test.js | PASS |
| REQ-005.3 | `siempre devuelve {day,hour,min}, nunca un numero` | estado.test.js | PASS |
| REQ-005.4 | `'12pm' es 12:00 y '12am' es 00:00` | estado.test.js | PASS |
| REQ-005.5 | `las 12:30 pm no se corren de dia` | estado.test.js | PASS |
| REQ-005.6 | `calcStatusTime USA su parametro update` | estado.test.js | PASS |
| REQ-005.7 | `retrasos por debajo del umbral siguen siendo '-1'` | estado.test.js | PASS |
| REQ-005.8 | `sin fecha no hay etiqueta` | estado.test.js | PASS |
| REQ-005.1/.4/.6 | 3 comprobaciones equivalentes en navegador | smoke.html | PASS |

**Evidencia**: rojo previo (`'-1' !== '+1h'`) -> correccion -> **29/29** en `npm test` y **11/11** en
`test/smoke.html` con Chrome headless.

## 4. Decisiones

1. **Reloj inyectable** (`getTimeDiference(date, update, ahora)`): el caso "sin update" depende de la
   hora actual, y una prueba asi seria inestable. Con el parametro opcional, la prueba es
   determinista y la produccion no cambia (los llamadores pasan 2 argumentos).
2. **`null` en vez de `0`** para "sin dato": `0` era ambiguo (¿0 minutos o "no hay dato"?) y era el
   origen del fallo al acceder a `dif.day`.
3. **`calcStatusTime` mantiene la firma** `(date, update, ahora?)`: los dos llamadores existentes
   siguen funcionando; el segundo (L445) pasa `log.update`, que ahora **si** se usa.
4. Se conserva el umbral de 10 minutos para mostrar minutos: es una decision de producto existente.

## 5. Efecto en la aplicacion

| Antes | Despues |
|---|---|
| Columna de estado: siempre `-1` | `+1d`, `+2h`, `35m` segun el retraso real |
| Indicador de retraso de comunicacion: nunca | se muestra cuando el equipo lleva `>=10 min` sin reportar |

> **Riesgo asumido**: si algun consumidor esperaba `"-1"` como valor valido (por ejemplo, un filtro de
> la UI que descarte filas), ahora recibira etiquetas reales. Revisar la vista del listado en la
> proxima prueba manual. En el codigo no hay ningun `=== "-1"` (verificado por busqueda).

## 6. Defectos que siguen abiertos

D-01, D-02, D-03, D-04 (de REQ-001..003) y D-11, D-05, D-06: ver `REQ-001-logica-pura.md`.
