# REQ-015 - Login con un solo SDK (Google no entraba)

| Campo | Valor |
|---|---|
| Estado | **Implementado** (pendiente de prueba manual con Google) |
| Alcance | `assets/js/autentication.js`, `logic/login.js`, `index.html` |
| Pruebas | 5 en `test/unit/login.test.js` + 2 en `test/smoke.html` |
| Riesgo | Bajo: el login de correo conserva su comportamiento; Google gana reintento por redireccion |

## 1. Sintoma

Al pulsar "entrar con Google":

```
Cross-Origin-Opener-Policy policy would block the window.close call.
  _open @ popup.ts:61
  PopupOperation.cleanUp @ popup.ts:272
  signInWithPopup @ popup.ts:85
  ...
```

## 2. Causa raiz: dos SDK, dos sesiones

La pagina inicializaba Firebase **dos veces con SDK distintos**:

| Fichero | SDK | Que hace |
|---|---|---|
| `firebaseComm.js` + `firebaseConfig.js` | **v8 compat** (`firebase.initializeApp`, `firebase.auth()`) | es la sesion que observa `core.js` |
| `autentication.js` (antes) | **v9 modular** (`initializeApp` + `getAuth`) | creaba **otra app** y **otra sesion**; el boton de Google usaba esta |

El popup se cerraba (de ahi el aviso de COOP, que es **solo un warning** al no poder acceder a
`window.opener`) y la sesion se creaba en la instancia v9, **que nadie escucha**. Por eso el usuario no
entraba: la app seguia viendo `firebase.auth()` (v8) sin sesion.

## 3. Correccion

1. `autentication.js` **deja de importar v9** y usa `firebase.auth()` (v8), la misma sesion que
   `core.js`. Se elimina la segunda app y la descarga del SDK v9.
2. Email/password pasan a la API v8 (`createUserWithEmailAndPassword` sobre `auth`).
3. Google: `signInWithPopup` y, si el codigo indica que el popup no sirve, **reintento con
   `signInWithRedirect`**; al arrancar se recoge con `getRedirectResult()`.
4. Los `catch` dejan de estar vacios: se muestra el mensaje traducido.
5. Las decisiones (`debeReintentarConRedirect`, `mensajeDeError`) viven en `logic/login.js`, puras y
   probadas; `autentication.js` solo las usa.

## 4. Requisitos

| ID | Requisito | Criterio |
|---|---|---|
| REQ-015.1 | popup bloqueado/no soportado/dominio no autorizado -> reintento por redireccion | 5 casos |
| REQ-015.2 | mensajes traducidos de los codigos frecuentes | 7 casos |
| REQ-015.3 | codigo desconocido -> mensaje generico con el codigo | regex |
| REQ-015.4 | codigos con guion bajo y con guion se tratan igual (v8 y v9) | 2 casos |
| REQ-015.5 | sin error no hay mensaje | cadena vacia |

## 5. Trazabilidad

`test/unit/login.test.js` (5) y `test/smoke.html` (2) -> **PASS**.
Evidencia: `npm test` -> **88/88**; smoke -> **26/26**; la app arranca (`ng-scope`, 375.364 B) y el DOM
ya **no** contiene `firebasejs/9`.

## 6. Como probarlo

1. Recarga con cache limpia (`Ctrl+Shift+R`): el SDK v9 ya no se descarga.
2. Pulsa el boton de Google. Si el navegador permite el popup, entra sin avisos.
3. Si lo bloquea, la app pasa a redireccion y vuelve con la sesion iniciada.
4. Cierra sesion y repite: `auth.getRedirectResult()` no debe dejar restos.

**El aviso de COOP puede seguir apareciendo como warning de Chrome** en el paso 2: es informativo y no
impide el acceso. Si aun asi no entra, el mensaje de la app indicara el `auth/...` concreto
(`auth/unauthorized-domain` es el tipico cuando el dominio no esta autorizado en Firebase).

## 7. Fuera de alcance

- `login/index.html` + `login/autentication.js`: **pagina de ejemplo independiente** (en ingles, con su
  propio `firebaseConfig.js` y v9). No la enlaza la aplicacion y no se toco.
- Migrar toda la app a v9 modular: cambio grande, sin relacion con el fallo.
