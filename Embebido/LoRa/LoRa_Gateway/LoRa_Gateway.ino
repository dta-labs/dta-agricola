/*************************************************
 *                   GATEWAY                     *
 *************************************************/

#include <SPI.h>
#include <LoRa.h>

#define gatewayAddress "DTA_192.168.1.0"
String nodeAddress = "DTA_192.168.1.";

const int numSensors = 5;

float temperature[254];

void setup() {
  Serial.begin(115200);
  
  while (!Serial);  
  Serial.print("LoRa Gateway: "); Serial.println(gatewayAddress);
  if (!LoRa.begin(433E6)) { // 433E6 or 915E6, the MHz speed of module
    Serial.println("Starting LoRa failed!");
    while (1);
  }
}
 
void loop() {
  sendRequests();
}

void sendRequests() {
  static int i = 1;
  String newNodeAddress = nodeAddress + String(i);
  Serial.print("nodeAddress: "); Serial.print(newNodeAddress);
  temperature[i - 1] = requestNode(newNodeAddress, "Moinsture");
  Serial.println();
  i = i < numSensors ? i + 1 : 1;
  delay(50);
}

float requestNode(String nodeAddress, String measure) {
  sendSingleRequest(nodeAddress, measure);
  String data = receiveData();
  float value = getDataValue(data, nodeAddress);
  int iter = 1;
  while (value == -999 && iter < 10) { 
    sendSingleRequest(nodeAddress, measure);
    data = receiveData();
    value = getDataValue(data, nodeAddress); 
    iter++;
    delay(5);
  }
  if (value != -999) { Serial.print(" = "); Serial.print(value); }
  return value;
}

void sendSingleRequest(String nodeAddress, String measure) {
  String data = String(gatewayAddress) + "," + String(nodeAddress) + "," + measure;
  // Serial.print("sending request "); Serial.println(data);
  LoRa.beginPacket();
  LoRa.print(data);  
  LoRa.endPacket();
}
 
String receiveData() {
  String inString = "";    // string to hold input
  for (int loop = 1; loop < 100; loop++) {
    int packetSize = LoRa.parsePacket();
    if (packetSize) { 
      while (LoRa.available()) {
        int inChar = LoRa.read();
        inString += (char)inChar;
      }
      LoRa.packetRssi(); 
    }
    delay(10);
  }
  return inString;   
}

float getDataValue(String data, String nodeAddress) {
  byte idx = data.indexOf(',');
  String from = data.substring(0, idx);
  String to = data.substring(idx + 1, data.indexOf(',', idx + 1));
  idx = data.indexOf(',', idx + 1);
  float dataValue = data.substring(idx + 1, data.length()).toFloat();
  // Serial.print(" dato: "); Serial.println(data);
  return from == nodeAddress && to == gatewayAddress ? dataValue : -999;
}
