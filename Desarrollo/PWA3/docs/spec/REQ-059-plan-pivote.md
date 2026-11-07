# REQ-059 - Plan de riego del pivote como componente (REQ-057 fase S3, grupo pivote)

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-07) - probar: usuario |
| Alcance | `components/sistema/plan-pivote/` (nuevo), `logic/pivote.js`, `core.js` (region PLAN DE RIEGO), `index.html` (lista de planes en "Configurar", `#modalResetRiego`), `ventana.css` |
| Pruebas | 341/341 en Node (8 nuevas en `componentes/plan-pivote.test.js`; REQ-042/043/055/056 ajustadas al formulario nuevo) |
| Compilacion | `26.11.07.004` |

## 1. Que habia

| Modal | Situacion |
|---|---|
| "Nuevo plan" `#modalRiego` | Leia los campos por `id` del DOM (`planAnguloIni`, `planValue`...) |
| "Planificacion" `#modalEditRiego` | El mismo formulario con modelo (`editSelectedPlan`) |
| "Eliminar plan" `#modalResetRiego` | Texto con errores ("toda la Plan de riego") |
| "Confirmar movimiento" `#modalConfirmRiegoMovimiento` | **Sin uso**: nada lo abria y `continuePlanMovimiento()` no existe |

## 2. Defectos corregidos

| ID | Defecto | Correccion |
|---|---|---|
| PP-1 | **Un plan nuevo se guardaba casi siempre a la velocidad maxima**: `value <= maxVelocity` comparaba textos (`"50" <= "100"` es falso) | Validacion numerica en `erroresDelPlan` y comparacion numerica tambien en `setNewPlan` (aun usado por "Eliminar plan") |
| PP-2 | Superar el maximo recortaba en silencio | Error en el campo: "El maximo de este equipo es X%" |
| PP-3 | El **tipo de suelo** se elegia pero no se guardaba (y en "Planificacion" el selector no tenia modelo) | Se guarda en el nuevo campo opcional `soil` del plan |
| PP-4 | Sin validacion de angulos | 0..360 y distintos entre si (un sector puede cruzar 0°: 300 -> 30 es valido) |
| PP-5 | "Planificacion" guardaba numeros y "Nuevo plan" texto | Siempre texto, como al crear (formato que ya lee el equipo) |
| PP-6 | "Aceptar" cerraba antes de validar | Solo cierra si el formulario es valido; luego la confirmacion de siempre |

## 3. `<dta-plan-pivote>`

Un solo formulario para crear y editar (estilo comun de ventanas), en tres secciones: **Sector**
(angulos), **Riego** (velocidad con el boton (?) de la tabla de velocidades REQ-056, y pistola final como
interruptor) y **Cultivo, suelo y sensor**. Titulo y boton cambian ("Agregar plan" / "Guardar cambios").

- `core.js`: `abrirPlanPivote(indice|null)` prepara `planPivote = { indice, plan }` (desde lo guardado o
  `planNuevo`, que empieza en el angulo final del ultimo plan) y abre `#modalPlanPivote`;
  `guardarPlanPivote($plan, $indice)` confirma y guarda; `verVelocidadesPivote` abre la tabla.
  `setTimer` (fila de la tabla) escribe en `planPivote.plan.velocidad`.
- Salen de `core.js`: `resetNewPlan`, `setEditPlan`, `editPlan` y la lectura del DOM de `setNewPlan`.
- `index.html`: -163 lineas (dos formularios y el modal sin uso). "Eliminar plan" con el estilo comun.

## 4. Datos (R-01)

Mismo formato en `actualSystem.plans["pN"]`, todo texto. **Nuevo campo opcional** `soil` ("1".."11").

## 5. Prueba manual

En un pivote: Configurar -> agregar un plan (angulos invalidos, velocidad sobre el maximo, plan valido al 50 %
y comprobar en Firebase que `value` es "50"), editar un plan existente (cultivo, suelo, sensor, pistola),
boton (?) -> elegir una fila -> la velocidad pasa al formulario, eliminar el plan.

## 6. Sectores sin solapes (REQ-060, 2026-11-07)

Reportado por el usuario con captura: se pudieron guardar sectores 0°-150° y 120°-180° (solapados).

- `logic/pivote.js`: cada sector se trata como tramos sobre [0°, 360°) (si cruza 0°, p. ej. 300° -> 30°,
  son dos tramos); dos sectores se solapan si comparten mas que un borde. `erroresDelPlan` recibe los
  planes y el indice editado y devuelve `sector`: "Se solapa con el sector 1 (0° a 150°) entre 120° y 150°".
- Formulario: aviso bajo los angulos y nota "pueden tocarse, pero no solaparse"; no guarda si hay solape.
- Lista de planes ("Configurar"): avisa de los solapes que **ya estaban guardados** ("Los sectores 1 y 2 se
  solapan entre 120° y 150°. Toca uno de los dos para corregirlo").
- Compilacion `26.11.07.005`. Pruebas: 344/344 (3 nuevas).

### Incidencia en la compilacion 26.11.07.005

El aviso de solapes (`ng-repeat="solape in solapamientosPivote()"`) recibia una lista nueva en cada digest:
Angular entraba en bucle (`$rootScope:infdig`), la pantalla dejaba de responder y el plan del pivote no se
abria. Corregido en `26.11.07.006`: la lista se guarda en cache y solo se recalcula si cambian los planes.
Prueba nueva: dos llamadas seguidas devuelven la misma referencia. Regla para el resto: **ninguna funcion
usada en un `ng-repeat` puede crear una lista nueva en cada llamada.**

## 7. Velocidad 0 % = zona de paro (REQ-062, 2026-11-07)

Confirmado por el usuario: 0 % define zonas por las que el pivote no puede pasar (al llegar se detiene).
Sigue siendo valido. El formulario muestra "Zona de paro: con 0 % el pivote se detiene al llegar a este
sector y no lo atraviesa" y la lista de planes marca esos sectores con "· paro". Compilacion `26.11.07.008`.
