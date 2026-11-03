# REQ-030 - El popup lo bloquea COOP: la via principal es la redireccion

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `autentication.js` |
| Pruebas | 127/127 en Node (4 nuevas) |
| Riesgo | Bajo: se vuelve al flujo que ya usaba el proyecto |

## 1. El sintoma

Al volver a `signInWithPopup` (REQ-028) reaparecio el aviso:

```
Cross-Origin-Opener-Policy policy would block the window.close call.
```

## 2. Por que

La ventana de Google vive en **otro origen** y responde con
`Cross-Origin-Opener-Policy: same-origin`. Con esa cabecera el navegador corta la relacion entre
la ventana emergente y la aplicacion, de modo que:

- `window.close()` desde la aplicacion queda bloqueado;
- la ventana se queda abierta;
- los intentos se acumulan (`auth/expired-popup-request`).

No se arregla desde JavaScript: es una politica de aislamiento del navegador. Por eso este
proyecto ya habia elegido la redireccion en REQ-019.

## 3. Cambio

`iniciarSesionConGoogle()` usa **`signInWithRedirect` como via principal**. El popup queda
unicamente como respaldo para entornos que no soportan redireccion
(`auth/operation-not-supported-in-this-environment`, tipico de algunos WebView).

```js
await auth.signInWithRedirect(proveedorGoogle);   // via principal
// solo si el entorno no soporta redireccion:
await auth.signInWithPopup(proveedorGoogle);
```

`auth.getRedirectResult()` se mantiene al cargar para recoger el resultado.

## 4. Pruebas

`test/unit/estrategia-de-acceso.test.js`:

1. la redireccion se intenta **antes** que el popup;
2. el popup esta detras del codigo `auth/operation-not-supported-in-this-environment`;
3. no queda ninguna decision basada en `auth/popup-blocked`;
4. se sigue recogiendo el resultado con `getRedirectResult()`.

Si alguien vuelve a poner el popup como via principal, el test falla.

## 5. Pendiente

- Confirmar con una cuenta real que la redireccion completa la sesion.
- Si apareciera `iframewrapper.js: Network Error`, seria un bloqueo de red del navegador hacia
  `apis.google.com` dentro del iframe de `firebaseapp.com`; entonces la salida no esta en el
  codigo sino en los ajustes del navegador (o en usar otro).
