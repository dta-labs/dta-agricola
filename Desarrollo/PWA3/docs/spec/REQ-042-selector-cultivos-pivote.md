# REQ-042 - Selector de cultivos del pivote

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-06) - probar: usuario |
| Alcance | `index.html` (`#modalRiego` y modal de edicion de plan del pivote), `core.js -> getCultures` |
| Pruebas | 226/226 en Node (3 nuevas en `pivote-cultivos.test.js`) |
| Origen | Prueba del usuario tras REQ-040: "donde unico no funciona el selector de cultivos es en los pivotes" |

## 1. Causa

Los dos selectores de cultivo del pivote (`#planSetCulture` en "Nuevo plan" y `#editPlanSetCulture`
en "Editar plan") eran `<select>` de Materialize: Materialize oculta el select real y construye una
lista propia con las `<option>` que existen **al inicializarse**.

- `#planSetCulture`: se construia en `resetNewPlan()` y en `getCultures()`, y en este ultimo
  **antes** del `$scope.$apply()` que dibuja las opciones: quedaba con la lista anterior (vacia).
- `#editPlanSetCulture`: `setEditPlan()` no lo reconstruye: no reflejaba los cultivos ni el cultivo
  guardado del plan.

No se veia antes porque los cultivos no se cargaban nunca (REQ-040 F-5).

## 2. Cambio

- Ambos pasan a `class="browser-default"` (select nativo) con
  `ng-options="cultivo.culture as cultivo.culture for cultivo in listOfCultures"`, igual que los
  selectores de cultivo de sensores. El valor sigue en `planSetCulture` y `editSelectedPlan.culture`
  (no se lee del DOM), asi que guardar no cambia.
- "Editar plan" ofrece "Sin cultivo" para planes sin cultivo asignado.
- `getCultures()`: `$scope.$apply()` antes de `M.FormSelect.init()` para el resto de select de Materialize.
- `core.js?v=26.11.06.003`.

## 3. Prueba manual

En un pivote: "Nuevo plan" muestra los cultivos y guarda el elegido; "Editar plan" muestra el cultivo
guardado, permite cambiarlo y guardar. Revisar que la etiqueta "Seleccionar Cultivo" no se encime.
