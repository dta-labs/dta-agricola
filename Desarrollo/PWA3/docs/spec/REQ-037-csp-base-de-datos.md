# REQ-037 - No aparecian los equipos: la CSP bloqueaba la conexion a la base de datos

| Campo | Valor |
|---|---|
| Estado | **Implementado** (probar: usuario) |
| Alcance | `index.html` (meta `Content-Security-Policy`) |
| Pruebas | 163/163 en Node (2 nuevas en `csp-base-de-datos.test.js`) |
| Riesgo | Bajo: amplia la CSP solo a dominios de Realtime Database |

## 1. Sintoma (2026-11-05)

Tras entrar, el listado quedaba vacio. En consola: varios "Loading the script violates the following
Content Security Policy directive: script-src ..." y trazas de `BrowserPollConnection` reintentando.

## 2. Causa

Realtime Database tiene dos transportes: WebSocket y, como respaldo, long polling. Si el navegador
tiene registrado un fallo previo de WebSocket (`firebase:previous_websocket_failure` en
localStorage), empieza por long polling, que inserta `<script src="https://<db>.firebaseio.com/.lp?...">`.
`script-src` no incluia `*.firebaseio.com`: cada intento se bloqueaba, la conexion no se establecia
nunca y no llegaban datos.

## 3. Cambio

- `script-src`: `https://*.firebaseio.com https://*.firebasedatabase.app`.
- `connect-src`: `https://*.firebasedatabase.app wss://*.firebasedatabase.app` (dominio regional).

## 4. Pendiente

Si la consola sigue mostrando `BrowserPollConnection` en cada carga, algo impide el WebSocket
(red, proxy, antivirus): revisar en Network -> WS la conexion a `*.firebaseio.com`.
