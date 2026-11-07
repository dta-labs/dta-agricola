# REQ-039 - Componente `dta-login` (piloto de REQ-038)

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-06) - falta la prueba manual de la seccion 6 |
| Pruebas | 199/199 en Node (36 nuevas: controlador, factories, estructura y reglas) |
| Depende de | REQ-038 (factories `dtaAuth`, `dtaReglas`, `dtaUi`), REQ-035 (comportamiento del login) |
| Cubre | RF-AUT-01, 02, 03, 07, 08 de REQ-034 |
| Riesgo | Medio: es la puerta de entrada. Se valida contra la matriz de REQ-035 antes de cerrar |
| Por que primero | Recien estabilizado (REQ-035/036), autocontenido y sirve de plantilla para los demas |

## 1. Alcance

La **vista de acceso**: Google, correo en dos pasos, alta de cuenta y recuperar contrasena.
**Fuera de alcance**: el observador de sesion (`listenUserStatus` en `core.js`) y `salir()`, que son
de la app, no de la vista; se mueven a `dtaSesion` en un REQ posterior.

## 2. Origen (2026-11-05)

| Origen | Ubicacion | Destino |
|---|---|---|
| Vista de login | `index.html`, `<section id="usuarios">`, desde los fondos `fondo-web.png`/`fondo-cel.png` hasta el cierre del contenedor de acceso (aprox. lineas 4730-4784) | `components/login/login.html` |
| Modal de alta | `index.html`, `#modalSignup` (aprox. 4785-4806) | Dentro de `login.html` |
| Sombra del login | `index.html` lineas 393 y 4732, `.shadow-login` | Solo en `login.html` |
| Acceso con correo, alta, Google, recuperar, Enter | `assets/js/autentication.js` completo (listeners por `getElementById`) | Controlador de `dtaLogin` + `dtaAuth` |
| `$scope.loginEmailVerify` | `core.js` (lee `#signinMail` del DOM) | `logic/login.js -> esCorreoValido` (pura) |
| Paso del correo `dtaLoginEmail` | `ng-init` en la plantilla | Estado del controlador (`vm.paso = 'correo' \| 'contrasena'`) |
| Estilos en linea del login | ~30 `style=""` | `components/login/login.css` |

`<section id="usuarios">` conserva el bloque `users` (perfil antiguo) hasta REQ-041.

## 3. Comportamiento (no cambia)

| ID | Comportamiento | Criterio |
|---|---|---|
| L-1 | "Continuar con Google": popup en local, redireccion en hosting (`logic/login.js -> metodoDeAccesoGoogle`) | Matriz de REQ-035 |
| L-2 | Paso 1 correo -> flecha o Enter valida el formato y pasa al paso 2 | Correo invalido: se queda en el paso 1 con aviso |
| L-3 | Paso 2 contrasena -> logo o Enter entra; flecha atras vuelve al paso 1 | Error con `mensajeDeError` |
| L-4 | "Olvidaste tu contrasena" (paso 2) envia el correo de restablecimiento | Aviso de exito sin revelar si el correo existe |
| L-5 | "Crear cuenta" abre el modal de alta; Aceptar crea la cuenta y entra | Errores con `mensajeDeError` |
| L-6 | Enlaces de terminos (es/en) a `dtaamerica.com` | Abren en pestana nueva con `rel="noopener"` |
| L-7 | Al volver de Google con error, aviso visible (REQ-035 C-2) | Sin `catch` vacio |
| L-8 | El componente no navega: al entrar, el observador de `core.js` lleva al listado | Igual que hoy |

## 4. Mejoras incluidas (pequenas, del propio cambio)

- Correo y contrasena dentro de `<form ng-submit>`: desaparece el aviso del navegador "Password field
  is not contained in a form" y el gestor de contrasenas funciona. Igual en el modal de alta.
- `autocomplete="username"` / `"current-password"` / `"new-password"`; `<label>` o `aria-label` en
  cada campo; botones `type="submit"` en lugar de `<img>` con clic.
- Botones deshabilitados mientras hay una peticion en curso (evita dobles envios).

## 5. Diseno

```
components/login/
  login.component.js   dtaLogin, bindings: {} (no necesita entradas)
  login.html
  login.css
app/
  auth.factory.js      dtaAuth: accederConGoogle(), recogerRedireccion(), entrarConCorreo(),
                       crearCuenta(), recuperarContrasena()
logic/login.js         + esCorreoValido(texto)
```

- `$onInit`: `dtaAuth.recogerRedireccion()` (antes en `autentication.js` al cargar).
- `$onDestroy`: nada que cancelar (no hay suscripciones propias).
- `index.html`: `<dta-login ng-if="selectedWindow == 'login'"></dta-login>`.
- Se elimina `assets/js/autentication.js` y su `<script type="module">`.

## 6. Pruebas

