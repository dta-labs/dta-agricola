# Red de sensores LoRa con confirmación y repetidor

Esta implementación usa **LoRa físico (P2P)** mediante RadioLib y un protocolo
propio. No es LoRaWAN: LoRaWAN no define repetidores transparentes y alterar sus
tramas rompería la integridad, los contadores y las ventanas RX. Para conectarse a
un Network Server LoRaWAN real se deben eliminar los repetidores o sustituirlos por
gateways adicionales.

## Dependencias

- RadioLib, probada con la familia SX1276/77/78/79.
- Low-Power de Rocket Scream para que el Arduino Pro Mini AVR entre en
  `powerDown`. El repetidor y el gateway no la necesitan.

Instalar ambas desde el Library Manager de Arduino. Seleccionar la placa y tensión
correctas del Pro Mini. El ejemplo asume NSS=10, DIO0=2, RESET=9 y DIO1=3.

## Operación

1. El nodo envía `DATA` y abre una recepción bloqueante para el `ACK`.
2. Si el gateway recibe la trama directa o a través del repetidor, emite JSON por
   serie y responde con el mismo número de secuencia.
3. El ACK indica SF, potencia y segundos de sueño del siguiente ciclo.
4. El repetidor reenvía DATA, espera el ACK y lo devuelve al nodo.
5. Sin ACK, el nodo reintenta con retroceso aleatorio; después aumenta SF/potencia
   y duerme 60 s para no agotar la batería.

Gateway y repetidor barren SF7..SF12. Un solo SX127x sólo puede escuchar un SF a la
vez, por lo que esta solución es apropiada para redes pequeñas y tráfico
esporádico. Para recepción simultánea multi-SF se requiere un concentrador
SX1302/SX1303.

## Antes de desplegar

- Cambiar `FREQUENCY_MHZ` conforme a la normativa local y respetar límites de
  potencia, ciclo de trabajo y dwell time.
- Dar un `NODE_ID` único a cada nodo.
- Calibrar la medición de batería y reemplazar `readSensor()`.
- Ajustar pines y usar antena adecuada antes de energizar el radio.
- El gateway entrega JSON a 115200 baudios; un proceso externo debe publicarlo en
  MQTT/HTTP hacia la nube.
- Para seguridad real, añadir autenticación/cifrado y protección contra replay;
  RadioLib CRC sólo detecta errores accidentales.
