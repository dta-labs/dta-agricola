# REQ-140 - Neveras e invernaderos: sensor sin datos (`lo`) en la tarjeta y en Notificaciones

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - probar: usuario |
| Alcance | `logic/nevera.js`, `logic/notificaciones.js`, `panel-nevera` (componente, plantilla), `paneles.css`, `core.js` (`processingAlerts`) |
| Pruebas | 5 en `sensor-sin-datos.test.js` |
| Compilacion | `26.11.22.019` |

## Pedido

- En la tarjeta del sensor, un icono de notificacion cuando su valor en `lo` es menor que 0.
- En Notificaciones, el aviso de desde cuando no se actualiza ese sensor.

## Contexto

El Gateway Universal manda `lo=[-17,-17,-17,-17,-17,0,0,0,0,0]`: por cada sensor (posicion = S0, S1, ...) los ciclos
que lleva sin recibir sus datos; negativo = sin datos. El servidor (WS v7, `updateNeveraDB.php`) lo guarda como texto
en el registro de `systems/{equipo}/logs` (neveras e invernaderos no usan `dayLogs`); con `data=[]` actualiza `date` y
`lo` del ultimo registro.

## Solucion

- `nevera.ciclosSinRecepcion(log, indice)`: ciclos sin recibir del sensor (0 si recibe o no hay `lo`).
- `nevera.sensoresSinRecepcion(sistema, log, instanteLog)`: `[{ clave, nombre, ciclos, desde, frecuencia }]`;
  `desde` = instante del registro - ciclos x frecuencia del sistema (`operationMode`, minutos).
- Tarjeta: icono `notification_important` (rojo) junto al nombre del sensor, con el numero de ciclos en el titulo.
- Notificaciones: tipo nuevo **Sin datos** (`portable_wifi_off`, gris), nivel alta: "Camara 1: no se actualiza desde
  Hoy 10:25 (17 ciclos sin recibir)". El id lleva el `desde` redondeado a la frecuencia: mientras el sensor siga sin
  datos es la misma notificacion; si vuelve y se pierde otra vez, es una nueva.

## Limitaciones

- La app aun no muestra los equipos `type = "Invernadero"` (no hay panel); la notificacion ya los incluye.
- Si `operationMode` no es un numero de minutos, la notificacion dice cuantos ciclos lleva (no la hora).
