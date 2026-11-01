# REQ-001..003 - Extraccion de la logica pura de core.js

| Campo | Valor |
|---|---|
| Estado | **Implementado y verificado** |
| Fecha | 2026-01-11 |
| Alcance | `assets/js/logic/{formulas,fechas,secuencias}.js` |
| Pruebas | `test/unit/*.test.js` (17 casos, `npm test`) |
| Riesgo | Bajo: delegacion 1:1, sin cambio de comportamiento |

## 1. Objetivo

Sacar de `core.js` (5.447 lineas, un unico controlador Angular) la logica **pura**, la que se puede
probar sin DOM ni red, para que:

- sea **testeable** (base de la refactorizacion y del empaquetado nativo futuro),
- tenga **trazabilidad requisito -> prueba** (SDD),
- el resto de la extraccion (devices, riego, notificaciones, graficas) se apoye en un patron ya probado.

## 2. Requisitos

### REQ-001 - Formulas de conversion
| ID | Requisito | Criterio de aceptacion |
|---|---|---|
| REQ-001.1 | `mapping` escala lineal entre dos rangos | 5 casos con valores exactos |
| REQ-001.2 | `mapping` con rango de entrada vacio **no lanza** | devuelve `-Infinity / Infinity / NaN` (comportamiento actual, documentado) |
| REQ-001.3 | `constraining` limita al rango | 3 casos |
| REQ-001.4 | `cbToPercent` respeta los 6 tramos y devuelve entero | 12 fronteras (0,10,20,30,45,60,80,100,125,150,195,239) |
| REQ-001.5 | `cbToPercent` sin medida valida devuelve `null` | `null`, `NaN`, `>= 240` |
| REQ-001.6 | `cbToPercent` acota y acepta cadenas numericas | `-5 -> 100`, `"50" -> 47` |

### REQ-002 - Fechas y horas
| ID | Requisito | Criterio de aceptacion |
|---|---|---|
| REQ-002.1 | `parseFechaHora2` lee `"Apr 25, 2026"` | 3 fechas, mes 1-12 |
| REQ-002.2 | Mes desconocido devuelve `month = 0` | documentado como defecto |
| REQ-002.3 | `parseFechaHora` con ISO + AM/PM | 02:46 AM -> 2; 02:46 PM -> 14; 12:00 AM -> 0; 12:30 PM -> 12 |
| REQ-002.4 | `parseFechaHora` con `"Apr 25, 2026"` | 23:05 -> hora 23 |
| REQ-002.5 | Solo reconoce AM/PM en mayusculas | `pm` minuscula -> 2 (defecto documentado) |
| REQ-002.6 | `menorIgual` compara por dia | menor, mayor y **igual** |

### REQ-003 - Secuencia de parcelas
| ID | Requisito | Criterio de aceptacion |
|---|---|---|
| REQ-003.1 | Encadena el inicio de cada parcela sumando minutos | `[30,45]` desde 02:46 -> `02:46`, `03:16`, cierre |
| REQ-003.2 | **El ultimo elemento se formatea en UTC** | se verifica el instante absoluto |
| REQ-003.3 | Ignora tiempos `<= 0` | `[0,-5,30]` -> 2 elementos |
| REQ-003.4 | Lista vacia devuelve solo el cierre | 1 elemento |
| REQ-003.5 | Formato `YYYY-MM-DD HH:mm` | regex sobre todas las salidas |

## 3. Trazabilidad

