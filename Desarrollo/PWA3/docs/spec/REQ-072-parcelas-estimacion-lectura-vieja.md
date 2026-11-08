# REQ-072 - Parcelas: estimacion, punto de medicion, lectura vieja y varios sensores

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-07) - probar: usuario |
| Alcance | `logic/geo.js` (`puntoEnPoligono`, `recortarPorCercania`), `logic/estado.js` (`antiguedadDeLectura`, `textoAntiguedad`), `core.js` (mapa: areas de sensores, parcelas del estacionario, leyenda), `style.css` |
| Pruebas | 377/377 en Node (4 nuevas en `lectura-vieja.test.js`) |
| Compilacion | `26.11.07.018` |

## 1. Decision (analisis pedido por el usuario)

¿Sombrear toda la parcela o un circulo degradado alrededor del sensor? Se mantiene **la parcela**: es la unidad
en la que se decide el riego (valvula/sector) y el sensor se instala para representarla. El circulo degradado
inventaria un radio sin modelo de suelo, cruzaria a parcelas vecinas regadas aparte y mezclaria colores. Pero un
color solido aparenta mas certeza de la que hay, por eso los 4 puntos siguientes.

## 2. Implementado

| # | Punto | Detalle |
|---|---|---|
| 1 | Parcela como **estimacion** | Opacidad 0.35 (antes 0.45); la leyenda dice "estimada con el sensor" |
| 2 | **Punto de medicion** | Circulo solido (7 px, borde blanco) del color de la lectura en la ubicacion del sensor; se actualiza en su sitio; no captura el toque (el marcador abre "Editar sensor", REQ-067) |
| 3 | **Lectura vieja** (> 24 h desde `log.date`) | Se **conserva el color** de lo ultimo medido y encima van **rayas grises** (patron SVG); la etiqueta dice "Ultima lectura hace N h / N d". En la red de sensores y en las parcelas del estacionario (lectura de su sensor asociado). Sin fecha o sin lectura: sin rayas |
| 4 | **Varios sensores en una parcela** | Si otros sensores estan dentro del area de un sensor, el area se reparte: cada uno sombrea la zona mas cercana a el (celda de Voronoi recortada a la parcela) |

Leyenda: Seco / Adecuado / Saturado / Sin dato, "Punto de medicion" y "Lectura de mas de 24 h" (muestra rayada).

Notas: "mas de 24 h" es estricto (24 h exactas aun no es vieja). Todos los sensores de una red comparten
`log.date`, asi que la antiguedad es la de la red.
