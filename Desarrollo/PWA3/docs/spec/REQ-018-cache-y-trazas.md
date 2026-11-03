# REQ-018 - Cache-busting y trazas de arranque (para no diagnosticar a ciegas)

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `index.html` (query `?v=`), `core.js` y `firebaseComm.js` (trazas) |
| Pruebas | verificacion en navegador: las 4 trazas salen en orden |
| Riesgo | Ninguno: solo una marca de version y cuatro `console.log` |

## 1. Sintoma que lo motivo

Tras el arreglo de REQ-017, el usuario recargo la consola y **no aparecia ninguna traza nueva**
(`[sesion]`, `[login]`), pero `autentication.js` si era el fichero nuevo.

## 2. Causa probable: URL cacheada

| Recurso | URL | Lo que pasa |
|---|---|---|
| `autentication.js` | sin `?v=` | siempre se pide de red: llega la version nueva |
| `core.js` | `?v=26.09.07.002` | **la misma URL antes y despues de los cambios** |

El service worker activo (`firebase-messaging-sw.js`, registrado en `core.js`) hace
`cache.put(event.request, copy)` de todo lo que pasa por `fetch` y usa `caches.match` como respaldo.
Con la URL sin cambiar, el navegador puede seguir ejecutando el `core.js` anterior: los arreglos
existen en disco pero **no se ejecutan**.

## 3. Correccion

1. **Cache-busting**: `core.js`, `firebaseMessaging.js` y `style.css` pasan a `?v=26.11.02.001`.
   Al cambiar la URL, la entrada de cache anterior no aplica y se pide a la red.
2. **Trazas inequivocas de arranque** (no sustituyen a las pruebas, sirven para diagnosticar):

```
[firebase] apps: 1 | repoDTA: true | authDTA: true
[app] core.js 26.11.02.001
[app] inicializacion()
[auth] registrando observador de sesion
```

## 4. Como se interpreta

| Lo que se ve en consola | Significado |
|---|---|
| Las 4 lineas | el codigo nuevo se esta ejecutando |
| **No** aparece `[app] core.js 26.11.02.001` | el navegador sirve un `core.js` viejo: desregistrar el service worker y `Ctrl+Shift+R` |
| Las 4 y, tras Google, **no** aparece `[sesion]` | el evento de sesion no llega (popup/COOP) -> usar redireccion |
| `[sesion]` + `[login] ... permission_denied` | el login funciona; fallan los permisos de la base de datos |

## 5. Procedimiento de recarga limpia

1. DevTools -> Application -> Service Workers -> **Unregister**.
2. Application -> Storage -> **Clear site data**.
3. `Ctrl+Shift+R`.

## 6. Evidencia

Chrome headless con perfil nuevo sobre `index.html`:

```
[firebase] apps: 1 | repoDTA: true | authDTA: true
[app] core.js 26.11.02.001
[app] inicializacion()
[auth] registrando observador de sesion
```

La app arranca (`ng-scope`, 376.955 B) y `npm test` sigue en **89/89**.
