#include <SPI.h>
#include <LoRa.h> 

int val = 0;
int valAnt = 0;
bool tx = true;
 
void setup() {
  Serial.begin(115200);
  while (!Serial);
  Serial.println("LoRa Gateway");
  while (!LoRa.begin(433E6)) { // or 915E6
    Serial.println("Starting LoRa failed!");
    delay(1);
  }
}
 
void loop() {
  static int lastSendTime = millis();
  if (millis() - lastSendTime > 1000) {
    txData();
    lastSendTime = millis();
  }
  onReceive();
}

bool onReceive() {
  if (LoRa.parsePacket() == 0) return false;
  String data = "";    
  int check = LoRa.read();
  while (LoRa.available()) {
    data += (char)LoRa.read();
  }
  Serial.print("DTA_02: "); Serial.print(data.substring(7));
  if (check == data.length() && data.substring(0, 6) == "DTA_02") {
    // return true;
  }
  Serial.println();
  return true;
}

void txData() {
  String node = "DTA_02";
  LoRa.beginPacket();  
  LoRa.write(6);                // Check
  LoRa.write(1);                // Sleeping time
  LoRa.print(node);             // node
  LoRa.endPacket();
}