# REQ-049 - Convivencia de modales Bootstrap / Materialize

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-06) - probar: usuario |
| Alcance | `assets/css/bootstrap-convivencia.css` (nuevo), `index.html` |
| Pruebas | 261/261 en Node (4 nuevas en `bootstrap-convivencia.test.js`) |
| Origen | Capturas del usuario del modal de Fichas (REQ-048) |

## 1. Sintomas reportados

| Vista | Sintoma |
|---|---|
| Lista y ficha | Ocupaban desde arriba y todo el ancho (capa blanca hasta el 80 % de la pantalla) |
| Lista | El buscador se encimaba al titulo; la lista subia por encima del titulo |
| Ficha | La linea de tiempo y las actividades subian por encima del titulo |

## 2. Causa

Bootstrap y Materialize usan los mismos nombres de clase para cosas distintas. En Bootstrap `.modal`
es la **capa a pantalla completa** que contiene `.modal-dialog`; en Materialize es la caja blanca.
Las reglas globales se aplicaban a los modales de Bootstrap:

| Origen | Regla | Efecto en Bootstrap |
|---|---|---|
| Materialize | `.modal { background-color: #fafafa; width: 55%/80%; margin: auto; overflow-y: auto; box-shadow }` | La capa a pantalla completa se volvia blanca y desplazable |
| style.css | `.modal { max-height: 80% !important; transform: scale(1); z-index: 1003 }` | Capa cortada al 80 %; `transform` cambia la referencia de lo fijo |
| Materialize | `.modal .modal-content { padding: 24px }` y `.modal-content { flex-direction: row }` | Cabecera, cuerpo y pie descolocados (el cuerpo subia sobre la cabecera) |
| style.css | `.modal-header { fondo gris, 1.5em, negrita, width 100%, **position: fixed** }` | Cabecera fuera del flujo: angosta, y el cuerpo se le montaba encima (segunda captura del usuario) |
| Materialize | `.modal .modal-footer { height: 56px; width: 100% }` | Pie de alto fijo |

## 3. Correccion

`bootstrap-convivencia.css`, cargado justo despues de `bootstrap-dta.css` y antes del CSS de los
componentes, devuelve los valores de Bootstrap **solo dentro de `.bs`** (especificidad 0,2,0; `!important`
solo donde el original lo usa). Sirve para todo modal de Bootstrap presente y futuro, no solo Fichas.
Se borra en la fase D de REQ-043 (sin Materialize).

Leccion: REQ-043 aislo el CSS de Bootstrap en `.bs`, pero el CSS de Materialize y style.css **no** esta
aislado y alcanza al marcado de Bootstrap. Las pruebas en Node no lo detectan (no hay navegador): toda
pieza nueva de Bootstrap se revisa en pantalla antes de cerrarse.

## 4. Segunda ronda (2026-11-06)

Tras la primera correccion seguia mal la cabecera: `style.css` define `.modal-header { ... position: fixed }`
(no se vio en la primera revision, que solo mostro las primeras lineas de la regla). Se anade
`position: static` en `.bs .modal-header` y una prueba que recorre `style.css` y exige que toda
propiedad de posicion o tamano de `.modal-header/-footer/-content/-body/-dialog` quede neutralizada.
`bootstrap-convivencia.css?v=26.11.06.002`.
