# Protocolo

## Radio LoRa

915 MHz · 125 kHz · SF9 · CR 4/5 · 20 dBm. Debe coincidir con los nodos.

## Trama de datos (nodo → gateway)

```
DTA-XXX-0xId,d,TTL,Val1,Val2,Vcc,CS
```

| Campo | Validación del gateway |
|---|---|
| Encabezado | Empieza con `DTA-`; la trama no contiene `0x0` |
| Tipo | `a` o `d` (solo `d` se procesa) |
| TTL | 0–5 |
| Val1 (Hr / Irms1) | −1–100 (`-1` = sensor en falla) |
| Val2 | SHT: T entre −25.0 y 75.0 °C · SCT: Irms2 entre −1 y 100 |
| Vcc | 2.0–6.0 V |
| CS | Suma ASCII de todo hasta la última coma (incluida) |

- El Id es el texto desde `0x` hasta la primera coma; se busca en la lista **completo** y sin
  distinguir mayúsculas.
- Se guarda `Val1,Val2,Vcc` en la posición del sensor.
- Longitud máxima: 55 caracteres (la más larga real, SCT con Id de 16 dígitos, mide 51); las más largas se descartan.

## Confirmación (gateway → nodo)

```
<encabezado recibido>,a,TTL,Frec,CS
```

- `Frec = modo / 2`, mínimo 1 (ver P-001).
- Se envía 500 ms después de procesar la trama (tiempo para que el nodo pase a recepción).
- Nunca durante la sesión GSM: en ese lapso el radio duerme y el nodo retransmite.
- Solo se confirman datos (`d`) de sensores de la lista. En modo descubrimiento no se confirma.

## Petición HTTP (gateway → servidor)

```
GET http://dtaamerica.com/ws/sensor_v6.php?id=<IMEI>&data=[<datos>]&rx=<ini|Ok>&si=<RSSI>&qos=<BER>&lo=[<10 banderas>]&lr=<0|1>&cn=<w|g>
```

| Parámetro | Contenido |
|---|---|
| `id` | IMEI del módem (15 dígitos) |
| `data` | 10 posiciones con la **última lectura conocida** `Val1,Val2,Vcc`, separadas por comas; posición vacía si nunca hubo lectura; `[]` si no hay ninguna |
| `rx` | `ini` en el primer envío tras arrancar, `Ok` después |
| `si`, `qos` | GSM: RSSI y BER de `AT+CSQ`. WiFi: RSSI convertido a la escala de `AT+CSQ` (`(dBm + 113) / 2`, 0–31) y `qos=99` (D-039) |
| `lo` | Antigüedad del dato por posición: `1 − k` (k = transmisiones desde el último dato nuevo). `1` nuevo, `0` mismo dato que la vez anterior, `-1`, `-2`… ciclos sin transmitir (mínimo `-99`); `0` si no hay sensor en la posición |
| `lr` | 1 si el radio LoRa inicializó, 0 si no |
| `cn` | 🆕 Canal del envío: `w` WiFi, `g` GSM (D-039) |

Ejemplo: `&lo=[0,-3,1,-2,1,0,0,0,0,0]` → sensor 1 repite el dato anterior; sensor 2 lleva 4 ciclos sin transmitir;
sensores 3 y 5 transmitieron; sensor 4 lleva 3 ciclos sin transmitir; posiciones 6–10 sin sensor.

- Si el dominio falla por DNS (GSM: código 603; WiFi: `-1`), se repite con la IP `172.102.246.22`.
- Primero por WiFi si está conectada; si no da una respuesta válida, por GSM en el mismo ciclo (D-038).
- Sin IMEI no se envía nada.

## Respuesta del servidor

```
+HTTPREAD: <n>
"<modo>"0xId1"0xId2"..."
OK
```