| Prueba | Tipo |
|---|---|
| `esCorreoValido`: validos, invalidos, espacios, vacio, null | Regla |
| `vm.siguiente()` con correo invalido no cambia de paso; valido pasa a `contrasena` | Controlador |
| `vm.entrar()` llama `dtaAuth.entrarConCorreo(correo, clave)` una vez; error -> `dtaUi.avisar(mensaje)` | Controlador |
| `vm.google()` usa el metodo de `metodoDeAccesoGoogle(host)` | Controlador |
| `vm.recuperar()` sin correo avisa y no llama a Firebase | Controlador |
| `vm.crearCuenta()` pasa correo y clave; deshabilita mientras espera | Controlador |
| `$onInit` recoge la redireccion y avisa los errores de Firebase | Controlador |
| `index.html` ya no contiene `signinMail`, `signupMail`, `modalSignup` ni `autentication.js` | Estructura |
| `login.html` sin `style=""`, campos en `<form>`, con `autocomplete` | Estructura |
| `estrategia-de-acceso.test.js` y `login-fiable.test.js` apuntan al componente y a `dtaAuth` | Migracion de pruebas |

Manual: matriz de REQ-035 (Chrome, Edge estricto, Firefox, Safari iOS; Google y correo; local y
canal `pwa3`) + alta de cuenta con un correo de prueba + recuperar contrasena.

## 7. Criterio de cierre

Pruebas en verde, matriz manual en verde, consola sin errores, y medidas anotadas: lineas que salen
de `index.html` (esperado ~90) y `autentication.js` eliminado.

## 8. Implementacion (2026-11-06)

| Fichero | Cambio |
|---|---|
| `assets/js/components/login/login.component.js` | Controlador `vm`: `google`, `siguiente`, `atras`, `entrar`, `enviar` (Enter), `recuperar`, `abrirAlta`, `crearCuenta`; evita dobles envios (`vm.ocupado`); `$onInit` recoge la redireccion; `$onDestroy` retira el modal |
| `assets/js/components/login/login.html` | Fondos, sombra, Google, formulario de dos pasos en `<form ng-submit>`, alta en su propio `<form>`; 0 `style=""` |
| `assets/js/components/login/login.css` | Los ~30 estilos en linea; `dta-login { display: block }` |
| `assets/js/app/auth.factory.js` | `dtaAuth` (todo lo que hacia `autentication.js`) |
| `assets/js/app/reglas.factory.js` | `dtaReglas` |
| `assets/js/ui/ui.factory.js` | `dtaUi`: `avisar`, `abrirModal` (inicializa al abrir), `cerrarModal`, `destruirModal` |
| `assets/js/logic/login.js` | `esCorreoValido`, `debeAvisarError` |
| `index.html` | -78 lineas: el bloque de login pasa a `<dta-login ng-if="selectedWindow == 'login'">`; sale la sombra duplicada del listado; sale `autentication.js`; entran 4 scripts y 1 CSS |
| `core.js` | Inyecta `dtaAuth`; `cambiarDeUsuario` lo usa; sale `$scope.loginEmailVerify` |
| `autentication.js` | Movido a `_archivo/assets/js/` (borrar requiere permiso); `_archivo/**` fuera del hosting |
| `test/ejecutar-pruebas.js` | Recorre subcarpetas (`test/unit/componentes/`) |
| `test/lint.js` | `app/`, `ui/` y `components/` cuentan como modulos nuevos (sin `console.log`) |

Cambios visibles para el usuario: el boton "Crear cuenta nueva" abre el alta con el correo ya escrito
y ahora tiene "Cancelar"; los terminos abren en otra pestana; Enter funciona en ambos pasos.

## 9. Correcciones tras la prueba del usuario (2026-11-06)

| Reportado | Causa | Correccion |
|---|---|---|
| Los botones del campo no quedaban a la derecha | Las clases antiguas (`input-login-btn-ff/rr/img`) usaban `position: relative; left: 40%`; dentro de un `<button>` el porcentaje se calcula sobre el boton, no sobre el campo | Contenedor `.login-acciones` en `position: absolute; right: 6px` dentro de `.login-campo` (`position: relative`); el input reserva 90 px a la derecha |
| Con correo o contrasena incorrectos el aviso salia vacio | La ventana de SweetAlert se mostraba sin titulo (causa exacta no reproducida); ademas Firebase v8 con proteccion de enumeracion devuelve `auth/internal-error` | Los mensajes del login se muestran **debajo del formulario** (`vm.mensaje`, `role="alert"`), se borran al escribir; el alta muestra su error dentro del modal; `mensajeDeError` traduce `INVALID_LOGIN_CREDENTIALS` |

Versiones: `login.component.js` y `login.css` en `?v=26.11.06.002`; `logic/login.js` en `?v=26.11.06.002`.
