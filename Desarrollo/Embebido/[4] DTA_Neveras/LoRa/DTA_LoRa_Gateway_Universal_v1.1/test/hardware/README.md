# Pruebas en la placa

> **Nota (D-017/D-018):** el firmware v1.1 no usa el watchdog interno. El gateway usa el circuito de
> reinicio externo en A0. Estas pruebas se conservan para evaluar placas con otro bootloader (por ejemplo, Optiboot).

Sketches independientes que se cargan en la placa para validar el hardware. Se observa el
monitor serie y se registra el resultado en `spec/decisiones.md`.

## Watchdog — prueba mínima (`watchdog_simple/`)

Sketch pequeño, sin librerías, para comprobar que el watchdog reinicia la placa y que el
bootloader lo soporta. Sirve igual para el nodo y para el gateway (ambos son Pro Mini / ATmega328P).

1. Abrir `watchdog_simple/watchdog_simple.ino`, elegir la misma placa y procesador que el firmware y cargarlo.
2. Abrir el monitor serie a **9600 baudios** y desconectar/conectar la alimentación.
3. Esperar ~25 s.

| Lo que muestra el monitor | Resultado |
|---|---|
| `Causa del reinicio: WATCHDOG` tres veces y `PRUEBA COMPLETA` | ✔ El watchdog funciona |
| `✘ FALLA: no hubo reinicio en 10 s` | ✘ El watchdog no reinicia la placa |
| Después de `Se deja de alimentar` no aparece nada más y el LED parpadea rápido | ✘ El bootloader no soporta el watchdog (reinicio en bucle). Desconectar la alimentación para recuperar la placa |
| Se reinicia cada ~7 s mostrando `Causa del reinicio: desconocida` | ✔ El watchdog funciona, pero el bootloader no informa la causa |

Si falla por el bootloader: quemar Optiboot (con MiniCore para el Pro Mini de 8 MHz) o desactivar el
watchdog en el firmware hasta cambiarlo. Registrar el resultado (placa, fecha) en `spec/decisiones.md`.

El circuito de reinicio externo (A0) se descartó en v1.261119001: A0 y A1 pasan al ESP8266 (D-036).
