/* Nodo */

#include <SPI.h>
#include <LoRa.h>

void setup() {
    Serial.begin(115200);
    while (!Serial);
    if (!LoRa.begin(433E6)) {
        Serial.println("Error al iniciar el módulo LoRa.");
        while (1);
    }
}

void loop() {
  if (LoRa.parsePacket()) {
    String receivedData = LoRa.readString();
    Serial.println("Rx: " + receivedData);

    String response = "Rx del nodo";
    LoRa.beginPacket();
    LoRa.print(response);
    LoRa.endPacket();
  }
}
