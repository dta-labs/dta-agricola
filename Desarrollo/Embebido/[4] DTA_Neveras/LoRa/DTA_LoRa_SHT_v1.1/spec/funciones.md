# Funciones

Orden de revisión: el orden en que se ejecutan.

| # | Función | Archivo | Estado | Pruebas |
|---|---|---|---|---|
| 1 | `setup()` | DTA_LoRa_SHT_v1.1.ino | En revisión | test_setup_loop.cpp |
| 2 | `loop()` | DTA_LoRa_SHT_v1.1.ino | En revisión | test_setup_loop.cpp |
| 4 | `loadNodeConfig()` / `saveNodeConfig()` / `nodeCrc()` | memoria.h | Pendiente | test_memoria.cpp |
| 5 | `setupSensors()` | DTA_LoRa_SHT_v1.1.ino | En revisión | test_setup_loop.cpp |
| 6 | `setupSHT()` | sensorSHT4.h | Pendiente | — |
| 7 | `initLoRa()` | lora.h | Pendiente | — |
| 8 | `readSensor()` | DTA_LoRa_SHT_v1.1.ino | Pendiente | — |
| 9 | `readSHT()` | sensorSHT4.h | Pendiente | — |
| 10 | ~~`isCritical()`~~ (eliminada, D-019) | — | — | — |
| 11 | `shouldTransmit()` | DTA_LoRa_SHT_v1.1.ino | Pendiente | test_transmision.cpp |
| 12 | `transmit()` | DTA_LoRa_SHT_v1.1.ino | Pendiente | — |
| 13 | `createDataStr()` | DTA_LoRa_SHT_v1.1.ino | Pendiente | test_protocolo.cpp |
| 14 | `getVcc()` | miscelaneas.h | Pendiente | — |
| 15 | `calculateSum()` | miscelaneas.h | Pendiente (sin cambios, D-001) | — |
| 16 | `txData()` | lora.h | Pendiente | — |
| 17 | `receivedConfirmation()` | lora.h | Pendiente | test_protocolo.cpp |
| 18 | `checkDataIntegrity()` | lora.h | Pendiente | test_protocolo.cpp |
| 19 | `getTxFrequency()` / `applyTxFrequency()` | lora.h | Pendiente | test_protocolo.cpp |
| 20 | `sleepSeconds()` | DTA_LoRa_SHT_v1.1.ino | Pendiente | — |
| 21 | `markSent()` | DTA_LoRa_SHT_v1.1.ino | Pendiente | — |
| 22 | `lowPower()` | DTA_LoRa_SHT_v1.1.ino | Pendiente | — |

---

## 1. `setup()`

**Propósito:** preparar el nodo una sola vez al encender o reiniciar.

**Secuencia:**
1. Iniciar el puerto serie a 250000 baudios y mostrar versión y protocolo.
2. Cargar la configuración de EEPROM (`loadNodeConfig`); si no es válida, usar valores por defecto.
3. Fijar `TIMER` dentro de `MIN_TIMER`–`MAX_TIMER`.
4. Inicializar el sensor y construir el Id (`setupSensors`).
5. Inicializar el radio (`initLoRa`) y guardar el resultado en `loraOk`.

**Reglas:**
- Ninguna falla en la inicialización detiene el nodo: sensor y radio se reintentan en `loop()`.
- Sin watchdog (D-017).

**Notas de revisión:** _(pendiente)_

## 2. `loop()`

**Propósito:** un ciclo completo de trabajo: medir, decidir, transmitir y dormir.

**Secuencia:**
1. Leer el sensor (`readSensor`).
2. Si `loraOk` es falso, reintentar `initLoRa`.
3. Si el radio está listo, hay Id y `shouldTransmit()` es verdadero:
   - `transmit()`; si se confirma → `markSent()`.
   - `lastTxFailed` registra si falló, para limitar los intentos del siguiente ciclo.
4. Si no transmite, imprime `.` en el monitor serie.
5. Dormir (`lowPower`).

**Reglas:**
- Sin Id conocido no se transmite (el gateway descartaría la trama).
- Un dato solo se da por enviado con confirmación del gateway.

**Notas de revisión:** _(pendiente)_
