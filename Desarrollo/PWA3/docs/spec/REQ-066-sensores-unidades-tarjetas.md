# REQ-066 - Red de sensores: unidades de temperatura, sin tooltips fijos, tarjetas nuevas

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-07) - probar: usuario |
| Alcance | `logic/unidades.js` (nuevo), `ui/campos-unidad.directive.js` (nuevo), `index.html` (Agregar/Editar sensor), `core.js` (mapa), `components/sistema/panel-sensores/`, `paneles.css`, `style.css` |
| Pruebas | 362/362 en Node (5 nuevas) |
| Compilacion | `26.11.07.012` |

## 1. Unidades de temperatura en Agregar / Editar sensor

Los umbrales "Helada" y "Exceso de calor" mostraban siempre °C. La unidad del sistema esta en
`actualSystem.tempUnit` ("C" o "F"; sin valor = F, como el resto de la app).

**Importante**: el equipo manda la temperatura en °C y `functions/index.js` compara `sensors.t.minValue /
maxValue` contra ese valor, asi que los umbrales **se guardan en °C**. Cambiar solo la etiqueta habria hecho
saltar las alertas mal en sistemas en °F. Directiva `dta-temperatura` + `dta-unidad`: muestra y edita en la
unidad del sistema y guarda en °C (`logic/unidades.js`, ida y vuelta probada). Rango -30..60 °C / -22..140 °F;
paso de 0,5.

## 2. Sin tooltips fijos

Cada sensor de la red mostraba una tarjeta permanente sobre su marcador (`bindTooltip(..., { permanent: true })`)
que tapaba el mapa. Se quita; tocar el marcador sigue abriendo la ficha. Salen tambien `getSensorValue` (solo la
usaban esos tooltips), su estilo `.sensor-summary-tooltip` y un bloque de codigo comentado.

## 3. Tarjetas de sensores (vista que se abre con el boton junto a la foto)

Antes: tarjetas grandes (nombre a 2em, estado a 3em, tres filas de valores a 2em, iconos-boton con sombra).
Ahora (Bootstrap en `.bs`, rejilla `auto-fill` de 165 px; 2 columnas en movil):

| Zona | Contenido |
|---|---|
| Cabecera | Nombre (recortado con "...") y bateria |
| Principal | Humedad del suelo grande y el estado en una etiqueta de color |
| Datos | Temperatura y humedad del ambiente en una linea |
| Acciones | "Grafica" y ajustes (engrane) como botones pequenos |

Franja izquierda y etiqueta con el color del estado: seco rojo, adecuado verde, saturado azul, sin dato gris
(`vm.estado`, a partir de `soilStatus`). Fondo oscuro translucido sobre el mapa. 5 clases generadas sin uso salen
de `paneles.css`.
