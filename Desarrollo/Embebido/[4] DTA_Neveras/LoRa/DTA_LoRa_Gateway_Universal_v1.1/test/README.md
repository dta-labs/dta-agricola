# Batería de pruebas — Gateway DTA_LoRa_Gateway_Universal v1.1

Pruebas unitarias que corren en la PC (no en el Arduino). El sketch se compila completo con
g++ y el hardware se reemplaza por simulaciones (`mocks/`): radio LoRa, módem SIM800
y módulo WiFi ESP8266 (SoftwareSerial), EEPROM y puerto serie.

## Cómo correrlas

**Windows** (requiere g++, por ejemplo de [MSYS2](https://www.msys2.org/) o [WinLibs](https://winlibs.com/)):

```
cd test
run_tests.bat
```

**Linux / macOS / WSL:** `./run_tests.sh`

Para correr solo algunas pruebas, pasa parte del nombre: `run_tests.bat lista_` o `./run_tests.sh wifi_`.

## Estructura

| Ruta | Contenido |
|---|---|
| `test_main.cpp` | Punto de entrada. **Contiene la ruta del sketch**: actualizarla si se renombra la carpeta o el `.ino` |
| `test_lora.cpp` | Inicialización de LoRa, validación de tramas, cola, confirmaciones, descubrimiento |
| `test_sensores.cpp` | Lista de sensores: carga, reemplazo desde el servidor, posiciones que cambian |
| `test_comunicaciones.cpp` | Ciclo GSM/HTTP completo: URL, IMEI, DNS, datos enviados y pendientes, errores y reinicio |
| `test_memoria.cpp` | EEPROM: guardado, CRC, arranque con configuración guardada |
| `test_wifi.cpp` | Envío por WiFi con el ESP8266, respaldo por GSM, protocolo `#ST`/`#GET` |
| `helpers.h` | `resetGateway()`, `readyGateway()`, `nodeFrame()`, `expectedAck()`, `receive()`, `applyBody()` |
| `framework/minitest.h` | Mini framework de pruebas (`TEST_CASE`, `CHECK`, `CHECK_EQ`, `CHECK_NEAR`) |
| `mocks/` | Simulaciones de Arduino y librerías |

## Módem simulado (`gprs`)

Responde como un SIM800 sin problemas, con retardo (50 ms por comando, 1.5 s para
`+HTTPACTION`), así el gateway sigue escuchando LoRa mientras espera, como en la realidad.

| Campo | Efecto |
|---|---|
| `rssi`, `ber`, `creg` | Respuestas de `AT+CSQ` y `AT+CREG?` |
| `imei` | Respuesta de `AT+GSN` |
| `dnsFails` | El dominio responde 603 (falla de DNS) |
| `httpStatus`, `body`, `lengthOverride` | Respuesta del servidor |
| `silent` | El módem no responde |
| `onCommand` | Gancho para actuar en un comando (por ejemplo, hacer llegar un paquete LoRa) |
| `commands`, `urls` | Lo que envió el gateway |

## ESP8266 simulado (`espSerial`)

La instancia de SoftwareSerial creada con Rx en A0 responde como el firmware `DTA_Gateway_WiFi_ESP8266`.
Como en la librería real, solo la instancia que escucha (`listen()`) recibe datos.

| Campo | Efecto |
|---|---|
| `wifiState` | 0 sin red configurada, 1 configurada sin conexión, 2 conectada |
| `wifiRssi` | RSSI en dBm de `#ST` |
| `httpStatus`, `body`, `dnsFails`, `silent` | Respuesta de `#GET` (igual que en el módem) |
| `urls`, `stImei` | Líneas `#GET` enviadas e IMEI recibido en `#ST` |

El reinicio del MCU (`resetSoftware`) se reemplaza por una excepción `ResetCalled`.

## Flujo de trabajo (TDD)

1. Escribir o ajustar la especificación en `../spec/`.
2. Escribir la prueba y comprobar que **falla**.
3. Cambiar el sketch hasta que pase.
4. Correr toda la batería.

## Mantenimiento

- Si se agrega una variable global al sketch, agregarla en `resetGateway()` (`helpers.h`).
- Si el sketch usa una función nueva de Arduino o de una librería, agregarla en `mocks/`.

## Limitaciones

- En la PC `int` es de 32 bits y `long` de 64; en el ATmega328 son de 16 y 32. El desbordamiento
  de `millis()` y otros desbordamientos de enteros no se reproducen.
- No se prueban tiempos reales, el módem físico, la red celular ni el firmware del ESP8266 (solo su protocolo simulado).
- Pruebas en placa (watchdog): ver [`hardware/`](hardware/README.md).
