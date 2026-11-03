# REQ-017 - El login no se queda colgado cuando falla la lectura de /users

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `firebaseComm.js` (`loadUserLocations`, `loadUserData`), `core.js` (`getUserData`), `repositorio.test.js` |
| Pruebas | 1 nueva en `test/unit/repositorio.test.js` |
| Riesgo | Bajo: solo anade manejo de error; el camino feliz no cambia |

## 1. Sintoma

Tras el popup de Google, la autenticacion se completa (el log muestra `verifyAssertion` y
`getAccountInfo` correctos y `finishPopupAndRedirectSignIn`), pero la aplicacion **no pasa del login**.

## 2. Causa raiz

```js
function loadUserLocations(email) {
    return new Promise((resolve) => {                    // sin reject
        repoDTA.escucharUsuarioPorClave(email, users => resolve(addNewFields(users)));
    });                                                  // sin handler de error
}
```

Si la lectura de `/users` falla (reglas, red, sesion sin permisos), el error se pierde: **la promesa
nunca resuelve ni rechaza**. `getUserData` se queda esperando y `$scope.showWindow('listado')` nunca se
ejecuta. El usuario ve que "no pasa la autenticacion" aunque Firebase ya le haya autenticado.

## 3. Correccion

| Antes | Ahora |
|---|---|
| `new Promise((resolve) => ...)` | `new Promise((resolve, reject) => ...)` y `reject` como `alError` |
| `getUserData` solo `.then` | `.then(...).catch(...)`: registra el error, muestra el motivo y **pasa al listado** (vacio) en vez de quedarse colgado |
| silencio | `console.log("[sesion] autenticado: <email>")` para poder distinguir "no autenticado" de "autenticado pero sin datos" |

## 4. Requisito

| ID | Requisito | Criterio |
|---|---|---|
| REQ-017.1 | `escucharUsuarioPorClave` propaga el error al manejador | `alError` recibe el error |

## 5. Trazabilidad

`test/unit/repositorio.test.js` REQ-017.1 -> **PASS**. Total **89/89** y smoke **26/26**.

## 6. Como diagnosticar ahora

1. Entra con Google. En consola debe aparecer `[sesion] autenticado: tu@correo`.
2. Si ademas aparece `[login] no se pudieron leer los datos del usuario: <error>`, el problema son los
   **permisos**, no el login. El mensaje tipico es `permission_denied at /users`.

## 7. Nota sobre las reglas desplegadas

`database.rules.json` del repositorio declara `.read: true` en la raiz, pero en la sesion de pruebas
aparecio `permission_denied at /cultivos`, que con esas reglas **no deberia ocurrir**. Conclusion: las
reglas **desplegadas** no coinciden con el fichero. Revisar en Firebase Console ->
Realtime Database -> Rules, y si procede desplegar las del repositorio.

## 8. Origenes y sesion (por que "en un sitio entra y en otro no")

La sesion de Firebase se guarda **por origen**. `http://localhost:5502`, `http://localhost` (puerto 80)
y `http://127.0.0.1:5502` son **tres origenes distintos**: no comparten sesion ni cache. Para Google,
Firebase autoriza `localhost` por defecto; `127.0.0.1` y las IP de la red local **no** estan
autorizados salvo que se anadan en Authentication -> Settings -> Authorized domains.