| Requisito | Prueba | Archivo | Estado |
|---|---|---|---|
| REQ-001.1 | `mapping escala linealmente entre rangos` | formulas.test.js | PASS |
| REQ-001.2 | `mapping con rango de entrada vacio devuelve infinito` | formulas.test.js | PASS |
| REQ-001.3 | `constraining limita al rango` | formulas.test.js | PASS |
| REQ-001.4 | `cbToPercent: limites de cada tramo` | formulas.test.js | PASS |
| REQ-001.5 | `cbToPercent: sin medida valida devuelve null` | formulas.test.js | PASS |
| REQ-001.6 | `cbToPercent: acota fuera de rango y acepta cadenas` | formulas.test.js | PASS |
| REQ-002.1 | `parseFechaHora2 lee 'Apr 25, 2026'` | fechas.test.js | PASS |
| REQ-002.2 | `parseFechaHora2 con mes desconocido` | fechas.test.js | PASS |
| REQ-002.3 | `parseFechaHora con fecha ISO y AM/PM` | fechas.test.js | PASS |
| REQ-002.4 | `parseFechaHora con fecha 'Apr 25, 2026'` | fechas.test.js | PASS |
| REQ-002.5 | `parseFechaHora solo entiende AM/PM mayusculas` | fechas.test.js | PASS |
| REQ-002.6 | `menorIgual compara por dia` | fechas.test.js | PASS |
| REQ-003.1 | `encadena el inicio de cada parcela` | secuencias.test.js | PASS |
| REQ-003.2 | `el ultimo elemento es el fin, en UTC` | secuencias.test.js | PASS |
| REQ-003.3 | `ignora tiempos cero o negativos` | secuencias.test.js | PASS |
| REQ-003.4 | `con lista vacia devuelve solo el cierre` | secuencias.test.js | PASS |
| REQ-003.5 | `formato de las salidas` | secuencias.test.js | PASS |

**Evidencia de ejecucion**: `npm test` -> `tests 17, pass 17, fail 0`.

## 4. Defectos detectados y conservados

Se conservan a proposito: esta reclamacion **traslada** codigo, no lo corrige. Corregir primero y
mover despues impide saber que causo un cambio.

| ID | Defecto | Impacto | Reclamacion |
|---|---|---|---|
| D-01 | `mapping` divide por cero si `inMin === inMax` | `Infinity/NaN` silencioso | REQ-007 |
| D-02 | `parseFechaHora` ignora `am/pm` en minusculas | horas mal calculadas si la UI envia minusculas | REQ-007 |
| D-03 | `generarSecuenciaParcelas` mezcla local (intermedias) y UTC (cierre) | el fin se desplaza 6 h en Mexico | REQ-007 |
| D-04 | `parseFechaHora2` con mes no reconocido da `month = 0` | fecha al ano anterior | REQ-007 |
| D-05 | `cbToPercent_old` esta declarada y **nunca se usa** | codigo muerto | REQ-008 |
| D-06 | `generarSecuenciaParcelas` no valida `tiempos` (no array) | excepcion en runtime | REQ-007 |

## 5. Decisiones de diseno

1. **UMD sin build**: cada modulo funciona como `<script>` clasico (expone `DTALogic.*`) y como
   `require()` en Node. Asi la PWA sigue sin bundler y las pruebas corren en Node puro.
2. **Delegacion 1:1 en core.js**: las 7 funciones se conservan con su misma firma y ahora llaman al
   modulo. Cero cambios en las 20 llamadas existentes. Cuando el resto del controlador se extraiga,
   las delegaciones desaparecen.
3. **Puente `__modulo()` que falla explicitamente**: si el orden de `<script>` se rompe, el error dice
   exactamente que modulo falta. Nunca un fallo silencioso.
4. **Orden de carga garantizado y verificado**: `formulas` -> `fechas` -> `secuencias` -> `core.js`.
5. **Pruebas independientes de la zona horaria**: se comprueban componentes locales y, para el cierre
   en UTC, el **instante absoluto**.

## 6. Criterios de aceptacion

- [x] Los 3 modulos cargan en Node y en el contexto de navegador simulado.
- [x] 17/17 pruebas en verde.
- [x] `core.js` mantiene su sintaxis y delega las 7 funciones.
- [x] `index.html` carga los modulos antes de `core.js`.
- [x] Comportamiento identico: las pruebas fijan los valores actuales, incluidos los defectos.

## 7. Siguientes reclamaciones

| ID | Alcance |
|---|---|
| REQ-004 | Extraer el dominio **devices** (`#region DEVICES`, L317-1473) |
| REQ-005 | Extraer **riego / planes** (`#region PLAN DE RIEGO`, L2107-2982) |
| REQ-006 | Extraer **notificaciones** y FCM |
| REQ-007 | Corregir D-01, D-02, D-03, D-04, D-06 **con pruebas primero** |
| REQ-008 | Eliminar codigo muerto (`cbToPercent_old`, etc.) |
| REQ-009 | Empaquetado nativo (Capacitor): decidir y probar |
