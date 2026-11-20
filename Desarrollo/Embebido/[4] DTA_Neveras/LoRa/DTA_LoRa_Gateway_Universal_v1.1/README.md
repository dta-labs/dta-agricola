# Gateway LoRa Universal — v1.1

Gateway LoRa (RFM95) con módem GSM SIM800 y módulo WiFi ESP8266 sobre ATmega328. Recibe las lecturas de los nodos
(`DTA_LoRa_SHT`, `DTA_LoRa_SCT`) y las envía por HTTP a `dtaamerica.com/ws/sensor_v6.php`, por WiFi si está
configurada y por GSM como respaldo.

- Firmware del módulo WiFi: [`../DTA_Gateway_WiFi_ESP8266`](../DTA_Gateway_WiFi_ESP8266/README.md)

- Sketch: `DTA_LoRa_Gateway_Universal_v1.1.ino`
- Especificaciones: [`spec/`](spec/README.md)
- Batería de pruebas: [`test/`](test/README.md)

> Este README se actualiza con cada cambio del proyecto. 🆕 = funcionalidad nueva.
> Versión: `v1.aammdd` + consecutivo del día (`FW_VERSION` en `configuracion.h`; se muestra al arrancar).

**Versión actual: `v1.261119002`** · Pruebas: 126

## Historial de versiones

### v1.261119002 — 2026-11-19
- 🆕 **Nuevo nombre: `DTA_LoRa_Gateway_Universal_v1.1`** (antes `DTA_LoRa_Gateway_GSM_v1.1`): con WiFi y GSM ya no es solo un gateway GSM. Se renombraron la carpeta y el sketch (`DTA_LoRa_Gateway_Universal_v1.1.ino`) y se actualizaron las referencias (pruebas, especificaciones y el README del módulo WiFi). Sin cambios de funcionamiento.

### v1.261119001 — 2026-11-19
- 🆕 **WiFi con el ESP8266 en A0/A1** (D-036, D-037): SoftwareSerial a 9600 (A0 = Rx ← TX del ESP; A1 = Tx → divisor 1k/2k → RX del ESP). El ESP lleva su propio firmware ([`DTA_Gateway_WiFi_ESP8266`](../DTA_Gateway_WiFi_ESP8266/README.md)): punto de acceso `DTA-Gateway-XXXX` siempre activo con clave, portal de bienvenida para configurar la WiFi local y puente HTTP.
- 🆕 **WiFi primero, GSM de respaldo en el mismo ciclo** (D-038): si la WiFi no está configurada, no está conectada, el ESP no responde (espera máxima 1 s) o la petición falla, el envío se hace por GSM como siempre. Mientras la WiFi funcione, el GSM no se reconfigura ni se consulta.
- 🆕 El GSM se configura siempre al arrancar para leer el **IMEI**, que sigue siendo el Id del gateway aunque se envíe por WiFi.
- 🆕 Nuevo parámetro **`&cn=w|g`** (canal del envío). Por WiFi, `si` es el RSSI en la escala de `AT+CSQ` y `qos=99` (D-039).
- 🆕 Por WiFi solo se acepta el código 200; una falla de DNS (`-1`) se repite con la IP (D-040).
- Se **eliminan el LED de estado y el watchdog externo** (el código `[WD]` y sus pruebas): A0 y A1 quedan para el ESP. Con `commError ≥ 5` el reinicio sigue siendo por software.
- El monitor serie muestra el canal usado (`Enlace: WiFi (-60 dBm)` / `Enlace: GSM (señal 17)`) y por qué no se usó la WiFi.
- Pruebas: `test_wifi.cpp` con un ESP8266 simulado; se quitan las del LED. ⚠ Pendiente validar en placa (P-015) y que el servidor lea `cn=` si se quiere guardar (P-014).

