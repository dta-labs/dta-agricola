# REQ-101 - Bandeja de notificaciones (sin avisos emergentes al iniciar)

| Campo | Valor |
|---|---|
| Estado | **Implementado** (2026-11-20) - probar: usuario |
| Alcance | `logic/notificaciones.js` y `services/buzon-notificaciones.js` (nuevos), `core.js`, `firebaseMessaging.js`, `firebase-messaging-sw.js`, `index.html`, `style.css`, `ventana.css` |
| Pruebas | 431/431 en Node (9 nuevas en `notificaciones.test.js`) |
| Compilacion | `26.11.20.004` |

## Problema

Al iniciar, `processingAlerts` evaluaba las alarmas de helada con la primera lectura de cada red y mostraba un aviso
emergente (`M.toast`) por cada sensor: una rafaga. Las notificaciones del servidor (push) no se guardaban: no habia
historial.

## Solucion

| Pedido | Implementacion |
|---|---|
| Sin avisos al inicio | `processingAlerts` ya no usa `M.toast`: cada alarma va a la bandeja; el sonido solo si la alarma es nueva (no la de una sesion anterior) |
| Boton flotante | Naranja, con contador (9+), **solo si hay sin leer**, fijo encima del boton de acciones (`bottom: 78px`), en todas las pantallas |
| Al tocarlo | Abre la ventana de Notificaciones (la del menu lateral) |
| Sin leer / Historial | Ventana: **Sin leer** (resaltadas), **Historial** (ultimas 50; "Borrar historial") y debajo las **Preferencias** de siempre. Al abrirla, las sin leer pasan al historial y el boton se oculta |
| Cada notificacion | Icono del **tipo** (riego, temperatura, helada, plagas, electricidad, seguridad, aviso) en un circulo de color, titulo, mensaje, tipo y **fecha y hora** ("Hoy 14:05", "Ayer…", fecha completa) e icono y texto de **urgencia** |

**Tipo y urgencia** (de `data.alertType` del servidor): falla de electricidad o seguridad -> critica; temperatura -> alta;
humedad del suelo -> riego, media; plagas -> alta (>= 70 %), media (>= 40 %), baja; helada (app) -> alta.

## De donde salen y donde se guardan

Bandeja **por usuario en este dispositivo** (`localStorage`, maximo 200, sin duplicados por id):
1. Alarmas de helada de la app.
2. Push con la app abierta: `firebaseMessaging.js` lanza el evento `dta-notificacion` (la notificacion del sistema
   se sigue mostrando).
3. Push con la app cerrada: el service worker escucha el evento `push` (con titulo y texto, Firebase no llama a su
   manejador en segundo plano) y la deja en un buzon IndexedDB; la app la recoge al entrar y al volver a primer plano.

Limitacion: el historial es del dispositivo (otro dispositivo tiene el suyo). Para un historial comun habria que
guardar cada notificacion en la base de datos desde `functions` (siguiente paso posible).
