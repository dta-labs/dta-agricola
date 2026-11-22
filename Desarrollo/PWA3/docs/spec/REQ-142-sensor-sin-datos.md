# REQ-142 - Neveras e invernaderos: sensor sin datos

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) |
| Alcance | `assets/js/logic/nevera.js`, `assets/js/logic/notificaciones.js`, `assets/js/core.js`, `components/sistema/panel-nevera/*`, `components/sistema/paneles.css` |
| Pruebas | 5 en `test/unit/sensor-sin-datos.test.js` |
| Compilacion | `26.11.22.019` |

(Se registro primero como REQ-140; renumerado porque REQ-140 es "guardar programa" del Estacionario.)

**Aplica a todos los sensores** que use la app: redes de sensores (`Sensor`), neveras e invernaderos. La extension a
redes de sensores y el icono que abre las notificaciones estan en [REQ-147](REQ-147-sensor-sin-datos-redes.md).

## Datos

El WS v7 escribe en `logs` del equipo (Nevera e Invernadero no tienen `dayLogs`). Con `data=[]` actualiza `date` del
ultimo registro y agrega `lo`; sin registros crea uno vacio. `lo` = ciclos que el gateway lleva sin recibir de cada
sensor, por posicion (S0, S1...): `"[-17,0,0,...]"`. **Negativo = sin datos.**

## Comportamiento

- Tarjeta del sensor (panel de nevera): icono `notification_important` rojo junto al nombre cuando `lo` del sensor es negativo.
- Notificaciones: tipo **"Sin datos"** (`portable_wifi_off`, gris) con el mensaje
  `"<sensor>: no se actualiza desde Hoy 10:25 (17 ciclos sin recibir)"`.
  Desde = instante del registro - ciclos x `operationMode` (min). La entrada se mantiene (mismo id) mientras siga sin datos.
