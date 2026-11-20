# Registro de decisiones

| Id | Fecha | Decisión | Motivo |
|---|---|---|---|
| D-001 | 2026-11-16 | El checksum (suma de caracteres) se mantiene sin cambios. | Compatibilidad con el gateway y sensores existentes. |
| D-002 | 2026-11-16 | `TEST` en `false` por defecto. | Con `true` todos los nodos usan el mismo Id y datos simulados. |
| D-003 | 2026-11-16 | ~~El watchdog se activa al inicio de `setup()` y se reactiva después de cada llamada a `LowPower`.~~ Reemplazada por D-017. | La librería LowPower apaga el watchdog al despertar. |
| D-004 | 2026-11-16 | `randomSeed` con el número de serie del sensor. | Evitar que nodos encendidos al mismo tiempo choquen. |
| D-005 | 2026-11-16 | Los cambios se comparan contra el último dato confirmado; la humedad también dispara envíos (≥ 5 %); se transmite al entrar y al salir de la zona crítica. | La comparación contra la lectura anterior no detectaba cambios lentos. |
| D-006 | 2026-11-16 | Confirmación: 4 intentos de 8 s con espera creciente; 1 intento si el ciclo anterior falló. | Ahorro de batería cuando el gateway no responde. |
| D-007 | 2026-11-16 | Falla del sensor se reporta con `Hr = -1`, `T = 0.0`. El número de serie se guarda en EEPROM. | Que el servidor se entere de la falla y el nodo conserve su Id. |
| D-008 | 2026-11-16 | Se aplica la frecuencia enviada por el gateway (`USE_GATEWAY_TIMER`), limitada a 1–60 min. | Control central de la frecuencia. |
| D-009 | 2026-11-16 | Heartbeat medido en tiempo dormido real; variación aleatoria del sueño ±20 %. | Antes dependía de que cada ciclo durara 5 min. |
| D-010 | 2026-11-16 | Sin `String`; solo arreglos `char` de tamaño fijo. | Evitar fragmentación de memoria. |
| D-011 | 2026-11-16 | Se descarta la primera conversión del ADC al medir Vcc. (Los 2 decimales se revirtieron en D-015.) | Lectura más estable. |
| D-012 | 2026-11-16 | Desarrollo guiado por pruebas (TDD) con pruebas en la PC: g++, framework propio `minitest.h` y simulaciones del hardware en `test/mocks/`. | Funciona con cualquier IDE (Arduino IDE, ArduinoDroid) y sin dependencias externas. |
| D-013 | 2026-11-16 | El ID del nodo depende del sensor instalado: al reemplazar el sensor, el nodo adopta el número de serie del nuevo, lo guarda en EEPROM y el servidor debe actualizar la lista del gateway. | El código del nodo es el mismo para todos; la identidad la da el sensor. |
| D-014 | 2026-11-16 | Resuelto P-004: `(unsigned long) serial` en `%lX`; las pruebas compilan con `-Werror=format`. | Formato correcto en AVR y en la PC. |
| D-015 | 2026-11-17 | Vcc vuelve a 1 decimal. | `updateNeveraDB.php` valida Vcc con exactamente 1 decimal; con 2 decimales descartaba el bloque completo del sensor y guardaba `null`. |
| D-017 | 2026-11-17 | **Se elimina el watchdog del firmware (v1.1).** LowPower sigue usándolo solo para despertar, sin reinicio. Reemplaza a D-003. | La prueba `watchdog_simple` mostró que el bootloader del Pro Mini (ATmegaBOOT) queda reiniciándose sin parar tras un reinicio por watchdog (P-006). |
| D-018 | 2026-11-17 | Versión `v1.aammdd` + consecutivo del día en `FW_VERSION`, mostrada al arrancar; cada cambio incrementa la versión y se registra en el README. | Trazabilidad de lo que tiene cada equipo. |
| D-019 | 2026-11-18 | Se elimina la zona crítica: se transmite si T o Hr cambian ≥ 0.5 respecto al último dato confirmado (más primera lectura, señal de vida y falla/recuperación del sensor). Reemplaza la parte de umbrales de D-005. | Decisión del usuario; la zona crítica (0–3 °C) hacía transmitir con cada 0.2 °C fuera del rango de la nevera. |

## Pendientes

| Id | Tema | Detalle |
|---|---|---|
| P-001 | Frecuencia del gateway | El gateway envía `modo / 2`: con modo 5, el nodo despertaría cada 2 min. Confirmar si se mantiene `USE_GATEWAY_TIMER = true`. |
| P-003 | Servidor | Interpretar `Hr = -1` como falla del sensor (hoy se guarda como lectura real de 0.0 °C). |
| P-005 | Repetidores | Con hasta 5 repetidores entre nodo y gateway, y cada tramo retransmitiendo datos (`d`) y confirmaciones (`a`) de ~10 sensores y repetidores, la confirmación extremo a extremo puede superar la espera actual (`ACK_TIMEOUT` 8 s × 4 intentos). Opciones a evaluar: espera según número de saltos, confirmación salto a salto, o confirmación diferida con número de secuencia. |