### v1.261118003 — 2026-11-18
- 🆕 **La conexión GPRS queda abierta entre envíos, como en la v1** (D-035): se abre una sola vez al configurar el GSM y ya no se cierra al final de cada envío (se revierte esa parte de v1.261118001).
- 🆕 **Ante una falla de red** (`-1`, `-2` o `6xx`) se hace lo que hace la v1 (reconfiguración completa: cierra y reabre la conexión), pero **en el mismo ciclo** y se reintenta la petición enseguida, en vez de esperar al siguiente ciclo.
- La apertura de la conexión se sigue verificando (`AT+SAPBR=2,1`, y `AT+CGATT=1` si hace falta); si no abre, el siguiente intento es en 1 min y vuelve a reconfigurar.
- Un error de formato de la respuesta del servidor (no de red) no reconfigura el GSM (igual que antes: solo tras 2 seguidos).

### v1.261118002 — 2026-11-18
- 🆕 **Se verifica que la conexión GPRS quedó abierta** (`AT+SAPBR=2,1` después de `AT+SAPBR=1,1`) antes de pedir la URL (D-034). Si no abrió, se revisa el enganche (`AT+CGATT?` → `AT+CGATT=1`) y se reintenta una vez.
- 🆕 Sin conexión GPRS ya **no se envía la petición**: nuevo código `HTTP: -3 (sin conexión GPRS)`. Antes se esperaban 2 × 30 s a un `HTTPACTION` que no podía responder.
- 🆕 **Diagnóstico siempre activo**: si `AT+SAPBR=1,1` falla se imprime la respuesta del módem, aun con `TEST_COMM false`.
- 🆕 **Tras un envío fallido, el siguiente intento es en 1 min** (no en el periodo completo del modo). Con éxito se respeta el modo.

### v1.261118001 — 2026-11-18
- 🆕 **Conexión GPRS por envío** (D-033): se abre al inicio de cada envío (`AT+SAPBR=1,1`) y se cierra al terminar (`AT+SAPBR=0,1`). Ya no se mantiene abierta durante los 5 min de espera, cuando el operador puede darla de baja sin que el SIM800 se entere.
- 🆕 **Reintento inmediato**: si la petición falla (URL rechazada, `HTTPACTION` sin resultado o error de red 6xx), se reintenta en el mismo ciclo con una conexión nueva (`HTTPTERM`, `SAPBR=0,1`, `SAPBR=1,1`, `HTTPINIT`).
- Corrige el caso del log 2026-11-18 01:20: `HTTP: -2` 5 min después de un envío correcto, que dejaba al GW **15 min sin comunicación** (falla → 5 min → falla → 5 min → reconfiguración).
- La configuración del GSM ya no abre la conexión (solo la cierra y define el APN).

### v1.261117012 — 2026-11-17
- 🆕 `&lo=[...]` ahora indica la **antigüedad del dato** de cada sensor: `lo = 1 − k`, con k = transmisiones confirmadas desde su último dato nuevo (D-032):
  - `1`: dato nuevo · `0`: mismo dato que la vez anterior · `-1`, `-2`, …: ciclos sin transmitir (mínimo `-99`).
  - `0` también si la posición no tiene sensor asociado.
  - Ejemplo: `&lo=[0,-3,1,-2,1,0,0,0,0,0]` → sensor 1 repite su dato, sensor 2 lleva 4 ciclos sin transmitir, 3 y 5 transmitieron, 4 lleva 3 ciclos sin transmitir, 6–10 sin sensor.
  - Un sensor registrado que nunca transmitió (o recién reemplazado) empieza en 0 y decrece desde ahí.
  - Si el envío falla, el contador no avanza (el servidor no recibió esa transmisión).

### v1.261117011 — 2026-11-17
- 🆕 `&lo=[0,0,1,0,1,0,0,0,0,0]`: una bandera por sensor, **1 = lectura nueva**, **0 = histórica** (o sin lectura). `data=` lleva siempre la **última lectura conocida** de cada sensor; antes, las ya enviadas se borraban y llegaban vacías. Una lectura nueva se marca con 1 hasta que el servidor confirma el envío. (D-031)
- El estado del radio LoRa pasa de `&lo=` a **`&lr=1/0`**.
- Al reemplazar un sensor en la lista, se borra el histórico de esa posición.
- ⚠ Requiere actualizar `updateNeveraDB.php` para usar `lo` (si no, guardará los valores históricos como lecturas nuevas).

