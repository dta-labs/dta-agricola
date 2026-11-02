# REQ-006 - Dominio riego: programacion de parcelas

| Campo | Valor |
|---|---|
| Estado | **Implementado** (TDD: rojo -> verde) |
| Alcance | `assets/js/logic/riego.js` |
| Pruebas | 8 en `test/unit/riego.test.js` + 3 en `test/smoke.html` |
| Riesgo | Bajo: se conserva el comportamiento validado; se eliminan funciones muertas |

## 1. Hallazgo previo

El `#region PLAN DE RIEGO` (875 lineas) es **casi todo UI y `$scope`**: las 11 funciones que contiene
son manejadores de vista. La logica real de programacion estaba en otra parte, etiquetada dentro de
`DEVICES`:

```
L1072  createStationaryProgram(p)      -> decide el periodo y orquesta
L1098  runLoop(id, p, periodo)         -> itera dia a dia / semana a semana
L1114  excecuteProgram(id, p, fecha, hora) -> genera las 7 entradas de parcela y MUTA $scope
```

`excecuteProgram` mezclaba calculo y escritura en `$scope.actualSystem.plots`, y dos de las tres
funciones se asignaban **sin `var/let`**, creando globales implicitas (una de ellas, D-12).

## 2. Requisitos

| ID | Requisito | Criterio de aceptacion |
|---|---|---|
| REQ-006.1 | Una entrada por parcela (7) en periodo "veces" | parcela 0..6, fecha/hora de inicio |
| REQ-006.2 | `value` = minutos de la parcela en ms; `t` queda vacio | `[10,20,...] -> [600000,...]` |
| REQ-006.3 | Las parcelas se encadenan sumando sus minutos | 02:46, 02:56, 03:16, 03:46, 04:26, 05:16, 06:16 |
| REQ-006.4 | `cada > 1` repite el bloque encadenando con la hora **UTC** del cierre | el 2. bloque arranca a `13:26` (07:26 local) |
| REQ-006.5 | Periodo "dias" itera hasta `fecha_fin` | 3 dias x 7 = 21 entradas |
| REQ-006.6 | Periodo "semanas" avanza 7 dias | 25/04, 02/05, 09/05 |
| REQ-006.7 | Periodo desconocido no genera entradas | `entradas: []` |
| REQ-006.8 | Menos de 7 tiempos lanza `TypeError` | comportamiento actual conservado |

## 3. Trazabilidad

| Requisito | Prueba | Archivo | Estado |
|---|---|---|---|
| REQ-006.1 | `periodo 'veces' genera una entrada por parcela` | riego.test.js | PASS |
| REQ-006.2 | `value es el tiempo de la parcela en milisegundos` | riego.test.js | PASS |
| REQ-006.3 | `las parcelas se encadenan sumando sus minutos` | riego.test.js | PASS |
| REQ-006.4 | `cada=2 ... encadena EN UTC (D-03)` | riego.test.js | PASS |
| REQ-006.5 | `periodo 'dias' itera hasta fecha_fin` | riego.test.js | PASS |
| REQ-006.6 | `periodo 'semanas' avanza de 7 en 7 dias` | riego.test.js | PASS |
| REQ-006.7 | `periodo desconocido no genera entradas` | riego.test.js | PASS |
| REQ-006.8 | `menos de 7 tiempos lanza excepcion (D-13)` | riego.test.js | PASS |
| REQ-006.1/.2/.3 | 3 equivalentes en navegador | smoke.html | PASS |

## 4. Diseno

**Inversion de dependencia**: el modulo **calcula**, el controlador **escribe**.

```
antes:  excecuteProgram  ->  muta $scope.actualSystem.plots[i].schedule   (calculo + escritura)
ahora:  riego.programar(plan)  ->  { id, entradas: [...] }                (solo calculo)
        core.js asigna las entradas a $scope                              (solo escritura)
```

- `programar(plan, { generarId })`: el generador de id se **inyecta** para que las pruebas sean
  deterministas (mismo patron que el reloj de REQ-005).
- Se eliminan `runLoop` y `excecuteProgram` (0 referencias tras el cambio) y con ellas la global
  implicita `nueva_fecha_hora` (**D-12 resuelto por construccion**).
- El controller quedo reducido a aplicar el resultado: 8 lineas frente a 61.

> **Actualizado por REQ-007**: D-03 y D-13 quedaron **corregidos**; las pruebas REQ-006.4 y
> REQ-006.8 se actualizaron ahi. La seccion siguiente documenta el estado original.

## 5. Defectos conservados (para REQ-007)

| ID | Defecto | Impacto |
|---|---|---|
| **D-03** | El cierre de cada bloque se formatea con `toISOString()` (UTC) y el bloque siguiente arranca con esa hora | en periodo "veces" con `cada > 1`, la programacion se **desplaza 6 h** en Mexico. Con `cada = 1` tambien afecta al valor devuelto |
| **D-13** | Si `t` no trae al menos 6 tiempos positivos, `fechasParcelas[i]` es `undefined` y `.slice` lanza `TypeError` | crear el plan falla sin mensaje claro |

### Criterio de aceptacion para REQ-007 (riego)

1. El cierre de bloque se calcula en **local**; la encadenacion no se desplaza.
2. Con `t` incompleto, `programar` devuelve las parcelas calculables y un `aviso`, **sin lanzar**.
3. Pruebas en rojo primero; las de caracterizacion de 006.4 y 006.8 se actualizan en esa reclamacion.

## 6. Pendiente del dominio

| Item | Motivo |
|---|---|
| `showPlanRiegoPie`, `setCulturePlanningToSystem` y las 9 restantes del region | dependen de `$scope` / vista; requieren otro patron (servicios) |
| `deletePlan`, `deleteSchedule`, `confirmPlanEstacionario` | efectos sobre Firebase |