`sensor_v6.php` separa los campos con comillas (`"5"0xF46A2A5"0xF46A367"`). El gateway también acepta
comas como separador. El modo y la lista salen de `systems/<id>/settings` en Firebase.

Ejemplos reales y tamaños:

| Respuesta | Bytes |
|---|---|
| `"144"0x28F1D193000000A1"…"0x28F1D193000000AA"` (10 Ids de 16 dígitos) | 195 (máximo) |
| `"5"0x10B9CD49"0x10B9CE4A"0xF46A2A5"0xF46A367"0x10B9CD9C"` | 56 |
| `"0"0x10B9CD49"` | 14 |

- Se toma el texto desde la primera comilla hasta la comilla de cierre (una comilla que no va seguida de un Id).
  Lo que haya antes o después (BOM, saltos de línea, avisos de PHP) se ignora. Sin comilla de cierre la
  respuesta está incompleta y se descarta.
- La respuesta válida reemplaza el modo y la lista completa de sensores, y se guarda en EEPROM.

## Comandos AT (SIM800)

| Etapa | Comandos |
|---|---|
| Configuración (al arrancar o tras error) | `ATE0`, `AT+CFUN=1`, `AT+SAPBR=0,1`, `AT+CDNSCFG`, `AT+SAPBR=3,1,...` (CONTYPE, APN, USER, PWD), `AT+GSN`, `AT+SAPBR=2,1`, `AT+SAPBR=1,1`, `AT+SAPBR=2,1` (conexión abierta y verificada) |
| Cada ciclo | `AT+CSQ`, `AT+CREG?`, `AT+HTTPINIT`, `AT+HTTPPARA="CID",1`, `AT+HTTPPARA="URL",...`, `AT+HTTPACTION=0`, `AT+HTTPREAD=0,250`, `AT+HTTPTERM` (la conexión GPRS queda abierta). Falla de red: `AT+HTTPTERM`, configuración completa y se repite desde `AT+HTTPINIT` (D-035) |

## Enlace serie con el ESP8266 (WiFi) 🆕

SoftwareSerial a 9600 baudios en A0 (Rx) / A1 (Tx). Una línea por mensaje, terminada en `\r\n`. Solo cuentan
las líneas que empiezan con `#`; el resto (mensajes de arranque del ESP) se ignora (D-040).

| Arduino → ESP | ESP → Arduino | Uso |
|---|---|---|
| `#ST,<IMEI>` | `#ST,<estado>,<rssi>` | Estado de la WiFi. `estado`: 0 sin red configurada, 1 configurada sin conexión, 2 conectada. `rssi` en dBm (0 si no hay conexión). El IMEI se muestra en el portal. Tiempo límite: 1 s |
| `#GET,<host>,<ruta>` | `#R,<código>,<cuerpo>` | Petición `GET http://<host><ruta>` (ruta = `/ws/sensor_v6.php?id=...`). `código`: HTTP (200…), `-1` falla de conexión o DNS, `-11` tiempo agotado, `-20` sin WiFi. `cuerpo`: respuesta del servidor en una línea (saltos de línea → espacio), máximo 250 caracteres; vacío si `código ≤ 0`. Tiempo límite: 15 s |

El cuerpo se interpreta igual que la respuesta del GSM (desde la primera comilla hasta la de cierre). Por WiFi solo se acepta
el código 200; cualquier otro se trata como falla y se envía por GSM (lo que propone P-010 para el GSM).

## Punto de acceso del ESP8266 🆕

| Parámetro | Valor |
|---|---|
| Red (SSID) | `DTA-Gateway-XXXX` (XXXX: últimos 4 dígitos hex del Id del chip) |
| Clave | `dtaagricola` (`AP_PASSWORD` en el firmware del ESP) |
| Dirección | `http://192.168.4.1` (portal cautivo: el celular lo abre solo) |
| Páginas | `/` bienvenida, estado y formulario · `/guardar` (POST: ssid, clave) · `/olvidar` borra la red guardada |
