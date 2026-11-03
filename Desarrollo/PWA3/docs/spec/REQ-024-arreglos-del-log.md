# REQ-024 - Arreglos salidos del log real (salir, imagenes y CSP)

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `index.html` (interpolaciones y CSP), `core.js` (version y perfil inicializado) |
| Pruebas | 106/106 en Node + medicion en navegador antes/despues |
| Riesgo | Bajo: son correcciones puntuales verificadas en headless |

## 1. Lo que el log destapo

Al pulsar "Salir" el log mostro cuatro problemas reales (y uno que no lo era):

| # | Sintoma en consola | Causa | Arreglo |
|---|---|---|---|
| 1 | `GET /{{ getSensorImage(...) }} 404` | `src="{{ ... }}"` en lugar de `ng-src` | 3 `src` -> `ng-src` |
| 2 | `GET /assets/images/diseases/0 404` | `{{ disease.photo \|\| bug-vector-icon.jpg }}` **sin comillas**: Angular resta `bug - vector - icon` = **0** | comillas en 4 expresiones |
| 3 | `Connecting to cdn.jsdelivr.net ... violates CSP` | `connect-src` no incluia jsdelivr (hammer.js se carga por fetch) | `cdn.jsdelivr.net` en `connect-src` |
| 4 | `Loading the script 'blob:...' violates CSP` | el `blob:` de una extension del navegador | `blob:` en `script-src` |
| 5 | `[app] core.js 26.11.02.002` con `?v=...003` | la marca interna no se actualizo al subir la version | sincronizada |

## 2. El caso que **no** era una regresion

El log mostraba `TypeError: Cannot read properties of undefined (reading 'undefined')` con el stack
completo:

```
n.writeValue (angular.js:30802) -> e.$render (angular.js:33777) -> $digest
```

Es decir, **`ngModel.$render` de un `<select>`**, no codigo de la aplicacion. Para no confiar en
impresiones se hizo una **comparacion justa**: mismo navegador y misma medicion sobre el commit
anterior (`7cbd6ff`) en un worktree aparte.

| Medicion | ANTES (7cbd6ff) | AHORA |
|---|---|---|
| ocurrencias del TypeError | 6 | 6 |
| mensajes unicos | 1 | 1 |
| arranque (`ng-scope`) | si | si |

Conclusion: **preexistente y sin regresion**. El "3" que se citaba antes era un recuento de mensajes
**unicos** en otra ejecucion, no de ocurrencias.

### Hipotesis probada y **revertida**

Convertir los tres `<select ng-options>` de cultivo a `<option ng-repeat>` **empeoro** el recuento
(6 -> 8), asi que se revirtio y se restauraron **identicos al commit** (comparados con `git show
HEAD:...`). Se deja constancia para no repetir el intento: el problema no esta en esos selects.

## 3. Cambio que se conserva

`$scope.perfil` ya no se inicializa a `{}` sino con **todos los campos definidos**
(`perfilDesdeUsuario(null, null)`): un `ng-model` `undefined` en un `<select>` es justo la condicion
que dispara el fallo de `writeValue`. No cambia el recuento actual, pero elimina la condicion en los
selects nuevos del popup de perfil.

## 4. Evidencia

```
npm test                    106/106
lint                        0 errores
arranque                    ng-scope, 396.743 B
404 de {{...}}              0
404 de diseases/0           0
violaciones CSP             0
```

## 5. Pendiente

- Localizar el `writeValue` con DevTools (breakpoint en `angular.js:30802`) con la app en sesion.
  Candidatos: los `<select>` cuyo `ng-model` apunta a `actualSystem.*` antes de elegir equipo.
- Revisar los avisos `Password field is not contained in a form` (Chromium): son de los formularios
  de login, no rompen nada.