### v1.261117010 — 2026-11-17
- Los mensajes espontáneos del SIM800 se descartaban sin mostrarlos. Ahora se revisan antes de cada comando y en cada respuesta (D-030):
  - `RDY` / `Call Ready` / `NORMAL POWER DOWN` → `⚠ Módem reiniciado` y se reconfigura el GSM en ese mismo ciclo (el reinicio borra `ATE0` y la conexión).
  - `UNDER-VOLTAGE` → `⚠ Bajo voltaje en el módem`.
  - `+SAPBR 1: DEACT` → `⚠ La red cerró la conexión GPRS` (se reabre en el ciclo).
  - Con `TEST_COMM true` se muestran como `[espontáneo] ...`.
- La reconfiguración pedida por un evento ya no se pierde al terminar el ciclo.

### v1.261117009 — 2026-11-17
- 🆕 El monitor indica en qué paso falló la petición HTTP: `HTTP: -1 (URL rechazada por el módem)`, `HTTP: -2 (sin resultado de HTTPACTION en 30 s)` o `HTTP: 6xx (error de red)`. Antes todo aparecía como `HTTP: -1`. (D-029)
- Prueba en placa con v1.261117008: memoria mínima libre desde el arranque 727 B; configuración del servidor recibida y 5 sensores confirmados; el segundo envío falló (`HTTP: -1`) y quedó por diagnosticar.

### v1.261117008 — 2026-11-17
- **Desconexiones del GSM:** cualquier `ERROR` (incluso uno inofensivo como `HTTPINIT` con el servicio ya abierto) hacía que el siguiente ciclo cerrara la conexión GPRS (`AT+SAPBR=0,1`) y la reconfigurara completa. Ahora (D-028):
  - En cada ciclo se consulta la conexión (`AT+SAPBR=2,1`) y, si se cayó, solo se reabre (`AT+SAPBR=1,1`).
  - Si `AT+HTTPINIT` falla, se envía `AT+HTTPTERM` y se reintenta.
  - La configuración completa solo se repite tras **2 fallas seguidas**; una falla aislada no toca la conexión.
- **Sin LoRa durante la sesión GSM:** el radio duerme mientras se comunica con el servidor (sin recepción ni transmisión), pensando en la versión con batería y paneles solares. Los paquetes que lleguen en esos segundos no se rescatan: el nodo retransmite al no recibir confirmación. Cola reducida a 2 paquetes. (D-027)
- Respuesta del módem: **300 B reservados** (locales) y `AT+HTTPREAD=0,250`. (D-027)
- 🆕 Aviso `⚠ MEMORIA BAJA` si la memoria mínima libre desde el arranque baja de 150 B.
- `formatId()` arma el Id directamente, sin buffer intermedio.

### v1.261117007 — 2026-11-17
- Buffer de respuesta del módem calculado con tramas reales del servidor: la más larga (modo de 3 dígitos y 10 Ids de 16 dígitos) mide 195 B y, con eco del módem, la respuesta completa llega a 239 B; no cabía en 224 B. Ahora 256 B (sigue siendo local: no usa memoria global) y `AT+HTTPREAD=0,220`. (D-026)
- 🆕 Pruebas con las 3 tramas reales (modo 144 con 10 Ids largos, modo 5 con 5 Ids, modo 0 con 1 Id), con eco, BOM y avisos de PHP.

