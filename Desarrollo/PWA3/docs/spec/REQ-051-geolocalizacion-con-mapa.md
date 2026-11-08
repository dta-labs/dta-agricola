# REQ-051 - Geolocalizacion con mapa: posiciones y poligonos de parcela

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-06) - probar: usuario |
| Alcance | `logic/geo.js`, `ui/mapa.factory.js`, `components/comunes/mapa-selector/`, `index.html` (4 ventanas), `core.js`, `style.css` |
| Pruebas | 289/289 en Node (18 nuevas: `geo.test.js`, `componentes/mapa-selector.test.js`, estructura) |
| Origen | Usuario, 2026-11-06 |

## 1. Pedido

| Ventana | Area | Funcion |
|---|---|---|
| Editar sensor | Geolocalizacion | Coordenadas en mapa |
| Agregar sensor | Ubicacion | Coordenadas en mapa (arreglar el formulario) + **area de la parcela como poligono** |
| Agregar equipo | Ubicacion | Coordenadas en mapa (arreglar el formulario) |
| Editar parcela | Poligono | Marcar el poligono en el mapa |
| Siempre que se marque un poligono | | Ayuda visual para el productor |

## 2. Componente `<dta-mapa-selector>`

Mapa satelital (Esri, el mismo del mapa del sistema) con dos modos:

| Modo | Interaccion |
|---|---|
| `punto` | Tocar el mapa coloca el marcador; se puede arrastrar; **Mi ubicacion** (GPS del dispositivo, alta precision); latitud y longitud editables a mano con validacion |
| `poligono` | Tocar agrega una esquina numerada; las esquinas se arrastran; con 3 o mas se cierra y muestra la **superficie** (ha o m²); **Deshacer**, **Borrar**, **Mi ubicacion como esquina** (caminar el perimetro) |

**Ayuda visual (modo poligono, siempre)**: tarjeta "¿Como marcar la parcela?" con un dibujo de una parcela
con esquinas numeradas y cuatro pasos; se abre sola si no hay nada marcado. Sobre el mapa, una
indicacion que cambia: "Toca la primera esquina" -> "Faltan N esquinas" -> "Parcela de X ha · N esquinas".

Diseno (REQ-038): el componente guarda el estado y habla con `dtaMapa` (unico que usa Leaflet). Entradas
de una via y salida `al-cambiar` con `$lat/$lng` o `$poligono`. `dtaMapa` resuelve Leaflet en modales
(ResizeObserver -> `invalidateSize` y reencuadre al hacerse visible) y usa marcadores `divIcon`.

## 3. Datos (R-01: formato de siempre)

| Dato | Formato |
|---|---|
| Posicion de equipo/sensor | `latitude`, `longitude` numericos (6 decimales, ~11 cm) |
| Poligono de parcela | `plots[p].poligon = [[lat, lng], ...]`; `""` si tiene menos de 3 esquinas. `logic/geo.js -> normalizarPoligono` lee tambien lo guardado antes (pares como texto, texto "lat,lng,..." del antiguo `<textarea>`) |
| **Nuevo**: area de la parcela del sensor | `sensors[Sx].poligon = [[lat, lng], ...]` (mismo formato). **Campo anadido**: no cambia ninguno existente |

## 4. Formularios arreglados

- Fuera: campos "Latidud", titulo "Unicacion", botones grises de GPS que leian variables globales
  (`setDevicePosition`, `setSensorPosition`, `setNewPoligonNode`; `getLocation` usaba la opcion mal
  escrita `enableHighAccurace`), el `<textarea>` del poligono y sus funciones de DOM.
- Agregar equipo: `label` de "Limite de velocidad" apuntaba al campo equivocado.
- Agregar/Editar sensor: el mapa solo aparece en redes de sensores (`ng-if`), no en neveras.

## 5. Pendiente / siguiente paso

- Dibujar en el mapa del sistema el poligono de los sensores (`sensors[Sx].poligon`).
- Editar el poligono del sensor en "Editar sensor" (hoy solo coordenadas, segun lo pedido).

## 6. Prueba manual

Las cuatro ventanas en escritorio y movil: el mapa se ve completo al abrir el modal (y al desplegar la
seccion de la parcela), tocar/arrastrar/deshacer/borrar, Mi ubicacion (permiso del navegador), guardar y
reabrir (posicion y poligono se conservan), superficie razonable para una parcela conocida.

## 6. Parcela del sensor situada en el sensor (REQ-087, 2026-11-08)

En "Editar sensor" (y "Agregar sensor") el mapa de la parcela usaba el centro solo al crearse (al cargar la pagina,
sin sensor) y no reaccionaba despues. Nuevas entradas `marca-lat` / `marca-lng` (ubicacion del sensor):

- Si la parcela no tiene puntos, el mapa se situa en el sensor (zoom cercano) al abrir la ventana y cada vez que se
  cambia su ubicacion; con puntos, no se mueve.
- Pin de referencia fijo en la ubicacion del sensor (no se arrastra ni se toca) para dibujar la parcela alrededor
  (`dtaMapa -> mostrarReferencia`).

Compilacion `26.11.08.011`.
