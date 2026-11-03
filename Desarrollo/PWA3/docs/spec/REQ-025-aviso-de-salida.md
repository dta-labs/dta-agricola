# REQ-025 - El aviso de salida no puede romper el inicio de sesion

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `logic/aviso.js` (nuevo), `core.js`, `autentication.js`, `logic/login.js`, `index.html` |
| Pruebas | 118/118 en Node (12 nuevas) |
| Riesgo | Bajo: el aviso nunca interrumpe salvo que haya cambios pendientes |

## 1. El sintoma real

El flujo de Google **completaba**: el log mostraba `createAuthUri`, el selector de cuentas, la
vuelta por `firebaseapp.com/__/auth/handler` y la vuelta a `index.html`. Pero no se entraba, y en
consola aparecia:

```
core.js:5388 Uncaught TypeError: Cannot set properties of null (setting 'innerHTML')
    at core.js:5388:50                 <- nuosro listener de beforeunload
    at ei (safeurl.js:700:48)          <- Firebase Auth
    at ifchandler.js:805:49
    ...
    at autentication.js:86             <- signInWithRedirect()
```

## 2. Causa raiz

```js
window.addEventListener("beforeunload", function (e) {
    document.getElementById("mensaje").innerHTML = "...";   // #mensaje NO existe
```

`#mensaje` **no existe en el DOM** (se comprobo: 0 apariciones en `index.html`), asi que el
listener lanzaba `TypeError` **justo cuando Firebase navega** para iniciar el redirect.

La cadena completa, que explica por que el usuario "no entraba":

1. `signInWithRedirect()` inicia la navegacion a Google.
2. El navegador dispara `beforeunload` **dentro** de esa misma pila de llamadas.
3. El listener lanza `TypeError` porque `#mensaje` es `null`.
4. La excepcion se propaga dentro del `await` de `autentication.js:86`.
5. El `catch` la interpreta como **error de acceso** y avisa al usuario,
   ademas de abortar el manejo del resultado de la redireccion.

## 3. Arreglo

### 3.1 Modulo `assets/js/logic/aviso.js` (nuevo)

Tres reglas, cada una con su prueba:

1. Escribir en el DOM **solo si el elemento existe** (`escribirSiExiste`).
2. **No pedir confirmacion** si no hay cambios pendientes: un `beforeunload` que siempre
   interrumpe estorba a los flujos de autenticacion y a la propia navegacion.
3. **Nunca lanzar**: un fallo del aviso no puede tumbar la salida de la pagina.

`core.js` lo usa si esta cargado y, si no, aplica una version minima que tampoco lanza.

### 3.2 `logic/login.js`: `esErrorDeFirebase(error)`

`mensajeDeError(new TypeError(...))` devolvia
`"No se pudo completar el acceso (error desconocido)"`: trataba un fallo de JavaScript como un
error de acceso. Ahora se distingue por el prefijo `auth/` del codigo, y `autentication.js` **no
avisa** cuando el fallo no viene de Firebase (puede ser que la navegacion ya este en curso).

### 3.3 Cache-busting completo

Quedaban **16 scripts sin `?v=`**, entre ellos `logic/login.js`: el navegador podia servir la
copia vieja sin `esErrorDeFirebase`. Ahora los 21 scripts de la aplicacion llevan version.

## 4. Evidencia

```
npm test                     118/118
lint                         0 errores
arranque headless            ng-scope, 416.657 B
Cannot set properties of null    0   (antes: 1, el bug)
Cannot read properties of undefined  6   (preexistente, writeValue, sin cambios)
404 / is not defined / CSP       0
trazas                       core.js 26.11.02.005, observador, apps
```

## 5. Pendiente

- **Probar con sesion real**: el arreglo elimina la excepcion que abortaba el flujo, pero la
  confirmacion definitiva es entrar con Google y ver `Sesion iniciada por redireccion:`.
- Ids consultados que **no existen** en `index.html` y pueden fallar cuando se ejecuten sus
  funciones: `#showPopupSueloClima`, `#showPupupCultivo`, `#showPopupGraphics`,
  `#showPupupIndicaciones`, `#riegoSelector`, `#sistemaSelector`. Son candidatos a fallos
  latentes (no se disparan al arrancar).
