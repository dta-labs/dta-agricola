# Especificaciones — Nodo LoRa SHT (DTA_LoRa_SHT_v1.1)

Nodo de temperatura y humedad relativa (sensor SHT4x) con radio LoRa RFM95, alimentado
por batería. Envía sus lecturas al gateway `DTA_LoRa_Gateway_GSM`.

## Documentos

| Archivo | Contenido |
|---|---|
| [protocolo.md](protocolo.md) | Tramas de datos y de confirmación, parámetros de radio, validaciones del gateway, códigos de error |
| [funcionamiento.md](funcionamiento.md) | Ciclo de trabajo, criterios de transmisión, tiempos, reintentos, watchdog, EEPROM, parámetros configurables |
| [funciones.md](funciones.md) | Ficha de cada función: propósito, entradas, salidas, reglas y estado de revisión |
| [decisiones.md](decisiones.md) | Registro de decisiones con fecha y motivo, y temas pendientes |

La batería de pruebas que verifica estas especificaciones está en [`../test/`](../test/README.md).

## Convenciones

- Estado de cada función en `funciones.md`: **Pendiente** → **En revisión** → **Aprobada**.
- Toda decisión que cambie el comportamiento se registra en `decisiones.md` antes de cambiar el código.
- Flujo TDD: especificación → prueba (que debe fallar) → código → toda la batería en verde.
- Cada función aprobada debe tener al menos una prueba en `test/`.
- Cada cambio incrementa `FW_VERSION` (`v1.aammdd` + consecutivo del día, por ejemplo `v1.261117001`) y se registra en el `README.md` del proyecto bajo esa versión (problemas resueltos y 🆕 nuevo).
- Los valores numéricos de este documento deben coincidir con `configuracion.h`; si difieren, manda el código y se corrige la especificación.
