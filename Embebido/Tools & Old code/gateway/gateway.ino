/* Gateway */

#include <SPI.h>
#include <LoRa.h>

bool tx = true;

void setup() {
    Serial.begin(115200);
    while (!Serial);
    if (!LoRa.begin(433E6)) {
        Serial.println("Error al iniciar el módulo LoRa.");
        while (1);
    }
}

void loop() {
  // Envía una solicitud al nodo
  if (tx) {
    String request = "Identificador de solicitud";
    LoRa.beginPacket();
    LoRa.print(request);
    LoRa.endPacket();
    tx = false;
  }

  if (LoRa.parsePacket()) {
    String receivedData = LoRa.readString();
    Serial.println("Respuesta del nodo: " + receivedData);
    tx = true;
  }
  // delay(15);
}
