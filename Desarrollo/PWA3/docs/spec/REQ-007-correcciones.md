# REQ-007 - Correccion de los defectos de la logica pura

| Campo | Valor |
|---|---|
| Estado | **Implementado** (TDD: rojo 7 fallos -> verde) |
| Alcance | `formulas.js`, `fechas.js`, `secuencias.js`, `riego.js` (+ aviso en `core.js`) |
| Pruebas | 38 en Node + 14 en navegador |
| Riesgo | **Medio**: cambia el resultado de la programacion de riego (es la correccion) |

## 1. Defectos corregidos

| ID | Defecto | Antes | Ahora |
|---|---|---|---|
| **D-01** | `mapping` con rango de entrada vacio | `Infinity` / `NaN` | `outMin` (valor finito y predecible) |
| **D-02** | `parseFechaHora` solo entendia `AM/PM` mayusculas | `02:46 pm` = 2:46 | `02:46 pm` = 14:46; sin sufijo (`18:05`) no se toca |
| **D-03** | El cierre de bloque se formateaba en **UTC** | la programacion se corria 6 h en Mexico | cierre en **hora local**, igual que los inicios |
| **D-04** | Mes desconocido daba `month = 0` | diciembre del ano anterior, en silencio | `RangeError` explicito |
| **D-06** | `t` no array rompia `generarSecuenciaParcelas` | excepcion | se normaliza a `[]` |
| **D-13** | Menos de 7 tiempos lanzaba `TypeError` | crear el plan fallaba | programa las parcelas calculables + `aviso` (consola) |

## 2. Trazabilidad

| Defecto | Prueba | Archivo | Estado |
|---|---|---|---|
| D-01 | `REQ-001.2 mapping con rango de entrada vacio` | formulas.test.js | PASS |
| D-02 | `REQ-002.5 parseFechaHora entiende AM/PM sin importar mayusculas` | fechas.test.js | PASS |
| D-04 | `REQ-002.2 parseFechaHora2 con mes desconocido lanza RangeError` | fechas.test.js | PASS |
| D-03 | `REQ-003.2 el ultimo elemento es el fin, en HORA LOCAL` | secuencias.test.js | PASS |
| D-03 | `REQ-003.4 con lista vacia devuelve solo el cierre` | secuencias.test.js | PASS |
| D-03 | `REQ-006.4 ... encadenando en LOCAL` | riego.test.js | PASS |
| D-13 | `REQ-006.8 tiempos incompletos: programa lo calculable y avisa` | riego.test.js | PASS |
| D-06 | `REQ-007.6 sin lista de tiempos no lanza` | riego.test.js | PASS |

**Evidencia**: antes de corregir, `npm test` daba **7 fallos / 30 pasan**; despues, **38/38** en Node y
**14/14** en Chrome headless, con la app arrancando (`ng-scope`, 374.905 B de DOM).

## 3. Efecto en la aplicacion

1. **Programacion de riego correcta**: un plan con `periodo = "veces"` y `cada > 1` ya no se desplaza
   6 horas entre bloques. Con `cada = 1` el unico cambio es que el **cierre** que se usa para
   encadenar ya es local (antes UTC), asi que el segundo bloque empieza a la hora real.
2. **Planes incompletos**: si faltan tiempos por parcela, se programa lo posible y la consola muestra
   `[riego] faltan tiempos por parcela: se programaron N de 7`, en lugar de fallar.
3. **Formato de fecha no reconocido**: ahora es un error visible, no una fecha silenciosamente
   equivocada.
4. **`mapping`** nunca devuelve `Infinity`/`NaN` (afecta a graficas que usan esa escala).

**Los planes ya guardados no se ven afectados**: en la base de datos se almacenan fechas y horas
concretas por parcela, no la regla de generacion.

## 4. Pruebas de caracterizacion actualizadas

Al corregir, las pruebas que **fijaban el defecto** se actualizaron en esta misma reclamacion (es el
procedimiento acordado): REQ-001.2, REQ-002.2, REQ-002.5, REQ-003.2, REQ-003.4, REQ-006.4 y REQ-006.8
ahora describen el comportamiento correcto y lo dicen en su nombre.

## 5. Riesgos asumidos

| Riesgo | Mitigacion |
|---|---|
| `RangeError` en formatos de fecha que antes "funcionaban" por accidente | los unicos formatos que entran son los de la UI (`YYYY-MM-DD` y `Apr 25, 2026`); ambos probados |
| La programacion cambia y un usuario compara con un plan viejo | el cambio es la correccion; los planes guardados no se recalculan |
| `aviso` silencioso si nadie mira la consola | queda registrado con prefijo `[riego]`; se puede llevar a la UI en una reclamacion futura |

## 6. Pendiente

| ID | Item | Reclamacion |
|---|---|---|
| D-05 | `cbToPercent_old` es codigo muerto | REQ-008 |
| D-11 | Rama `new Date()` inalcanzable en `getTimeDiference` | REQ-008 |
| — | Llevar los `aviso` de riego a la interfaz (hoy solo consola) | REQ-009 |
| — | Extraer el resto de `DEVICES` y `PLAN DE RIEGO` (requieren servicios con `$scope`) | REQ-010 |
