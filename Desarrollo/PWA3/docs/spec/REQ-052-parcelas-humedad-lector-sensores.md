# REQ-052 - Parcelas por humedad en el mapa, parcela del sensor, lector QR/barras/NFC y modales de sensor

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-06) - probar: usuario |
| Alcance | `logic/humedad.js` (nuevo), `logic/cultivos.js`, `ui/lector.factory.js` (nuevo), `components/comunes/lector-codigo/` (nuevo), `core.js` (mapa, getSensorValue, lectores), `index.html` (Agregar equipo, Agregar/Editar sensor), `ventana.css`, `style.css` |
| Pruebas | 312/312 en Node (23 nuevas + `carga-de-modulos.test.js`) |
| Origen | Usuario, 2026-11-06 |

## 1. Requisitos y solucion

| # | Requisito | Solucion |
|---|---|---|
| 1 | Al tocar una parcela, abrir "Editar parcela" | El poligono de la parcela (estacionario) ya no abre una ventana emergente: `setEditPlanEstacionario(idx)` + modal `#modalEditRiegoEstacionario`. Al pasar el cursor, etiqueta con nombre, cultivo, humedad y "Toca para editar" |
| 2 | Marcar la parcela que ocupa un sensor, como en la parcela | Selector de poligono (REQ-051) en "Agregar sensor" y en "Editar sensor"; el area se dibuja en el mapa de la red de sensores y al tocarla abre "Editar sensor" |
| 3 | Agregar sensor: ajustar la UI; cultivo, **selector de fases fenologicas**, identificador y lector | Indicador de pasos (Tipo -> Cultivo y alertas -> Identificador y ubicacion); bloque "Cultivo que mide el sensor" con cultivo y fase lado a lado arriba de las alertas; nombre e identificador juntos con el lector debajo; pie con "Cancelar / Atras / Siguiente / Agregar sensor" |
| 4 | Leer QR, codigo de barras y NFC | Componente `<dta-lector-codigo>` en Agregar equipo, Agregar sensor y Editar sensor (ver seccion 3) |
| 5 | Editar sensor: modificar la parcela | Selector de poligono bajo la geolocalizacion; ademas, nombre/identificador con "Cambiar/Bloquear" y fase fenologica como selector |
| 6 | Areas sombreadas segun la humedad del suelo | Relleno por estado (seco rojo, adecuado verde, saturado azul, sin dato gris) con leyenda en el mapa; borde verde intenso si la parcela se esta regando |

## 2. Humedad (`logic/humedad.js`)

Regla extraida de `getSensorValue` (mismos umbrales y fondos): WM en cb (<=10 saturado, <=60 adecuado,
>60 seco); el resto en % con `h.minValue`/`h.maxValue` (25/60 por defecto). Lectura: `log.dataRaw`,
8 valores por sensor. Parcela de estacionario: humedad de su sensor (`plot.sensor` = red,
`plot.sensorId` = sensor). **Cambio visible**: sin lectura la tarjeta dice "Sin dato" en vez de "Seco -99%".

## 3. Lector (`dtaLector` + `<dta-lector-codigo>`)

- Camara (html5-qrcode): QR, Data Matrix, Aztec, PDF417, CODE 128/39/93, EAN-8/13, UPC-A/E, ITF, Codabar;
  usa el `BarcodeDetector` nativo si existe; recuadro ancho para codigos lineales.
- NFC (Web NFC, Chrome Android + HTTPS): registro de texto o URL; si no hay, numero de serie de la
  etiqueta. El boton solo aparece si el dispositivo lo admite.
- La camara se apaga al leer, al cerrar, al desmontarse **o al dejar de verse** (IntersectionObserver):
  antes quedaba encendida si se cerraba el modal sin pulsar el boton.
- Sustituye a los dos lectores casi iguales de `core.js` (~150 lineas eliminadas).

## 4. Fases fenologicas

`logic/cultivos.js -> FASES_FENOLOGICAS` (9 fases genericas). El valor guardado sigue siendo texto en
`phenologicalStage`; si un sensor tenia escrita otra fase, se conserva como opcion (`fasesConActual`).

## 5. Datos

Sin cambios de formato. `sensors[Sx].poligon` (REQ-051) se edita tambien desde "Editar sensor".

## 6. Incidencia durante la implementacion

Mientras se trabajaba, `core.js` uso `__modulo("humedad")` antes de que `index.html` cargara
`logic/humedad.js`: la app no arrancaba. Se anadio `carga-de-modulos.test.js`, que exige que todo
`__modulo("x")` de `core.js` tenga su `logic/x.js` cargado antes, que toda etiqueta `<dta-...>` tenga su
componente y que toda factory inyectada este cargada.

## 7. Prueba manual

Mapa de un estacionario con parcelas y sensor asociado (colores y leyenda; tocar abre Editar parcela) y
de una red de sensores con areas (tocar abre Editar sensor). Agregar sensor completo (pasos, cultivo y
fase, lector QR/barras, NFC en Android, ubicacion y parcela). Editar sensor: cambiar parcela y fase.
Cerrar un modal con la camara encendida: la camara debe apagarse.

## 8. Ajustes de interfaz tras la captura del usuario (REQ-053, 2026-11-06)

| Reportado | Causa | Correccion |
|---|---|---|
| Margenes excesivos en el movil | Cada paso es `.input-field.col.s12.row` con otra `.col.s12` dentro: dos rellenos laterales; y `tema.css` da 20/24 px al contenido | Clase `modal-asistente` en `#modalNuevoSensor` y `#modalEditSensor`: un solo relleno (16-18 px; 12 px en el movil) |
| Pasos cortados ("Cultivo y a…") | Tres pasos con texto no caben a 360 px | En el movil solo el numero, salvo el paso actual |
| Alertas cortadas ("Min -") | Casilla, nombre y dos campos en una linea fija | Fila flexible que se acomoda; campos Min/Max en caja de 64 px |
| Quitar el texto de Atras / Siguiente / Agregar sensor en el movil | — | Texto en `.boton-texto` oculto por debajo de 600 px; solo el icono, con `aria-label`; el pie queda en una fila |

`ventana.css?v=26.11.06.004`.

## 9. Alertas con umbrales separados e iconos centrados (REQ-054, 2026-11-06)

Pedido: en el movil centrar los iconos de los botones; en las alertas separar cada umbral con su etiqueta
(humedad min "No regar", max "Regar"; temperatura min "Helada", max "Exceso de calor").

- Cada alerta es un bloque: casilla de aviso arriba y, debajo, los dos umbrales en columnas, cada uno con
  etiqueta, unidad y una linea de ayuda ("Por debajo: ...").
- **Humedad segun el tipo de sensor** (la misma regla que `functions/index.js -> getSoilMoistureAlert`):
  tensiometro WM (cb): min = "No regar" (saturado), max = "Regar" (seco), como se pidio; sensores en %:
  al reves (min = "Regar", max = "No regar"). Con etiquetas fijas, la mitad de los sensores mostraria la
  accion contraria. Unidad cb/% segun el tipo; WM admite hasta 239 cb.
- Temperatura: "Helada" / "Exceso de calor"; rango -30..60 °C (antes `min="0"`: un umbral de helada
  negativo dejaba el modelo vacio sin avisar).
- Botones solo-icono del movil: `inline-flex` centrado (el `float` de Materialize y los espacios del HTML
  los descentraban). `ventana.css?v=26.11.06.005`.
