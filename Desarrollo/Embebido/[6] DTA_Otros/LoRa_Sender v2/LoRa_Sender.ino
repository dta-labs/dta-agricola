#include <SPI.h>
#include <LoRa.h> 

const String NODE_ADDRESS = "DTA_02";
int serial = A0;
int sleepinTime = 0;
 
void setup() {
  Serial.begin(115200);
  while (!Serial);  
  Serial.println("LoRa Node");
  while (!LoRa.begin(433E6)) { // or 915E6
    Serial.println("Starting LoRa failed!");
    delay(1);
  }
}
 
void loop() {
  if (onReceive()) {
    // txData();  
  }
  delay(sleepinTime);
}

bool onReceive() {
  if (LoRa.parsePacket() == 0) return false;
  int check = LoRa.read();
  sleepinTime = LoRa.read();
  String node = "";
  while (LoRa.available()) {
    node += (char)LoRa.read();
  }
  return true;
  // return (check == node.length() && node == NODE_ADDRESS) ? true : false;
}

void txData() {
  String data = "DTA_02," + (String)1.08 + "," + (String)4.00;
  LoRa.beginPacket();  
  LoRa.write(data.length());
  LoRa.print(data);
  LoRa.endPacket();
  Serial.println(data);
}