# REQ-035 - Login fiable: Google, correo y salida

| Campo | Valor |
|---|---|
| Estado | **Implementado en codigo** (falta: acciones del usuario de la seccion 4 y prueba manual) |
| Pruebas | 153/153 en Node (13 nuevas) |
| Alcance | `assets/js/firebaseConfig.js`, `assets/js/autentication.js`, `core.js` (region USER y PERFIL), `index.html` (botones Salir, FirebaseUI), consola de Firebase y Google Cloud |
| Cubre | RF-AUT-01 a RF-AUT-08 de REQ-034 |
| Riesgo | Medio: toca configuracion de OAuth fuera del codigo |

## 1. Sintoma

"El login no esta funcionando adecuadamente". **Por confirmar con el usuario**: navegador, metodo
(Google o correo), entorno (localhost, canal de vista previa o produccion) y que se ve (vuelve al
login, se queda en blanco, mensaje de error).

## 2. Causas encontradas en el codigo

| ID | Causa | Evidencia | Efecto |
|---|---|---|---|
| C-1 | **`signInWithRedirect` con `authDomain` en otro dominio** | `firebaseConfig.js`: `authDomain: "dta-agricola.firebaseapp.com"`; la app se sirve en `dta-agricola.web.app` y en `localhost` | Los navegadores que particionan el almacenamiento de terceros (Chrome, Safari, Firefox, Edge con prevencion de seguimiento) no dejan al iframe de `firebaseapp.com` entregar el resultado: se vuelve de Google **sin sesion y sin error**. Coincide con el `iframewrapper.js: Network Error` de REQ-027 |
| C-2 | Errores de la redireccion silenciados | `autentication.js`: `getRedirectResult().catch(function () {})` | Cualquier fallo real (dominio no autorizado, red) desaparece; incumple RF-AUT-07 |
| C-3 | "Salir" no cierra la sesion | Menu lateral y menu del avatar llaman a `showLogin()`, que solo cambia la vista (REQ-029, seccion 5) | Al recargar el usuario vuelve a entrar solo; en un movil compartido, otra persona entra con su cuenta |
| C-4 | El observador ignora el cierre de sesion real | `core.js`: si `huboSesionEnEstaCarga`, todo evento nulo se descarta | Tras `logout()` o `cambiarDeUsuario()` la interfaz puede seguir mostrando datos del usuario anterior |
| C-5 | Cambios de `$scope` fuera del ciclo de Angular | `logout()` asigna `authUser = null` dentro de una promesa sin `$apply`; la rama autenticada del observador llama a `showWindow` sin `$apply` | La vista no se actualiza hasta el siguiente clic |
| C-6 | FirebaseUI cargado sin uso | `index.html` carga `firebase-ui-auth__es_419.js` y `firebaseui.css` | Peso y un segundo camino de auth latente |
| C-7 | Sin recuperacion de contrasena | No hay llamada a `sendPasswordResetEmail` | El usuario de correo que olvida la clave no puede entrar |

## 3. Requisitos

1. **Google por redireccion en el mismo dominio** (opcion 1 de la guia de Firebase
   "redirect best practices"): `authDomain` = el dominio que sirve la app.
   - En hosting (`*.web.app`, `*.firebaseapp.com`, canal `pwa3`): `authDomain = location.host`.
   - En `localhost`: emulador de Auth (D-4) o, mientras no exista, `signInWithPopup` como unica
     excepcion documentada.
2. **Ningun fallo silencioso**: `getRedirectResult` registra `[auth]` con el codigo y, si es un
   error de Firebase (`logic/login.js -> esErrorDeFirebase`), avisa al usuario.
3. **Una sola funcion de salida** `cerrarSesion()`: `signOut` + limpiar sesion local + cancelar
   listeners de RTDB + vista login. Todos los botones "Salir" la usan.
4. **El observador es la unica fuente de verdad**: un evento nulo tras un `signOut` pedido por el
   usuario se respeta; solo se ignora un nulo **no solicitado** durante la vuelta de la redireccion.
