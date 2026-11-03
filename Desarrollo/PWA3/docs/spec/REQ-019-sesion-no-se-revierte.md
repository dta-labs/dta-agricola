# REQ-019 - La sesion no se revierte: "entro una vez y ya no puedo entrar"

| Campo | Valor |
|---|---|
| Estado | **Confirmado por el usuario** (entra, elige cuenta y repite) |
| Alcance | `core.js` (observador de sesion, logout), `autentication.js` (Google), `logic/login.js` |
| Pruebas | 6 en `test/unit/login.test.js` (90 en total) |
| Riesgo | Medio: cambia el cierre de sesion y el metodo de Google; se documenta y se prueba a mano |

## 1. Sintoma

Con Google **entra una vez** y a partir de ahi ya no vuelve a entrar. En consola se repite
`finishPopupAndRedirectSignIn` y `Cross-Origin-Opener-Policy ... window.close`, sin ningun mensaje de
la aplicacion.

## 2. Causa raiz (dos problemas que se suman)

**a) El observador revertia el login.** En el `else` de `onAuthStateChanged`:

```js
$scope.authUser = null;
localStorage.clear();          // borra TODO
$scope.showWindow('login');
```

Cuando el popup no se puede cerrar (COOP), el SDK emite **eventos nulos transitorios**. Ese `else` los
interpretaba como "no hay sesion": borraba `localStorage`, anulaba `authUser` y devolvia al login
**justo despues de haber entrado**. Como ademas borraba lo persistido, el siguiente intento partia de
cero: "entro una vez y ya no".

**b) El popup no se puede cerrar.** El navegador bloquea `window.close()` por COOP. Cada clic deja una
ventana y una peticion pendiente; la siguiente produce `auth/expired-popup-request`. Los intentos se
acumulan en vez de resolver.

## 3. Correccion

| Antes | Ahora |
|---|---|
| Observador registrado en cada `inicializacion()` | **uno solo** (`observandoSesion`) |
| Un evento nulo devolvia al login | si ya hubo sesion en esta carga, **se ignora** (`[auth] evento nulo ignorado`) |
| `localStorage.clear()` en el observador | **no se borra nada**; el logout usa `limpiarSesionLocal()` (conserva notificaciones y sonido) |
| Google con `signInWithPopup` | Google con **`signInWithRedirect`**: no hay ventana que cerrar, desaparece el problema de COOP |
| `auth/expired-popup-request` no contemplado | tratado como "usar redireccion" |

## 4. Requisitos

| ID | Requisito | Criterio |
|---|---|---|
| REQ-019.1 | el login no se revierte por un evento nulo posterior | `huboSesionEnEstaCarga` |
| REQ-019.2 | un popup expirado exige redireccion | prueba unitaria |
| REQ-019.3 | el logout conserva las preferencias del dispositivo | `limpiarSesionLocal` |
| REQ-019.4 | Google no depende de `window.opener` | `signInWithRedirect` (0 usos de popup) |

## 5. Trazabilidad

`test/unit/login.test.js` (6) -> PASS. **90/90** en Node.
Verificado en Chrome headless: la app arranca (376.955 B, `ng-scope`) y las trazas de arranque salen en
orden con la version `26.11.02.002`.

## 6. Como probarlo

1. `Ctrl+Shift+R` (o desregistrar el service worker) para cargar `core.js?v=26.11.02.002`.
2. Pulsa Google: ahora **navega** a la cuenta y vuelve; no hay ventana emergente.
3. En consola debe verse `[sesion] autenticado: tu@correo`.
4. Si tras entrar aparece un evento nulo, veras `[auth] evento nulo ignorado` y **la app no te saca**.
5. Cierra sesion y vuelve a entrar: debe funcionar tantas veces como quieras (eso era el fallo).

## 7. Confirmacion

El usuario confirmo: **el login ya funciona** y se puede entrar repetidamente (era el fallo de
"entro una vez y ya no"). Con esto se cierra el bloque de autenticacion (REQ-015 a REQ-020).

## 8. Nota

Se mantiene `getRedirectResult()` en el arranque: es lo que recoge la sesion al volver de Google con
redireccion.
