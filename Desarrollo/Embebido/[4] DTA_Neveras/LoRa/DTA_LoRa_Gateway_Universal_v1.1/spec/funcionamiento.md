# Funcionamiento

## Ciclo de trabajo

- `loop()`: atiende el radio, procesa la cola LoRa y, cada `modo` minutos
  (30 s en descubrimiento), ejecuta `comunicaciones()`.
- Al arrancar: carga la configuración de EEPROM, inicializa LoRa (5 intentos) y hace el primer envío
  (configura el GSM para leer el IMEI y luego intenta por WiFi).
- Si LoRa no inicializó, se reintenta en cada envío.

## Cola LoRa y sesión de envío

- Fuera de la sesión de envío, todas las esperas leen el radio (`loraPoll`) y los paquetes se guardan en una cola de 2
  (la ventana mientras se envía una confirmación); si está llena se cuentan como perdidos (`rxDropped`).
- **Durante la sesión de envío (WiFi o GSM) el radio duerme**: no se recibe ni se transmite LoRa (D-027). La sesión dura pocos
  segundos y el nodo retransmite si no recibe confirmación.

## Lista de sensores

- Hasta 10 sensores (`MAX_SENSORS`); Id de hasta 18 caracteres.
- Cada respuesta válida del servidor reemplaza la lista completa. Antes, se borran las lecturas de las
  posiciones cuyo Id cambia o desaparece (una lectura pendiente no se atribuye a otro sensor).
- Al salir del modo descubrimiento (modo 0 → otro) se borran todas las lecturas.
- Modo descubrimiento: los Id hexadecimales desconocidos se agregan a la lista (sin confirmar ni informar al servidor).

## Envío de datos

### Canal: WiFi primero, GSM de respaldo (D-038) 🆕

1. Si aún no hay IMEI, se configura el GSM (lee el IMEI y abre la conexión GPRS).
2. Se consulta al ESP (`#ST`). Si la WiFi está conectada, se envía por WiFi (`#GET`); si el dominio falla
   (`-1`) se repite con la IP.
3. Si la WiFi no está configurada o conectada, el ESP no responde, o la petición no trae una configuración
   válida, se envía por GSM en el mismo ciclo (como hasta ahora).
4. Mientras la WiFi funcione, el GSM no se vuelve a usar.

`commError` cuenta los ciclos sin respuesta válida **por ningún canal**.


- `data=` lleva la última lectura conocida de cada sensor (histórico); `lo=[...]` indica su antigüedad: `1 − k` (D-032).
- k aumenta en cada envío confirmado por el servidor; si el envío falla, no avanza.
- Al reemplazar un sensor en la lista se borra el histórico de esa posición.

## Errores, reconexión y reinicio

- La conexión GPRS se abre una vez al configurar el GSM y queda abierta entre envíos, como en la v1 (D-035). La apertura se confirma con `AT+SAPBR=2,1` (y `AT+CGATT=1` si hace falta). Ante una falla de red (-1, -2, 6xx) se reconfigura el GSM completo en el mismo ciclo y se reintenta; si sigue fallando, el siguiente intento es en 1 min (D-034).
- `AT+HTTPINIT` con error: `AT+HTTPTERM` y se reintenta.
- `commError` suma 1 por cada ciclo sin respuesta válida del servidor y vuelve a 0 con uno correcto.
- Con `commError ≥ 2`: configuración completa del GSM en el siguiente ciclo (incluye cerrar y reabrir la conexión).
- Con `commError ≥ 5`: reinicio por software (D-036).
- Toda espera tiene tiempo límite (5 s, o 10 s con señal débil; 20 s `SAPBR=1,1`; 30 s `HTTPACTION`) y termina
  antes si llega la respuesta o tras 200 ms sin datos (D-022).

## Pines

| Pin | Uso |
|---|---|
| A0 | 🆕 Rx del Arduino ← Tx del ESP8266 (SoftwareSerial 9600) |
| A1 | 🆕 Tx del Arduino → divisor 1k/2k → Rx del ESP8266 |
| D3 / D4 | Módem GSM (Tx / Rx, SoftwareSerial) |
| D10–D13, D2, D9 | Radio LoRa (SPI, DIO0, RST) |

## Sin LED ni watchdog externo (D-036)

A0 y A1 pasan al ESP8266: se eliminaron el LED de estado y el watchdog externo. El estado se ve en el
monitor serie y en el portal del ESP.

## EEPROM

| Dirección | Contenido |
|---|---|
| 0 | Marca `0xA7` |
| 1–83 | `Config`: `mode` (int16), `count` (uint8), `ids[10]` (uint64) |
| 84 | CRC-8 (polinomio 0x07) de `Config` |

Solo se escriben los bytes que cambian.

## Memoria RAM

| Buffer | Bytes | Dónde |
|---|---|---|
| Respuesta del módem o del ESP | 300 | Pila, solo durante `comunicaciones()` |
| Cola LoRa (2 × 56) | 112 | Global |
| Lecturas (10 × 16) | 160 | Global |
| Configuración (modo + 10 Ids de 64 bits) | 83 | Global (y EEPROM) |

Sin `String`: no se usa el heap. Estimado de variables globales ≈ 790 B (39 %).
Aviso `⚠ MEMORIA BAJA` si la mínima libre baja de 150 B (`RAM_WARNING`).
En el monitor: `Memoria disponible: X (mínima desde el arranque: Y)`; Y es el margen real.

## Parámetros (`configuracion.h`)

| Constante | Valor | Descripción |
|---|---|---|
| `FREQUENCY` | 915E6 | Frecuencia LoRa |
| `TTL` | 5 | Campo TTL de la confirmación |
| `LORA_INIT_RETRIES` | 5 | Intentos de inicializar LoRa |
| `DEFAULT_MODE` | 5 | Minutos entre envíos sin configuración guardada |
| `MAX_SENSORS` | 10 | Sensores por gateway |
| `DATA_LEN` / `PKT_LEN` | 16 / 56 | Tamaños de buffer |
| `RXQ_SIZE` | 2 | Paquetes en cola |
| `RESP_SIZE` | 300 | Respuesta del módem (local) |
| `GSM_FULL_SETUP_AFTER` | 2 | Fallas seguidas antes de reconfigurar el GSM |
| `RAM_WARNING` | 150 | Aviso de memoria baja (B) |
| `TEST_SYSTEM` / `TEST_COMM` | false | Modo prueba / mostrar respuestas AT |
| `ESP_BAUD` | 9600 | 🆕 Velocidad del enlace con el ESP8266 |
| `ESP_STATUS_MS` / `ESP_HTTP_MS` | 1000 / 15000 | 🆕 Tiempo límite de `#ST` y `#GET` |
