# REQ-097 - Ajustes del sistema: abrir la configuracion WiFi del Gateway Universal

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-19) - probar: usuario |
| Alcance | `index.html` (`#modalAdjust`, fila `ajusteWifiGateway`) |
| Pruebas | 417/417 en Node (4 nuevas en `wifi-gateway.test.js`) |
| Compilacion | `26.11.19.001` |

## Pedido

Desde "Ajustes del sistema", una opcion para entrar a la configuracion WiFi del gateway sin que el usuario
tenga que escribir `192.168.4.1` en el navegador.

## Contexto

El Gateway Universal (`DTA_LoRa_Gateway_Universal_v1.1`) tiene un modulo WiFi ESP8266 (firmware
`DTA_Gateway_WiFi_ESP8266`) con un punto de acceso siempre activo: red `DTA-Gateway-XXXX`, clave
`dtaagricola`, portal en `http://192.168.4.1`. El gateway envia por la WiFi local si esta configurada y por
GSM como respaldo.

## Solucion

- Fila **"WiFi del gateway"** al final de la tabla de "Ajustes del sistema", con la indicacion de conectarse
  primero a la red `DTA-Gateway-...` (clave `dtaagricola`) y el boton **"Abrir configuracion WiFi"**
  (`http://192.168.4.1/`, en otra pestana, `rel="noopener"`).
- Visible solo en equipos con gateway LoRa: **red de sensores** (`Sensor`) y **nevera** (`Nevera`), y solo
  para propietario, desarrollador o administrador (los mismos que pueden editar los ajustes).
- No depende del modo de edicion ni guarda nada en la base de datos.

## Limitaciones

- La web no puede cambiar la red WiFi del celular: el usuario debe conectarse a mano a `DTA-Gateway-...`
  antes de pulsar el boton (o la pagina no carga). Al conectarse, el celular suele abrir el portal solo.
- Con el celular en la red del gateway no hay internet: la PWA sigue abierta (service worker), pero sin datos
  nuevos hasta volver a la red normal.
- La app no conoce los 4 digitos `XXXX` de cada gateway (dependen del chip); se muestra `DTA-Gateway-...`.
