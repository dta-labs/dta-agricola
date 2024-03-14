/*************************************************
 *                     NODE                      *
 *************************************************/

#include <SPI.h>
#include <LoRa.h>
#include "LowPower.h"

#define SLEEP 55
#define gatewayAddress "DTA_192.168.1.0"
#define nodeAddress "DTA_192.168.1.2"
#define sensor A0

void setup() {
  Serial.begin(115200);
  pinMode(sensor, INPUT);
  
  while (!Serial);  
  Serial.print("LoRa Node: "); Serial.println(nodeAddress);
  if (!LoRa.begin(433E6)) { // 433E6 or 915E6, the MHz speed of module
    Serial.println("Starting LoRa failed!");
    while (1);
  }
}
 
void loop() {
  String data = receiveData();
  if (checkData(data)) {
    sendMeasurement();
    sleepFor(SLEEP);
    Serial.println(F("Nuevo ciclo..."));
  }
  delay(50);
}
 
String receiveData() {
  String inString = "";    // string to hold input
  int packetSize = LoRa.parsePacket();
  if (packetSize) { 
    while (LoRa.available()) {
      int inChar = LoRa.read();
      inString += (char)inChar;
    }
    LoRa.packetRssi(); 
  }
  // Serial.print("\ndata: "); Serial.print(inString); 
  return inString;   
}

bool checkData(String data) {
  byte idx = data.indexOf(',');
  String from = data.substring(0, idx);
  String to = data.substring(idx + 1, data.indexOf(',', idx + 1));
  idx = data.indexOf(',', idx + 1);
  String dataType = data.substring(idx + 1, data.length());
  bool result = from == gatewayAddress && to == nodeAddress;
  // Serial.print(" "); Serial.print(result ? "* " : "");
  return from == gatewayAddress && to == nodeAddress;
}

void sendMeasurement() {
  int measure = map(analogRead(sensor), 14, 1023, 0, 100);
  String data = String(nodeAddress) + "," + String(gatewayAddress) + "," + measure;

  Serial.println(data);
  LoRa.beginPacket();  
  LoRa.print(data);
  LoRa.endPacket();
}

void sleepFor(float minutes) {
  Serial.print(F("Sleeping for ")); Serial.print(minutes); Serial.println(F(" minutes..."));
  delay(10);
  for (int i = 0;  i  <=  15 * (minutes - 0.2); i++)
    LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
}