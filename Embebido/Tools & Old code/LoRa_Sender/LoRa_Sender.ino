#include <SPI.h>
#include <LoRa.h> 
int count = 0;
 
void setup() {
  Serial.begin(19200);
  while (!Serial);  
  Serial.println("LoRa Sender");
  if (!LoRa.begin(915E6)) { // 433E6 or 915E6, the MHz speed
    Serial.println("Starting LoRa failed!");
    while (1);
  }
}
 
void loop() {
  String data = "DTA " + String(count);
  Serial.println(data);
  LoRa.beginPacket();  
  LoRa.print(data);
  LoRa.endPacket();
  count++;
  delay(2000);
}