### v1.261117006 — 2026-11-17
- Menos memoria global (estimado: de 1381 B / 67 % a ~850 B / 41 %), sin volver a usar `String` en el heap (D-025):
  - Respuesta del módem: buffer **local** de `comunicaciones()` (224 B en la pila solo mientras se comunica; antes 256 B globales).
  - Cola LoRa: 3 × 56 B (antes 4 × 64 B). Lecturas: 10 × 16 B (antes 10 × 20 B). Tamaños ajustados a la trama más larga real (SCT con Id de 16 dígitos).
  - Ids de sensores como números de 64 bits: 80 B (antes 190 B de texto). La EEPROM cambia de formato (marca `0xA7`): al actualizar, el gateway descarga la configuración del servidor en el primer envío.
  - Dominio, IP y textos de validación en flash.
  - `AT+HTTPREAD=0,200`: nunca excede el buffer (resuelve P-007).
- 🆕 Memoria mínima libre desde el arranque en el monitor serie (`Memoria disponible: X (mínima desde el arranque: Y)`), medida real del margen de RAM.

### v1.261117005 — 2026-11-17
- Watchdog externo (A0) **comentado**, como en la v1: A0 no se usa y queda en alta impedancia. Con `commError ≥ 5` el reinicio es solo por software. El código y sus pruebas quedan marcados con `[WD]`; para reactivarlo se quita `// [WD] ` de esas líneas (verificado: con el código descomentado pasan las 76 pruebas). (D-024)
- Pines: **A0 = watchdog externo**, **A1 = LED de estado**.

### v1.261117004 — 2026-11-17
- Las esperas del módem quedaban fijas en el tiempo límite (5–10 s) cuando la respuesta no traía `OK`. Ahora, como en la v1, terminan tras 200 ms sin datos una vez recibida una línea de resultado (el eco del comando no cuenta). `AT+HTTPACTION` sigue esperando su resultado, que llega segundos después de su `OK`. (D-022)
- 🆕 Con `TEST_COMM true` se muestra cuánto tardó cada respuesta del módem.
- 🆕 Número de versión `FW_VERSION` (`v1.aammdd` + consecutivo), mostrado al arrancar.

### v1.261117003 — 2026-11-17
- El gateway rechazaba la respuesta del servidor si traía cualquier byte extra (BOM, salto de línea, aviso de PHP) y se quedaba en el modo 0 guardado en EEPROM (descubrimiento, sin confirmar a los sensores). Ahora toma solo la configuración entre comillas. (D-021)
- 🆕 Se muestra la configuración recibida (`Configuración recibida: modo 5, sensores 5`) o el texto rechazado.

### v1.261117002 — 2026-11-17
- En modo descubrimiento o con un sensor fuera de la lista no se mostraba nada en el monitor serie: ahora se muestra toda trama válida recibida, indicando el caso. (D-019)
- 🆕 Se muestra el código HTTP de cada envío (`HTTP: 200`). (D-020)

### v1.261117001 — 2026-11-17
- Sin watchdog interno: el bootloader del Pro Mini queda reiniciándose sin parar tras un reinicio por watchdog. (D-017)
- 🆕 Watchdog externo por pulsos en A0: alta impedancia entre pulsos, pulso HIGH de 50 ms cada 1 s sin bloquear (`EXT_WD_FEED`). Con `commError ≥ 5` se dejan de enviar pulsos para que reinicie; si no actúa, reinicio por software. (D-018)

### v1.261116001 — 2026-11-16 · Cambios v1 → v1.1

#### Problemas resueltos
- `while(10)` colgaba el gateway si LoRa no arrancaba.
- Se perdían paquetes LoRa durante `comunicaciones()` y durante el parpadeo del LED, que bloqueaba 1 s.
- El LED bloqueaba el `loop` y no reflejaba el estado real.
- Datos viejos: se reenviaba la última lectura indefinidamente.
- Validación SCT: se revisaba `val1` dos veces y nunca `val2`.
- `isHexadecimal` rechazaba IDs en minúsculas.
- `getPossition` encontraba coincidencias parciales (`0xF46A2` dentro de `0xF46A2A5`).
- `setPossition` no tenía límite de 10 sensores.
- Fragmentación de memoria por `String` en la URL, las respuestas AT y las listas.
- Desbordamiento de `millis()` a los ~49 días.
- ID del gateway frágil (ICCID recortado).
- El reinicio por `commError == 5` se podía saltar; `while(1)` sin respaldo.
- `memoria.h` no compilaba y no se usaba.
- Código comentado y funciones sin uso; `AT+CSQ` se enviaba dos veces.
- La lista de sensores del servidor viene separada por comillas (`"5"0xA"0xB"`): la v1.1 inicial suponía comas y la vaciaba. Ahora acepta comillas, comas y espacios.
- Al recibir una lista de sensores distinta del servidor, una lectura pendiente podía atribuirse al sensor que ahora ocupa esa posición: se borran las lecturas de las posiciones cuyo ID cambió.

