# REQ-149 - Alertas push: humedad relativa, presion, caudal y corriente; neveras e invernaderos

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-22) - **desplegar funciones: usuario** (`firebase deploy --only functions`) |
| Alcance | `functions/alertas-sensores.js` (nuevo, reglas puras), `functions/index.js` |
| Pruebas | 5 en `test/unit/alertas-push.test.js` |
| Compilacion | `26.11.22.025` |

## Pedido

Extender las alertas push a `hr`, `psi`, `fl` e `i` y a neveras/invernaderos; el cliente decide si las recibe.

## El cliente acepta o no

Cada parametro tiene su casilla **"avisar"** en Agregar/Editar sensor (REQ-054/145): `sensor.<param>.notify`.
Sin la casilla marcada no se envia nada de ese parametro (igual que `h` y `t` antes).

## Redes de sensores (`dayLogs`, 8 valores por sensor)

- Nueva funcion `sendRelativeHumidityNotifications`: humedad relativa (valor `Hr`) contra `sensor.hr`.
  "Humedad relativa baja/alta". Misma politica que humedad del suelo y temperatura (al cruzar; el limite inferior
  como maximo cada 3 h; de noche solo la temperatura baja).

## Neveras e invernaderos (`logs`, 3 valores por sensor)

Nueva funcion `sendColdRoomNotifications` (registro creado en `/systems/{id}/logs/{logId}`; los registros sin
`dataRaw`, como los de pivotes, salen sin leer la base; otros tipos de equipo salen tras leer los ajustes).

| Tipo | Valor | Limites | Mensajes |
|---|---|---|---|
| SHT2 (o sin tipo) | `[hr, t, vcc]` | `t`, `h` | Temperatura baja/alta, Humedad baja/alta |
| Psi | `[p, p2, vcc]` | `psi` | Presión baja/alta |
| Fl | `[q, q2, vcc]` (L/min) | `fl` | Caudal bajo/alto |
| Irms | `[i, i2, vcc]` (A) | `i` | Corriente baja/alta |
| Contact | puerta | - | (sin limites) |

Politica: se avisa **al cruzar** el limite (no estaba fuera en el registro anterior) y, mientras siga fuera, un
**recordatorio cada 3 h**, tambien de noche (una camara se vigila a toda hora). Estado en
`systems/{id}/notificationState/sensorThresholds/coldRoom_<param>/<sensor>/<lower|upper>`.
Titulo "DTA-Agricola nevera!" o "DTA-Agricola invernadero!"; icono de nieve/termometro si es temperatura.

## Pendiente del usuario

Desplegar las Cloud Functions (no se despliega desde aqui). Las dos funciones nuevas se crean al desplegar.
