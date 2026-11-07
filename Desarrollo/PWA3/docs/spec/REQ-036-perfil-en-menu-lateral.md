# REQ-036 - Foto del usuario, perfil en el menu lateral y plan actual

| Campo | Valor |
|---|---|
| Estado | **Implementado** (probar: usuario) |
| Alcance | `index.html` (barra superior, menu lateral, modal de planes), `core.js` (region PERFIL), `style.css` |
| Pruebas | 161/161 en Node (7 nuevas en `perfil-menu-lateral.test.js`; `menu-salir.test.js` ajustado) |
| Riesgo | Bajo: solo presentacion |

## 1. Reportado por el usuario (2026-11-05)

1. No se muestra la foto del usuario en la barra superior.
2. El menu del perfil debe estar en el menu lateral izquierdo.
3. En "Plan" debe verse cual tiene el usuario.

## 2. Causas

| Punto | Causa |
|---|---|
| Foto | `<img ng-src="{{ authUser.photoURL }}">` sin `referrerpolicy`: las fotos de `googleusercontent.com` se rechazan con frecuencia cuando llevan referrer. Si fallaba, `ng-show="authUser.photoURL"` dejaba la imagen rota y ocultaba la alternativa |
| Plan | Ya se marcaba, pero solo con `blue lighten-5` y un boton gris deshabilitado: casi invisible |

## 3. Cambios

- **Avatar**: `referrerpolicy="no-referrer"`; si la imagen falla, `marcarFotoFallida()` muestra la
  inicial en un circulo. Se reintenta en cada nueva sesion. El avatar abre el menu lateral.
- **Menu lateral**: cabecera con foto, nombre, correo y plan; despues Perfil, Plan, Cambiar de
  usuario (solo cuentas de Google). El resto de opciones y el unico "Salir" quedan debajo.
- **Desplegable del avatar eliminado**: `menuUsuario`, `abrirMenuUsuario` y el listener de clic
  global de `document` ya no existen.
- **Planes**: linea "Tu plan actual: X", tarjeta con borde verde y franja "Tu plan actual", y
  etiqueta "Plan actual" con check. Si nunca eligio plan, se marca el gratuito.
- `planDelUsuario()` es la unica fuente para el plan (menu lateral y modal).
- `core.js?v=26.11.05.003`, `logic/perfil.js?v=26.11.05.001`.

## 4. Correccion: la foto se veia como inicial (2026-11-05)

El usuario veia la inicial aunque Google entrega `photoURL`. Regla: **siempre que se pueda, la foto**.

| Causa | Arreglo |
|---|---|
| `firebase-messaging-sw.js` re-pedia desde el service worker toda peticion de otro dominio (`fetch(event.request).catch(() => caches.match(...))`); si fallaba, devolvia una respuesta vacia y la imagen se rompia | Las peticiones de otros dominios ya no se interceptan: las resuelve el navegador |
| Con un solo error se pasaba a la inicial | Se reintenta con otra URL de la misma foto (`logic/perfil.js -> fotoAlternativa`, `=s128-c`); la inicial solo aparece si falla tambien el reintento, con traza `[perfil] no cargo la foto: <url>` |
