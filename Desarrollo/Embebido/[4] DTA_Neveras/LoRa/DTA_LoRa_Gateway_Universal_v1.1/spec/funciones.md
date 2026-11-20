# Funciones

Orden de revisión: el orden en que se ejecutan.

| # | Función | Archivo | Estado | Pruebas |
|---|---|---|---|---|
| 1 | `setup()` | DTA_LoRa_Gateway_Universal_v1.1.ino | Pendiente | test_memoria.cpp |
| 2 | `loop()` / `isTxTime()` / `txData()` | DTA_LoRa_Gateway_Universal_v1.1.ino | Pendiente | test_comunicaciones.cpp |
| 3 | `loadConfig()` / `saveConfig()` / `configCrc()` / `resetConfig()` | memoria.h | Pendiente | test_memoria.cpp |
| 4 | `initLoRa()` | loraComm.h | Pendiente | test_lora.cpp |
| 5 | `idleTasks()` / `waitMs()` | miscelaneas.h | Pendiente | test_comunicaciones.cpp |
| 6 | ~~`updateLedMode()` / `updateLed()`~~ | — | Eliminada (D-036) | — |
| 7 | `loraPoll()` | loraComm.h | Pendiente | test_lora.cpp |
| 8 | `serviceLoRa()` / `handlePacket()` | loraComm.h | Pendiente | test_lora.cpp |
| 9 | `loraCheckData()` / `headerContains()` / `calculateSum()` | loraComm.h, miscelaneas.h | Pendiente | test_lora.cpp |
| 10 | `extractId()` / `isHexadecimal()` | loraComm.h, miscelaneas.h | Pendiente | test_lora.cpp |
| 11 | `getPossition()` / `setPossition()` | loraComm.h | Pendiente | test_lora.cpp |
| 12 | `processData()` / `discoverNewSensor()` | loraComm.h | Pendiente | test_lora.cpp |
| 13 | `sendConfirmation()` / `loraTxData()` | loraComm.h | Pendiente | test_lora.cpp |
| 14 | `comunicaciones()` | comunicaciones.h | Pendiente | test_comunicaciones.cpp |
| 15 | `setupGSM()` / `readIMEI()` | comunicaciones.h | Pendiente | test_comunicaciones.cpp |
| 16 | `atCmd()` / `gsmWaitFor()` / `gsmFlush()` / `gsmTimeout()` | comunicaciones.h | Pendiente | test_comunicaciones.cpp |
| 17 | `readCSQ()` / `checkRegistration()` | comunicaciones.h | Pendiente | test_comunicaciones.cpp |
| 18 | `httpRequest()` / `httpGet()` | comunicaciones.h | Pendiente | test_comunicaciones.cpp |
| 19 | `printURL()` / `printData()` | comunicaciones.h | Pendiente | test_comunicaciones.cpp |
| 20 | `applyServerResponse()` | comunicaciones.h | Pendiente | test_sensores.cpp |
| 21 | `setSensorList()` / `clearChangedSlots()` / `clearAllData()` | loraComm.h | Pendiente | test_sensores.cpp |
| 22 | `clearSentData()` | comunicaciones.h | Pendiente | test_comunicaciones.cpp |
| 23 | `checkCommErrors()` | comunicaciones.h | Pendiente | test_comunicaciones.cpp |
| 25 | 🆕 `wifiRequest()` / `espStatus()` / `wifiGet()` / `espWaitFor()` | wifi.h | Pendiente | test_wifi.cpp |
| 26 | 🆕 `printQuery()` / `applyConfig()` | comunicaciones.h | Pendiente | test_comunicaciones.cpp, test_wifi.cpp |
| 24 | `showVariables()` / `freeRam()` | comunicaciones.h, miscelaneas.h | Pendiente | — (solo depuración) |

Las fichas detalladas de cada función se agregan al revisarla.
