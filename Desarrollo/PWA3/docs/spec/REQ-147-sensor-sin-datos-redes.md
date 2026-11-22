# REQ-147 - Sensor sin datos tambien en redes de sensores; el icono abre las notificaciones

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) |
| Alcance | `assets/js/core.js`, `components/sistema/panel-sensores/*`, `components/sistema/panel-nevera/*`, `components/sistema/paneles.css`, `index.html`; servidor en REQ-146 (WS v7 guarda `lo`) |
| Pruebas | 2 nuevas (+2 ajustadas) en `test/unit/sensor-sin-datos.test.js` |
| Compilacion | `26.11.22.023` |

Amplia [REQ-142](REQ-142-sensor-sin-datos.md) (especificacion comun a redes de sensores, neveras e invernaderos).

## Datos

El gateway de la red de sensores envia `lo` igual que las neveras: ciclos sin recibir de cada sensor por posicion
(S0, S1...), negativo = sin datos. El WS v7 lo guarda en el registro de `systems/{id}/dayLogs` (y, con `data=[]`, en el
ultimo registro). La app escucha el ultimo registro de `dayLogs`, asi que `sistema.log.lo` llega igual que en neveras.

## Comportamiento

- `processingAlerts` genera la notificacion **"Sin datos"** (misma de REQ-142) para `Sensor`, `Nevera` e `Invernadero`.
  Desde = instante del registro - ciclos x `operationMode` (min).
- Ficha del sensor en la red (panel-sensores): icono `notification_important` rojo junto al nombre cuando `lo` es negativo.
- En ambas tarjetas (red de sensores y nevera/invernadero) el icono es un **boton**: al hacer clic abre la ventana de
  notificaciones (`abrirNotificaciones()`), sin abrir la configuracion del sensor (detiene la propagacion del clic).
  Teclado: Enter/Espacio sobre el boton; foco visible.