5. Toda actualizacion de `$scope` desde promesas o callbacks de Firebase pasa por `$evalAsync`.
6. Quitar FirebaseUI (script, CSS y comentarios en `core.js`).
7. Enlace "Olvide mi contrasena" con `sendPasswordResetEmail`.

## 4. Acciones del usuario (fuera del codigo)

1. Google Cloud Console -> APIs y servicios -> Credenciales -> cliente OAuth "Web client (auto
   created by Google Service)" -> URIs de redireccion autorizados: anadir
   `https://dta-agricola.web.app/__/auth/handler` y la URL del canal `pwa3`
   (`https://dta-agricola--pwa3-XXXX.web.app/__/auth/handler`).
2. Firebase -> Authentication -> Settings -> Authorized domains: comprobar `dta-agricola.web.app`,
   el dominio del canal `pwa3` y `localhost`.
3. Probar con la cuenta de QA, nunca con la de un cliente.

## 5. Pruebas

| Tipo | Prueba |
|---|---|
| Unitaria | `authDomain` elegido segun `location.host` (hosting, canal, localhost) |
| Unitaria | El observador respeta el nulo tras `cerrarSesion()` y lo ignora solo durante la redireccion |
| Unitaria | Todos los botones "Salir" de `index.html` llaman a `cerrarSesion()` (amplia `menu-salir.test.js`) |
| Unitaria | `getRedirectResult` no tiene un `catch` vacio |
| Unitaria | No queda ninguna referencia a FirebaseUI |
| Manual | Matriz navegador x metodo x entorno: Chrome, Edge (prevencion estricta), Firefox, Safari iOS; Google y correo; canal `pwa3` y localhost |
| Manual | Salir -> recargar -> sigue en el login |

Las pruebas de `estrategia-de-acceso.test.js` que prohiben `signInWithPopup` se ajustan para
permitirlo **solo** en la rama de `localhost`.

## 6. Criterio de cierre

RF-AUT-01 a RF-AUT-08 en verde en la matriz manual, `npm run verificar` en verde y el usuario
confirma el acceso con Google en su navegador habitual.

## 7. Implementacion (2026-11-05)

| Fichero | Cambio |
|---|---|
| `logic/login.js` | `esEntornoLocal`, `esHostingDeFirebase`, `authDomainPara`, `metodoDeAccesoGoogle`, `debeIgnorarSesionNula`; mensajes para `invalid-credential`, `too-many-requests`, `missing-email` |
| `firebaseComm.js` | Ajusta `config.authDomain` al dominio de hosting antes de `initializeApp` (traza `[auth] authDomain: A -> B`) |
| `autentication.js` | Google por redireccion en hosting y popup en local; `getRedirectResult` avisa los errores; Enter en la contrasena; "Olvidaste tu contrasena" con `sendPasswordResetEmail` |
| `core.js` | `$scope.salir()` unica (signOut + listeners + sesion local + login); `logout()` delega en ella; el observador respeta el cierre pedido y actualiza la vista con `$evalAsync`; `cambiarDeUsuario()` marca el cierre como pedido |
| `index.html` | Los tres botones "Salir" usan `salir()`; enlace `#resetPasswordBtn`; FirebaseUI eliminado (script y CSS); versiones `26.11.05.001` |
| `style.css` | Clase `.login-recuperar` |
| `package.json` + `test/ejecutar-pruebas.js` | `npm test` funciona en Node 20 y 22 |

Pruebas nuevas: `login-fiable.test.js` (8), `estrategia-de-acceso.test.js` (+2, popup acotado a local)
y `menu-salir.test.js` (salir real, sin FirebaseUI).

Nota de localhost: Firebase autoriza `localhost` por defecto, pero **no `127.0.0.1`** (Live Server).
Si se prueba en `http://127.0.0.1:5502`, anadirlo en Authorized domains o abrir `http://localhost:5502`.
