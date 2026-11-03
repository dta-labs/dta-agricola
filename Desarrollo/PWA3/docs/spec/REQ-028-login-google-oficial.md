# REQ-028 - Acceso con Google: el flujo oficial de Firebase, sin extras

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `autentication.js`, `index.html` (limpieza), `style.css` (limpieza) |
| Pruebas | 118/118 en Node |
| Riesgo | Bajo: es el codigo de la documentacion de Firebase |

## 1. Decision

Tras el intento de REQ-027 (Google Identity Services con `client_id` manual), que acabo en
`Error 400: origin_mismatch`, se vuelve al flujo que documenta Firebase, sin piezas propias.

## 2. Codigo (esto es todo)

```js
const proveedorGoogle = new firebase.auth.GoogleAuthProvider();
proveedorGoogle.setCustomParameters({ prompt: "select_account" });

// Al pulsar el boton:
await auth.signInWithPopup(proveedorGoogle);
```

Y dos lineas oficiales de respaldo:

- `auth.signInWithRedirect(proveedorGoogle)` si el navegador bloquea la ventana
  (`auth/popup-blocked`).
- `auth.getRedirectResult()` al cargar, para recoger el resultado de esa redireccion.

## 3. Lo que se elimino

| Elemento | Motivo |
|---|---|
| `logic/googleIdentidad.js` y su test (12 pruebas) | usaba un `client_id` manual |
| `<script src="https://accounts.google.com/gsi/client">` | ya no hace falta |
| `accounts.google.com` en `connect-src` y `style-src` | solo lo necesitaba GIS |
| Regla `.google-signin-gis` en `style.css` | ya no existe el contenedor |

Comprobado que no queda ningun resto (`gsi/client`, `googleIdentidad`, `google-signin-gis`,
`accounts.id.` y `FedCM`: 0 apariciones).

## 4. Por que `origin_mismatch` no puede repetirse

El error aparece cuando se usa un **client_id OAuth propio** sin registrar el origen. Este flujo
no usa ningun client_id: Firebase toma el del proyecto. La unica condicion es que el dominio este
en **Authentication -> Settings -> Authorized domains**, y `localhost` ya lo estaba (la redireccion
llegaba al handler).

## 5. Verificacion

```
npm test                    118/118
lint                        0 errores
arranque headless           ng-scope, core.js 26.11.02.005, observador registrado
restos de GIS               0
Cannot set properties null  0 (REQ-025)
Uncaught                    0
violaciones de CSP          0
```

## 6. Pendiente

- Probar con una cuenta real: al pulsar el boton debe abrirse la ventana de Google y volver
  directamente a la aplicacion.
- Si el navegador bloquea la ventana (`auth/popup-blocked`) el codigo usa la redireccion.
