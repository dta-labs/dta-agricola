#include <SPI.h>
#include <LoRa.h> 
 
void setup() {
  Serial.begin(19200);
  while (!Serial);
  Serial.println("LoRa Receiver");
  if (!LoRa.begin(915E6)) { // 433E6 or 915E6, the MHz speed
    Serial.println("Starting LoRa failed!");
    while (1);
  }
}
 
void loop() {
  String data = "";
  if (LoRa.parsePacket()) { 
    while (LoRa.available()) {
      data += (char)LoRa.read();
    }
    Serial.print(data + " "); Serial.println(LoRa.packetRssi());
  }
}