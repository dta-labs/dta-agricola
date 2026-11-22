# REQ-153 - Arranque en el celular, una sola recarga por actualización y hueco de la barra de neveras

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario (PWA instalada en Android) |
| Alcance | `firebase-messaging-sw.js` (fetch), `assets/js/core.js` (actualizaciones), `components/sistema/paneles.css` |
| Pruebas | 5 en `test/unit/arranque-actualizacion.test.js` |
| Compilacion | `26.11.22.029` |

## 1. Imagen inicial larga en el celular

La imagen (logo sobre fondo blanco) es la **pantalla de inicio de Android**: el sistema la genera con el icono y el
color del `manifest.json` y la muestra hasta que la página pinta su primer cuadro. **No se puede quitar** desde la app;
sí acortar. Tardaba porque el service worker pedía `index.html` siempre a la red sin caché (en datos móviles, varios
segundos), y luego cada JS/CSS también.

- Abrir la app (navegación): red con **tiempo máximo de 2,5 s**; si no responde, la copia guardada. La red sigue y
  actualiza la copia; si había versión nueva, la app recarga una vez (punto 2) mientras se ve la animación.
- Archivos con `?v=` (versionados): primero la copia guardada; el resto, red primero y copia sin conexión.
- En la PC no hay pantalla del sistema: por eso allí arrancaba directo la animación.

## 2. Reinicios en cadena con varias actualizaciones pendientes

Cada aviso recargaba por su cuenta: archivos cambiados (firmas), service worker nuevo (`controllerchange`) y caché
nueva (`appUpdated`). Ahora todo pasa por `recargarParaActualizar(motivo, preguntar)`:

- Una recarga pide todo a la red, así que tras ella ya está la última versión: los avisos de los **60 s** siguientes
  se ignoran (marca en `sessionStorage`).
- En los primeros 15 s (pantalla de inicio) recarga sin preguntar; con la app en uso pregunta como antes.
- La caché del service worker no cambia de nombre (cambiarla forzaría otra recarga).

## 3. Hueco de la barra quitada (REQ-152)

`.panel-s-e44` pasa de 80 px a 10 px de margen y la lista ocupa `100vh - 82px`, como las fichas de sensores.
