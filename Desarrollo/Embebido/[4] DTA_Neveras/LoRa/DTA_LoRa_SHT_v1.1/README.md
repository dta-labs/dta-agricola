# Nodo LoRa SHT — v1.1

Nodo de temperatura y humedad relativa (SHT4x) con radio LoRa RFM95, alimentado por batería.
Envía sus lecturas al gateway `DTA_LoRa_Gateway_GSM`.

- Especificaciones: [`spec/`](spec/README.md)
- Batería de pruebas: [`test/`](test/README.md)

> Este README se actualiza con cada cambio del proyecto. 🆕 = funcionalidad nueva.
> Versión: `v1.aammdd` + consecutivo del día (`FW_VERSION` en `configuracion.h`; se muestra al arrancar).

**Versión actual: `v1.261118001`** · Pruebas: 51

## Historial de versiones

### v1.261118001 — 2026-11-18
- **Sin zona crítica:** se transmite cuando la temperatura **o** la humedad cambian **≥ 0.5** respecto al último dato confirmado por el gateway (antes: 0.2 °C / 0.5 °C según la zona crítica, y 5 % de humedad). Siguen la primera lectura, la señal de vida (1 h) y la falla/recuperación del sensor. (D-019)
- Los cambios graduales se acumulan contra el último dato confirmado (verificado con pruebas de subidas y bajadas lentas de temperatura y humedad).

### v1.261117002 — 2026-11-17
- Watchdog eliminado: el bootloader del Pro Mini queda reiniciándose sin parar tras un reinicio por watchdog (comprobado con `test/hardware/watchdog_simple`). LowPower sigue usándolo solo para despertar. En la v1 tampoco actuaba: LowPower lo apagaba tras el primer sueño. (D-017)
- 🆕 Número de versión `FW_VERSION` (`v1.aammdd` + consecutivo), mostrado al arrancar. (D-018)

### v1.261117001 — 2026-11-17
- Vcc vuelve a 1 decimal: `updateNeveraDB.php` rechazaba el bloque completo del sensor con 2 decimales y guardaba `null`. (D-015)

### v1.261116001 — 2026-11-16 · Cambios v1 → v1.1

#### Problemas resueltos
- `TEST = true` dejaba a todos los nodos con el mismo ID y datos simulados.
- `while(10)` colgaba el nodo si LoRa fallaba.
- `random()` sin semilla: todos los nodos tenían los mismos tiempos y chocaban.
- Los cambios se comparaban contra la lectura anterior: una deriva lenta nunca se transmitía.
- La humedad nunca disparaba un envío.
- Un dato se daba por enviado aunque no hubiera confirmación.
- Si el gateway no respondía, el nodo gastaba hasta ~3.5 min de radio por ciclo (6 intentos × 30 s).
- Un sensor en falla producía el ID `0x0`: tramas rechazadas, falla invisible y batería desperdiciada.
- No se validaba `getEvent()`, así que se enviaban lecturas basura.
- El heartbeat suponía ciclos de 5 min; el jitter podía dar 0 ciclos.
- Uso de `String` (fragmentación de memoria).
- El ID se armaba con `String` y `+=` (se acumulaba si se llamaba dos veces); ahora `snprintf` con formato portable (`(unsigned long)` en `%lX`).
- Código sin uso: `nextWake`, `interval`, `jitter`, la función del calentador, `sensorType`, código después de `return`.

#### Nuevo
- 🆕 Reporte de falla del sensor con `Hr = -1`, `T = 0.0`.
- 🆕 Número de serie y frecuencia guardados en EEPROM con CRC: el nodo conserva su ID aunque falle el sensor. Al reemplazar el sensor, el ID cambia al del nuevo (el servidor debe actualizar la lista del gateway).
- 🆕 Transmisión al **salir** de la zona crítica (eliminada en v1.261118001).
- 🆕 Aplica la frecuencia enviada por el gateway (`USE_GATEWAY_TIMER`, 1–60 min).
- 🆕 Reintentos con espera creciente, y 1 solo intento si el ciclo anterior falló.
- 🆕 Reintento automático del sensor y de LoRa en cada ciclo.
- 🆕 Watchdog activo durante todo el ciclo (reemplazado en v1.261117002).
- 🆕 Vcc con 2 decimales y descarte de la primera conversión del ADC (los 2 decimales se revirtieron en v1.261117001).

#### Pruebas y documentación
- 🆕 Carpeta `spec/` con protocolo, funcionamiento, funciones y decisiones.
- 🆕 Batería de pruebas `test/` en la PC, con simulaciones del hardware y un gateway simulado.

## Compatibilidad
- **Con el gateway v1:** compatible. Mientras no se resuelva P-001, cargar con `USE_GATEWAY_TIMER false`; si no, el nodo despertará cada `modo / 2` minutos (2 min con modo 5).
- **Con el gateway v1.1:** compatible.

## Pendientes antes de llevarlo a campo
- **P-001:** frecuencia del gateway (`modo / 2` → 2 min).
- **P-003:** el servidor debe interpretar `Hr = -1` como falla del sensor.
- **P-005 (repetidores):** con hasta 5 repetidores y tráfico de otros 10 sensores por tramo, la confirmación puede tardar más que la espera actual (4 × 8 s). Revisar el esquema de confirmación antes de usar repetidores.


