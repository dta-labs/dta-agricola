# Especificaciones — Gateway LoRa Universal (DTA_LoRa_Gateway_Universal v1.1)

Gateway LoRa (RFM95) con módem GSM SIM800 sobre ATmega328 (Arduino Pro Mini). Recibe las
lecturas de los nodos (`DTA_LoRa_SHT`, `DTA_LoRa_SCT`), las confirma y las envía por HTTP al servidor.

## Documentos

| Archivo | Contenido |
|---|---|
| [protocolo.md](protocolo.md) | Tramas LoRa (entrada y confirmación), URL HTTP, respuesta del servidor, comandos AT |
| [funcionamiento.md](funcionamiento.md) | Ciclo de trabajo, cola LoRa, lista de sensores, envío, errores y reinicio, LED, EEPROM, parámetros |
| [funciones.md](funciones.md) | Ficha de cada función: propósito, reglas, pruebas y estado de revisión |
| [decisiones.md](decisiones.md) | Registro de decisiones con fecha y motivo, y temas pendientes |

La batería de pruebas que verifica estas especificaciones está en [`../test/`](../test/README.md).

## Convenciones

- Estado de cada función en `funciones.md`: **Pendiente** → **En revisión** → **Aprobada**.
- Toda decisión que cambie el comportamiento se registra en `decisiones.md` antes de cambiar el código.
- Flujo TDD: especificación → prueba (que debe fallar) → código → toda la batería en verde.
- Cada función aprobada debe tener al menos una prueba en `test/`.
- Cada cambio incrementa `FW_VERSION` (`v1.aammdd` + consecutivo del día, por ejemplo `v1.261117001`) y se registra en el `README.md` del proyecto bajo esa versión.
- Los Id de decisiones (D-xxx) son propios de este proyecto. Los pendientes compartidos con el nodo
  conservan su número (P-001, P-005).
- Los valores de este documento deben coincidir con `configuracion.h`; si difieren, manda el código.
