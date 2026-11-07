# REQ-040 - Componentes `dta-ayuda` y `dta-fichas-tecnicas`

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-06) - falta la prueba manual de la seccion 6 |
| Pruebas | 223/223 en Node (20 nuevas) |
| Depende de | REQ-038; patron validado en REQ-039 |
| Cubre | RF-AYU-01 de REQ-034 |
| Riesgo | Bajo: contenido casi estatico |

## 1. Alcance

Dos vistas del menu lateral: **Ayuda** (manual con secciones plegables) y **Fichas tecnicas**
(catalogo de cultivos con su plan de riego por etapas).

## 2. Origen (2026-11-05)

| Origen | Ubicacion | Destino |
|---|---|---|
| Vista Ayuda | `index.html`, `<section id="ayuda">` (region `AYUDA`, aprox. lineas 4318-4692): 17 secciones `collapsible` con imagenes de `assets/images/help/` y enlaces a redes | `components/ayuda/ayuda.html` |
| Ruta | `core.js`: ruta `/ayuda` -> `showAyuda()` | Igual; el contenedor monta `<dta-ayuda>` |
| Lista de fichas | `index.html`, `#fichasTecnicas` (region `SERVICIOS`, aprox. 4071-4110) | `components/fichas-tecnicas/fichas-tecnicas.html` |
| Modal de ficha | `index.html`, `#fichaTecnica` (aprox. 4112-4141) | Dentro de `fichas-tecnicas.html` |
| Abrir fichas | `core.js`: `$scope.loadCultures()` desde el menu lateral | Menu: `showWindow('fichasTecnicas')`; la carga la hace el componente |
| Leer cultivos | `core.js`: `getCultures()` (`__repo().leerCultivos()`) | `$onInit` del componente via `dtaRepo` |
| Preparar la ficha | `core.js`: `$scope.showFichaTecnicaModal(plan)` | `logic/cultivos.js` (nuevo) + controlador |

**No se mueve** `listOfCultures` de `core.js`: tambien lo usan el plan de riego (`selectCulture`,
`selectPlanRiego`, linea `for (idx in $scope.listOfCultures)`). Se mueve con el componente de plan
de riego; mientras tanto el componente lee los cultivos por su cuenta.

## 3. Defectos encontrados que se corrigen

| ID | Defecto | Evidencia | Correccion |
|---|---|---|---|
| F-1 | **Abrir una ficha por segunda vez pone todas las etapas en el dia 0** | `showFichaTecnicaModal` modifica el objeto compartido: la 1a vez convierte `"10~15"` en `10`; la 2a, `day` ya es numero y la expresion devuelve `0` | Funcion pura `prepararFicha(cultivo)` que devuelve una **copia** ordenada, sin tocar el original |
| F-2 | Las etapas tipo `n` se muestran en la lista de cultivos | `n-show="plan.type != 'n'"` (falta la `g`) | Filtro en el controlador (`cultivosVisibles`) |
| F-3 | La lista de cultivos puede no cargarse nunca | `loadCultures` solo llama a `getCultures()` si `!$scope.listOfCultures`, pero se inicializa en `{}` (verdadero) | El componente siempre lee al entrar (`$onInit`) |
| F-4 | Enlaces externos de Ayuda sin `rel` | `target="_blank"` sin `rel="noopener"` | Anadir `rel="noopener"` |

## 4. Comportamiento

| ID | Comportamiento | Criterio |
|---|---|---|
| A-1 | Ayuda muestra las 17 secciones plegables, en el mismo orden | Comparacion de titulos con la version actual |
| A-2 | Las imagenes de ayuda cargan diferidas (`loading="lazy"`) | Igual que hoy |
| A-3 | "Volver" lleva al listado | `al-volver` |
| F-a | Fichas lista cultivos con icono gratis/pago y detalle | Igual que hoy |
| F-b | Cultivo gratuito: abre la ficha con etapas ordenadas por dia, y el margen de dias | Abrir 2 veces da el mismo resultado (F-1) |
| F-c | Cultivo de pago: aviso "recurso de pago" | Igual que hoy |
| F-d | Sin permiso para leer `/cultivos` o sin datos: mensaje "No hay fichas disponibles" en vez de lista vacia muda | Nuevo mensaje |

## 5. Diseno

