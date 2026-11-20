# REQ-105 - Pantalla de inicio animada con barra de avance y version

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-20) - probar: usuario |
| Alcance | `index.html` (estilos y script en linea al principio del body), `core.js`, `app/version.js` |
| Pruebas | 442/442 en Node (3 nuevas en `pantalla-inicio.test.js`) |
| Compilacion | `26.11.20.006` |

Pedido: animar la pantalla de inicio como DTA-AgroSat, con barra de avance de la carga y la version.

## Diseño

Primer elemento del `body` (estilos en linea en el `head`, listos antes que el resto):

- **Logo animado** (motivo de riego): cuadro turquesa que aparece con rebote; el circulo del pivote y las marcas se
  **dibujan**; el **brazo del pivote gira**; un **punto orbita** alrededor (el "satelite", como en AgroSat).
- **DTA-Agricola** y el lema "Riego y monitoreo de cultivos".
- **Barra de avance real** con texto de estado:

| Tramo | Origen |
|---|---|
| 0-70 % | Scripts y estilos de la pagina cargados (eventos `load`) |
| 72 % "Iniciando…" | `window.load` |
| 82 % "Comprobando tu sesion…" | `inicializacion()` de Angular |
| 92 % "Cargando tus equipos…" | Sesion iniciada |
| 100 % y se retira | Primer equipo recibido (o 5 s), o pantalla de acceso si no hay sesion |

  Avance suave que nunca retrocede; minimo 2,1 s (una vuelta de la animacion, como AgroSat) y tope de 15 s.
- **Version** al pie ("Version 1.1.0-dev · compilacion …"), escrita por `version.js` (la misma del menu).
- `prefers-reduced-motion`: sin animaciones. `<noscript>`: no se muestra. `role="progressbar"` con `aria-valuenow`.

API: `window.dtaSplash.avance(porcentaje, texto)` y `window.dtaSplash.listo()`.
