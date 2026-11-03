# REQ-016 - Widget del tiempo de terceros: carga bajo demanda

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `index.html` (modal `#modalSuelo`) |
| Pruebas | verificacion en navegador (sin unitarias: es una carga de terceros) |
| Riesgo | Bajo: si no hay ubicacion no se carga nada; con ubicacion el widget funciona igual |

## 1. Sintoma

En consola, en cada carga de la pagina:

```
Fetch failed loading: POST "https://www.google-analytics.com/g/collect?...&en=widget_link_error
  &ep.widget_type=upcoming..."
  ... sendEvent @ sdk.bundle.min.js:2
  (anonymous) @ index.html:1611
```

## 2. Causa

Dentro del modal `#modalSuelo` (Condiciones Agroclimaticas) habia un `<script>` inline que **inyectaba
el SDK de Tomorrow.io al parsear el HTML**, es decir, en **cada carga** y no al abrir el modal.

Ese widget estaba configurado **sin ubicacion** (`data-location-id=""`), asi que:

1. el SDK no podia pintar nada y emitia `widget_link_error`;
2. el SDK manda sus propios eventos a **su** Google Analytics: el `tid=G-693LP2419S` del error **no**
   es el de la aplicacion (el de la app es `G-51FCCVQT6B`, en `firebaseConfig.js`);
3. el `POST` falla y ensucia la consola aunque **no** afecta a la aplicacion.

## 3. Correccion

El bloque `<script>` inline pasa a ser una funcion `window.cargarWidgetTiempo()` que:

- **no hace nada** si no hay `data-location-id` (y oculta el contenedor para no mostrar un bloque vacio);
- si hay ubicacion, inyecta el SDK **una sola vez** y llama a `__TOMORROW__.renderWidget()`;
- se invoca al abrir el modal (`click` en `[href="#modalSuelo"]`) y en `DOMContentLoaded`.

## 4. Como activarlo

En el `div .tomorrow` de `index.html`, poner el identificador de ubicacion:

```html
<div class="tomorrow" data-location-id="<ID_DE_UBICACION>" data-widget-type="upcoming" ...>
```

El widget es de Tomorrow.io: el id se obtiene en su panel de widgets (requiere cuenta).

## 5. Evidencia

| Comprobacion | Resultado |
|---|---|
| `<script id="tomorrow-sdk">` inyectado | **No** |
| `.tomorrow` con `display: none` | **Si** (la funcion salio sin cargar nada) |
| `cargarWidgetTiempo` definida | **Si** |
| App arranca (`ng-scope`) | **Si**, 376.955 B |
| `npm test` / smoke | **88/88** y **26/26** |

## 6. Nota sobre el resto de analytics

Firebase Analytics (`firebase-analytics.js` con `measurementId` `G-51FCCVQT6B`) sigue activo: es una
decision de producto y no se toco. Sus envios tambien pueden fallar si hay bloqueador de anuncios; en
ese caso el mensaje es el mismo tipo de `Fetch failed` y es igualmente inofensivo.
