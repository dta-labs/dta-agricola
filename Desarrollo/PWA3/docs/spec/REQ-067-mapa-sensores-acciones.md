# REQ-067 - Mapa de la red de sensores: parcela = datos, sensor = configuracion

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-07) - probar: usuario |
| Alcance | `core.js` (marcadores de sensores y `dibujarAreasDeSensores`) |
| Pruebas | 363/363 en Node (1 nueva; 2 de REQ-052/066 ajustadas) |
| Compilacion | `26.11.07.013` |

Pedido del usuario: intercambiar las acciones.

| Al tocar | Antes | Ahora |
|---|---|---|
| La **parcela** (area) del sensor | "Editar sensor" | **Ficha con los datos** del sensor (la que antes salia en el marcador), con sus botones de grafica |
| El **sensor** (marcador) | Ficha con los datos | **"Editar sensor"** |

Detalles:
- Antes cada actualizacion de datos redibujaba las areas; con la ficha en el area, se habria cerrado sola cada
  pocos segundos. Ahora un area ya dibujada **se actualiza en su sitio** (forma, color, etiqueta y, si la ficha
  esta abierta, su contenido) y solo se crea o se quita cuando aparece o desaparece.
- Al tocar se usa el sensor **vivo** (`sensorVivo`): el objeto del sistema se reemplaza con cada actualizacion y
  "Editar sensor" debe editar el que se va a guardar.
- La etiqueta del area dice "Toca para ver los datos".
- Un sensor **sin parcela marcada** no tiene donde mostrar la ficha en el mapa: sus datos estan en la vista de
  tarjetas (REQ-066) o marcando su parcela en "Editar sensor" (REQ-052).
