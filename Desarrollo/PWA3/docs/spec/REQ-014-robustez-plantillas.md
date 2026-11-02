# REQ-014 - Robustez de plantillas y auditoria de consola

| Campo | Valor |
|---|---|
| Estado | **Parcial**: 1 correccion aplicada, 1 mensaje sin localizar |
| Alcance | `assets/js/core.js` (`getPlotColor`, `isPlotActive`) |
| Pruebas | indirectas: `npm test` (64) + carga en Chrome headless |
| Riesgo | Ninguno: solo se anaden guardas |

## 1. Auditoria de consola (Chrome headless, arranque en frio)

Antes de este cambio, la app emitia **5** mensajes graves; ahora **4**. Clasificacion:

| # | Mensaje | Origen | ¿Mio? | Estado |
|---|---|---|---|---|
| 1 | `$interpolate:interr` + `TypeError: reading 'undefined'` al evaluar `getPlotColor(actualSystem,'p7')` | `core.js` `getPlotColor` accedia a `system.plots` con `system` indefinido | No (funcion de `00e0833`) | **Corregido aqui** |
| 2 | `TypeError: Cannot read properties of undefined (reading 'undefined')` x3 | plantilla de Angular en el primer digest; **sin stack** en el log | No localizado | **Abierto** |
| 3 | `permission_denied at /cultivos` | lectura de `cultivos`; las reglas **desplegadas** la deniegan (el `database.rules.json` del repo dice `.read: true`, pero lo que hay en Firebase puede no coincidir) | No | Abierto: requiere sesion real |
| 4 | `Cannot set properties of null` en `beforeunload` | `document.getElementById("mensaje").innerHTML` cuando el elemento no existe (solo al descargar la pagina) | No | Inocuo |
| 5 | `No se pudo revisar actualizacion: Failed to fetch` | el chequeo de actualizacion pide firmas que el servidor local no tiene | No | Inocuo en local |

## 2. Correccion aplicada

```js
// antes
if (index && system["plots"]) { ... system.log.activeSectors[idx] ... }
// despues
if (index && system && system.plots) { ... }        // + guarda de system
if (plot.forcedStart == 1 && system.log.activeSectors && system.log.activeSectors[idx] == 1)
```

Tambien en `isPlotActive`. Con esto desaparecen el `$interpolate:interr` y los `TypeError` de esa ruta.

## 2-bis. Evidencia recogida del mensaje #2

Se instrumento una copia temporal de la pagina interceptando `console.error` para capturar el stack:

```
TypeError: Cannot read properties of undefined (reading 'undefined')
    at n.writeValue (angular.min.js:310:508)
    at e.$render    (angular.min.js:331:46)
```

Es **`ngModel.$render` de AngularJS**, no codigo de la aplicacion. Dos hipotesis probadas y descartadas:

1. `<select ng-options>` con coleccion vacia: se inicializo `listOfCultures = {}` y se anadio `catch`
   a la lectura. **La correccion se queda** (evita un `null` y una promesa rechazada), pero el error
   persiste.
2. `<select>` con `ng-model` sobre un objeto inexistente (`actualSystem`, `newSensor`, `actualSensor`):
   se probo `ng-if` en los tres. **No cambio nada y se revirtio**: no mantengo cambios que no cumplen
   lo que prometen.

Localizarlo requiere DevTools con sesion (breakpoint en `writeValue`): es la prueba manual pendiente.
No bloquea: Angular registra el error y continua el `$digest`.

## 3. Lo que falta y por que

El mensaje **#2** no trae stack (Angular lo registra en `angular.min.js:124`, su logger). Localizarlo
requiere un `breakpoint` en DevTools con sesion iniciada, porque solo aparece durante el `$digest` de
las plantillas. **Es el motivo por el que se pide la prueba manual.**

El mensaje **#3** no se puede resolver desde el codigo: hay que comparar las reglas desplegadas con
`database.rules.json`. Si `cultivos` esta denegado, el selector de cultivos aparece vacio.

## 4. Criterio de cierre

1. Con sesion iniciada, la consola no muestra `reading 'undefined'`.
2. El selector de cultivos se llena (o, si no, se corrige la regla).
3. Los cuatro mensajes restantes quedan documentados como ambientales o de plantilla con su fix.
