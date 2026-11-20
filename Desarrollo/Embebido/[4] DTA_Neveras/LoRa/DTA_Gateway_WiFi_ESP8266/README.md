# Módulo WiFi del Gateway — DTA_Gateway_WiFi_ESP8266

Firmware del ESP8266 (ESP-12) que le da WiFi al Gateway Universal DTA-Agrícola
([`DTA_LoRa_Gateway_Universal_v1.1`](../DTA_LoRa_Gateway_Universal_v1.1/README.md)). Funciona en dos modos a la vez:

1. **Punto de acceso siempre activo, con clave**: página de bienvenida y configuración de la WiFi local.
2. **Puente HTTP del Arduino**: el Arduino le pasa la petición por serie y el ESP la hace por la WiFi local.
   Si la WiFi no está configurada o no funciona, el Arduino envía por GSM (respaldo).

> Este README se actualiza con cada cambio. 🆕 = funcionalidad nueva.

**Versión actual: `v1.261120001`**

## Historial de versiones

### v1.261120001 — 2026-11-20
- Corrige: si la red guardada deja de estar disponible (cambio de router o de red), el ESP la buscaba sin parar
  saltando de canal en canal y **el punto de acceso desaparecía**: no se podía entrar al portal para cambiar la red.
- 🆕 **Reconexión controlada**: cada intento dura como máximo 30 s; si falla, la estación descansa 5 min con el
  punto de acceso estable y solo reintenta si nadie está conectado al portal. Si alguien entra al portal durante un
  intento automático, el intento se corta. Un intento pedido desde el portal ("Guardar y conectar") no se corta.
- 🆕 Si la red guardada se cae, se reintenta enseguida (un intento) y luego cada 5 min.
- El estado muestra el motivo y cuándo es el siguiente intento (p. ej. "no se encuentra la red · nuevo intento en 4 min").

### v1.261119002 — 2026-11-19
- 🆕 El estado muestra **por qué no se conecta** la WiFi: clave incorrecta, no se encuentra la red, falló la conexión o conectando.
- Corrige: al abrir o recargar el portal se buscaban redes (~2 s) y eso **interrumpía el intento de conexión** en curso, que podía no terminar nunca. Ahora no se busca durante los 30 s siguientes a guardar la red o a encender el módulo; la lista muestra la red guardada como "conectando…".

### v1.261119001 — 2026-11-19
- 🆕 Primera versión: punto de acceso `DTA-Gateway-XXXX` (clave `dtaagricola`) con portal cautivo de
  bienvenida, estado, lista de redes, red oculta, mostrar clave y opción para olvidar la red.
- 🆕 Puente HTTP con el Arduino por serie a 9600 baudios (`#ST`, `#GET` → `#R`). Decisiones D-036 a D-040
  del gateway.
- La red y la clave quedan guardadas en la flash del ESP y se reconecta sola tras un corte de energía.

## Configurar la WiFi del gateway (cliente)

1. En el celular, conéctate a la red **`DTA-Gateway-XXXX`** con la clave **`dtaagricola`**.
2. La página se abre sola (portal cautivo). Si no, abre **http://192.168.4.1** en el navegador.
3. Elige la red de la finca (o escribe su nombre si está oculta), escribe la clave y pulsa **Guardar y conectar**.
4. En unos segundos la página muestra **WiFi local: Conectada**. Desde el siguiente envío, el gateway usa la WiFi.

Al conectarse a la red local, el punto de acceso pasa al canal de esa red y el celular puede desconectarse un
momento: basta con volver a conectarse a `DTA-Gateway-XXXX`.

**Cambiar de red:** conéctate a `DTA-Gateway-XXXX`, entra al portal, elige la red nueva y pulsa **Guardar y
conectar**. Si la red guardada ya no existe, el punto de acceso puede tardar hasta 30 s en estabilizarse
después de encender el gateway (el primer intento de conexión).

Con el gateway conectado a la red local, el portal también responde en su IP de esa red (la que aparece en
**Estado → Dirección IP**), desde cualquier equipo conectado al mismo router.

## Programar el ESP

| Opción del IDE | Valor |
|---|---|
| Placa | **Generic ESP8266 Module** (paquete *esp8266 by ESP8266 Community*) |
| Flash Size | **4MB (FS:2MB OTA:~1019KB)** |
| Flash Mode | DOUT o DIO |
| Upload Speed | 115200 |
| Reset Method | no dtr (aka ck) |

Se programa con el adaptador USB-UART (desconectado del Arduino): GPIO0 a GND, reset, subir, soltar GPIO0 y reset.

Para cambiar la clave del punto de acceso: `AP_PASSWORD` (mínimo 8 caracteres).

## Conexión con el gateway (ESP-12)

| ESP-12 | Conexión |
|---|---|
| VCC | 3.3 V de un regulador propio (picos de ~300 mA) + capacitor de 100 µF |
| GND | GND común con el Arduino |
| EN, RST | 3.3 V con 10 kΩ |
| GPIO15 | GND (10 kΩ o directo) — siempre |
| GPIO0, GPIO2 | 3.3 V con 10 kΩ (o sueltos) |
| TX | **A0** del Arduino, directo |
| RX | **A1** del Arduino a través de un divisor: A1 → 1 kΩ → RX → 2 kΩ → GND (si el Arduino es de 5 V) |

## Protocolo con el Arduino

Serie a 9600 baudios, una línea por mensaje. Detalle en
[`spec/protocolo.md`](../DTA_LoRa_Gateway_Universal_v1.1/spec/protocolo.md) del gateway.

| Arduino → ESP | ESP → Arduino |
|---|---|
| `#ST,<IMEI>` | `#ST,<estado>,<rssi>` (0 sin configurar, 1 sin conexión, 2 conectada) |
| `#GET,<host>,<ruta>` | `#R,<código>,<cuerpo>` (cuerpo en una línea, máx. 250 caracteres) |

Códigos negativos: `-1` sin conexión con el servidor o falla de DNS (el Arduino repite con la IP),
`-11` tiempo agotado, `-20` sin WiFi.

## Pendiente

- Validar en placa (P-015 del gateway): alimentación, enlace serie A0/A1 y duración de la sesión WiFi.
- Este firmware no tiene pruebas automáticas en la PC; el lado del Arduino sí (`test/test_wifi.cpp` del gateway,
  con un ESP simulado que sigue este protocolo).
