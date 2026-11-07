# REQ-064 - Estacionario: codigo de colores de controles y parcelas

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-07) - probar: usuario |
| Alcance | `logic/panel.js` (`estadoParcela`), `core.js` (`getPlotColor`, borde de la parcela en el mapa) |
| Pruebas | 357/357 en Node (3 nuevas) |
| Compilacion | `26.11.07.010` |

## 1. Codigo (definido por el usuario)

| Color | Estado | Regla (`forcedStart` = orden; `log.activeSectors` = confirmacion del equipo) |
|---|---|---|
| **Gris** | Apagado confirmado | El equipo confirma apagado y no hay orden pendiente de encender |
| **Amarillo** | Orden de encender o apagar **sin confirmar** en los logs | Orden 1 y el equipo aun no confirma encendido (o no hay dato); orden -1 y el equipo sigue encendido |
| **Verde** | Encendido confirmado | El equipo confirma encendido y no hay orden pendiente de apagar |

Igual para las parcelas 1-7 y para el motor (M, `p7`).

## 2. Donde se aplica

| Lugar | Antes | Ahora |
|---|---|---|
| Panel del estacionario (1-7 y M) | Un sector encendido por el equipo sin orden de la app (p. ej. un programa) salia **gris**; una orden sin ningun dato del equipo salia **gris** | Verde y amarillo respectivamente |
| Listado | Blanco = encendido | Verde (misma paleta; gris oscuro para apagado por el fondo de la tarjeta) |
| Mapa (borde de la parcela; el relleno sigue siendo la humedad, REQ-052) | Verde **en cuanto se daba la orden** (sin esperar confirmacion), blanco apagado; sin amarillo | Gris / amarillo discontinuo / verde, y la etiqueta dice "Regando" o "Esperando confirmacion del equipo" |

Donde la funcion anterior ya acertaba (ordenes 1 y -1 con dato del equipo), el resultado es el mismo
(prueba de equivalencia). `isPlotActive` (que decide si tocar el sector lo enciende o lo apaga) no cambia:
sigue mirando la orden.
