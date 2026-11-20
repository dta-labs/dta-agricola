# Funcionamiento

## Ciclo de trabajo

1. Despertar y reactivar el watchdog.
2. Leer el sensor (si falló antes, intentar reinicializarlo).
3. Si el radio no está inicializado, reintentar.
4. Decidir si se transmite (criterios abajo).
5. Si se transmite: enviar la trama y esperar confirmación, con reintentos.
6. Dormir `TIMER` minutos ±20 % (ciclos de 8 s en `powerDown`).

## Criterios de transmisión

Se comparan contra el **último dato confirmado** por el gateway, no contra la lectura anterior:
un cambio gradual se acumula hasta llegar al umbral (D-019).

| Condición | Transmite |
|---|---|
| Primera transmisión desde el arranque | Sí |
| Han pasado `HEARTBEAT` horas sin transmisión confirmada | Sí (señal de vida) |
| El sensor falló o se recuperó | Sí |
| \|ΔT\| ≥ `DELTA_T` (0.5 °C) | Sí |
| \|ΔHr\| ≥ `DELTA_HR` (0.5 %) | Sí |

La humedad se envía sin decimales (lo exige el servidor); el umbral se evalúa con el valor real del sensor.

## Confirmación y reintentos

- Espera de confirmación por intento: `ACK_TIMEOUT` (8 s).
- Intentos por transmisión: `MAX_TX_ATTEMPTS` (4).
- Entre intentos, el MCU y el radio duermen 1–3 s × número de intento.
- Si la transmisión anterior no fue confirmada, solo se hace 1 intento.
- Un dato no confirmado no se da por enviado; se vuelve a evaluar en el siguiente ciclo.

## Frecuencia de lectura

- `TIMER` minutos (por defecto `DEFAULT_TIMER` = 5), limitado a `MIN_TIMER`–`MAX_TIMER` (1–60).
- Si `USE_GATEWAY_TIMER` es `true`, se adopta la frecuencia de la confirmación y se guarda en EEPROM.
- Variación aleatoria de ±20 % para evitar colisiones; mínimo 1 ciclo de 8 s.

## Watchdog

No se usa (D-017): el bootloader del Pro Mini no soporta el reinicio por watchdog.
`LowPower` usa el watchdog solo como temporizador para despertar, sin reinicio.

## Aleatoriedad

`randomSeed(serie ^ analogRead(A0) ^ micros())`: cada nodo usa una secuencia distinta.

## EEPROM

| Dirección | Contenido |
|---|---|
| 0 | Marca `0xB7` |
| 1–5 | `NodeConfig`: `serial` (uint32), `timer` (uint8) |
| 6 | CRC-8 (polinomio 0x07) de `NodeConfig` |

Solo se escribe cuando el valor cambia (`EEPROM.put`/`update`).

## Parámetros configurables (`configuracion.h`)

| Constante | Valor | Descripción |
|---|---|---|
| `TEST` | `false` | Modo banco de pruebas (Id y lecturas simuladas) |
| `TTL` | 5 | Campo TTL de la trama |
| `DEFAULT_TIMER` | 5 min | Frecuencia por defecto |
| `MIN_TIMER` / `MAX_TIMER` | 1 / 60 min | Límites de frecuencia |
| `USE_GATEWAY_TIMER` | `true` | Aplicar la frecuencia del gateway |
| `HEARTBEAT` | 1 h | Máximo sin transmitir |
| `DELTA_T` | 0.5 °C | Cambio de temperatura que se transmite |
| `DELTA_HR` | 0.5 % | Cambio de humedad que se transmite |
| `MAX_TX_ATTEMPTS` | 4 | Intentos por transmisión |
| `ACK_TIMEOUT` | 8000 ms | Espera de confirmación |
| `PKT_LEN` | 64 | Longitud máxima de trama |