```
components/ayuda/                ayuda.component.js, ayuda.html, ayuda.css
                                 bindings: { alVolver: '&' }
                                 $onInit: inicializar collapsibles con dtaUi; $onDestroy: destruirlos
components/fichas-tecnicas/      fichas-tecnicas.component.js, .html, .css
                                 bindings: { alVolver: '&' }
logic/cultivos.js (nuevo)        esGratuito(cultivo), cultivosVisibles(lista),
                                 prepararFicha(cultivo) -> { culture, detail, etapas[] } sin mutar
```

Contenido de Ayuda: se mantiene en la plantilla (no se pasa a JSON en este REQ).

## 6. Pruebas

| Prueba | Tipo |
|---|---|
| `prepararFicha` convierte `"10~15"` en dia 10 y margen `"10~15"`; ordena; **no muta** la entrada; dos llamadas dan lo mismo | Regla |
| `prepararFicha` con `day` vacio, numerico o mal formado | Regla |
| `esGratuito`: `"0.00"`, `"0"`, `0`, `"15.00"`, ausente | Regla |
| `cultivosVisibles` excluye tipo `n` y entradas nulas | Regla |
| Controlador de fichas: `$onInit` lee cultivos una vez; error -> estado "sin fichas" | Controlador |
| Controlador de fichas: abrir gratuito usa `dtaUi.abrirModal`; de pago usa `dtaUi.avisar` | Controlador |
| `index.html` ya no contiene `#fichasTecnicas`, `#fichaTecnica` ni el contenido de Ayuda | Estructura |
| `core.js` ya no tiene `showFichaTecnicaModal` ni `loadCultures` | Estructura |
| Enlaces `target="_blank"` de Ayuda con `rel="noopener"` | Estructura |

Manual: abrir Ayuda y desplegar varias secciones; abrir una ficha gratuita dos veces (F-1); abrir una
de pago; abrir ambas vistas sin red con la app instalada.

## 7. Criterio de cierre

Pruebas en verde, F-1 a F-4 corregidos, y medidas: lineas que salen de `index.html` (esperado ~420)
y de `core.js`.

## 8. Implementacion (2026-11-06)

| Fichero | Cambio |
|---|---|
| `components/ayuda/` | Plantilla con las 17 secciones (los 69 `style=""` pasan a clases de `ayuda.css`); `$postLink` inicia los plegables y `$onDestroy` los destruye; `vm.compartir()` (antes `$scope.compartirWhatsApp`) |
| `components/fichas-tecnicas/` | Lista y modal; lee `/cultivos` en `$onInit`; estados `cargando` / `lista` / `vacia`; el aviso de "recurso de pago" se muestra en la vista; filas como `<button>` |
| `logic/cultivos.js` (nuevo) | `esGratuito`, `cultivosVisibles`, `diaDeInicio`, `prepararFicha` (copia, sin mutar) |
| `app/repo.factory.js` (nuevo) | `dtaRepo` |
| `ui/ui.factory.js` | `iniciarPlegables`, `destruirPlegables` |
| `index.html` | -432 lineas (Ayuda 370, lista de fichas 38, modal 29); menu "Fichas tecnicas" -> `showWindow('fichasTecnicas')` |
| `core.js` | Salen `loadCultures`, `showFichaTecnicaModal`, `selectedPlaneRiego`, `compartirWhatsApp`; `selectSystem` ya no cambia de ventana; carga real de cultivos (F-5) |

### Defectos: estado final

| ID | Estado |
|---|---|
| F-1 | Corregido: `prepararFicha` trabaja sobre una copia; abrir dos veces da lo mismo (prueba) |
| F-2 | Corregido: `cultivosVisibles` excluye tipo `n` |
| F-3 | Corregido: el componente lee al entrar |
| F-4 | Sin objeto: los 4 enlaces externos estaban en un pie de Ayuda oculto (`display: none`), que se elimina |
| **F-5** (nuevo) | **Corregido.** `listOfCultures` arranca en `{}`, asi que `if (!$scope.listOfCultures) getCultures()` no se cumplia nunca: **los cultivos no se cargaban en ninguna parte** (fichas, plan de riego, selector de cultivo de parcelas, enfermedades). Ademas `selectSystem` llamaba a `loadCultures()`, que cambiaba a la ventana de fichas. Ahora `cargarCultivosSiFaltan()` lee una vez (con guarda contra lecturas simultaneas) y `selectSystem` no cambia de ventana |

Prueba manual adicional por F-5: al entrar a un sistema, el selector de cultivo de las parcelas y
el plan de riego deben mostrar los cultivos.
