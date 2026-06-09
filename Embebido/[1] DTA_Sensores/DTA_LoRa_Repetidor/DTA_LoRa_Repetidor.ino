#include <LoRa.h>

#define FREQUENCY 915E6   // Ajusta según tu región
#define NODE_ID "DTA"

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(20);                            // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3);                 // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);                    // Factor de propagación de 12
  LoRa.setCodingRate4(5);                         // Tasa de codificación 4/5
  // LoRa.sleep();
  Serial.println(F("\n\nRepetidor LoRa inicializado correctamente..."));
}

void setup() {
  Serial.begin(250000);
  while (!Serial) delay(10);
  initLoRa();
}

void loop() {
  if (LoRa.parsePacket()) {
    String data = "";
    while (LoRa.available()) data += (char)LoRa.read();
    if (data.startsWith(NODE_ID)) {
      Serial.print(F("Rx <- ")); Serial.print(data);
      LoRa.beginPacket();
      LoRa.print(data);
      LoRa.endPacket();
      Serial.println(F(" -> Tx")); Serial.flush();
    }
  }
}