#### Nuevo
- 🆕 Cola de paquetes LoRa (ver v1.261117008: 2 paquetes, sin LoRa durante el GSM).
- 🆕 Estado de LoRa reportado al servidor (`&lo=1/0`) con 5 intentos de arranque.
- 🆕 LED con 4 estados:
  | LED | Significado |
  |---|---|
  | Fijo | Red celular y servidor OK |
  | Parpadeo rápido (200 ms) | Hay red, pero falló el envío al servidor |
  | Parpadeo lento (1 s) | Sin registro en la red celular |
  | Destello corto cada 2 s | El radio LoRa no inicializó (tiene prioridad) |
- 🆕 Registro en la red verificado con `AT+CREG?`.
- 🆕 Configuración (modo y lista de sensores) guardada en EEPROM: arranca sin esperar al servidor. Cada respuesta válida del servidor reemplaza la lista completa (así se propaga el cambio de un sensor).
- 🆕 ID del gateway = IMEI.
- 🆕 Solo se borran las lecturas confirmadas; las que llegan durante el envío se conservan (desde v1.261117011 se conservan como histórico, ver `lo=`).
- 🆕 `ATE0` (sin eco) y respuestas AT en un buffer fijo de 256 B.

#### Pruebas y documentación
- 🆕 Carpeta `spec/` con protocolo (LoRa, HTTP, AT), funcionamiento, funciones y decisiones.
- 🆕 Batería de pruebas `test/` en la PC, con módem SIM800 simulado (con retardos de respuesta), radio LoRa, EEPROM y LED.

## Compatibilidad
- **Con nodos v1 y v1.1:** compatible por radio (misma trama y misma confirmación).
- **Con el servidor:** requiere ajustes (ver pendientes).

## Pendientes antes de llevarlo a campo
- **P-010:** tratar los códigos HTTP distintos de 200 como falla del servidor (incidente del 2026-11-15/16 resuelto en el servidor: `/ws/` debe aceptar HTTP).
- **Servidor:** dar de alta cada gateway v1.1 con su IMEI en Firebase (`systems/<IMEI>/`); se muestra en el monitor serie al arrancar. Si se actualiza un gateway existente, su Id cambia.
- **Servidor:** actualizar `updateNeveraDB.php` para leer `lo=[...]` (guardar solo las lecturas con `lo=1`; `lo<0` indica cuántos ciclos lleva un sensor sin transmitir) y `lr=`.
- **P-013 (longitud de URL):** con 10 sensores y `lo` en `-99`, la URL llega a ~295 caracteres; probar en placa que el SIM800 la acepta.
- **P-001:** el gateway envía `frec = modo / 2` a los nodos; con modo 5 los nodos v1.1 despertarían cada 2 min.
- **Lista vacía:** decidir si el gateway ignora una lista vacía del servidor cuando el modo no es 0, o si el servidor puede vaciarla.
- **P-005 (repetidores):** cuando existan repetidores, la confirmación de extremo a extremo puede tardar más que la espera del nodo (ver el README del nodo).
- **P-012 (watchdog externo, comentado):** antes de reactivarlo, confirmar su tiempo (> ~1.5 s) y probar en placa que no reinicia en operación normal y sí al dejar de enviar pulsos.
