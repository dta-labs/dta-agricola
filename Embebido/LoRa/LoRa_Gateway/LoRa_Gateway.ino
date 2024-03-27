/*************************************************
 *                   GATEWAY                     *
 *************************************************/

#include <SPI.h>
#include <LoRa.h>
#include <SoftwareSerial.h>
#include "LowPower.h"
#include "miscelaneas.h"
#include "configuracion.h"
#include "comunicaciones.h"

void setup() {
  Serial.begin(115200);
  while (!Serial);  
  Serial.print("\nLoRa Gateway: "); Serial.println(gatewayAddress);
  if (!LoRa.begin(433E6)) { // 433E6 or 915E6, the MHz speed of module
    Serial.println("Starting LoRa failed!");
    while (1);
  }
}
 
void loop() {
  sendRequests();
}

void sendRequests() {
  String newNodeAddress = nodeAddress + String(idx);
  Serial.print(F("nodeAddress: ")); Serial.print(newNodeAddress);
  measurement[idx - 1] = requestNode(newNodeAddress);
  Serial.println();
  idx++;
  if (idx > numSensors) {
    sendDataHTTP();
    sleepFor(sleepingTime);
    Serial.println(F("\nNuevo ciclo..."));
    // resetSoftware();
    idx = 1;
  }
}

float requestNode(String nodeAddress) {
  float value = 0;
  if (nodeAddress == String(baseNodeAddress) + "1") {
    value = analogRead(sensor);
  } else {
    sendSingleRequest(nodeAddress);
    String data = receiveData();
    value = getDataValue(data, nodeAddress);
    int iter = 1;
    while (value == -99 && iter <= 10) { 
      sendSingleRequest(nodeAddress);
      data = receiveData();
      value = getDataValue(data, nodeAddress); 
      iter++;
      delay(5);
    }
  }
  if (value != -99) {  Serial.print(F(" = ")); Serial.print(value); }
  return value;
}

void sendSingleRequest(String nodeAddress) {
  String data = String(gatewayAddress) + "," + String(nodeAddress) + "," + String(sleepingTime);
  LoRa.beginPacket();
  LoRa.print(data);  
  LoRa.endPacket();
}

String receiveData() {
  String inString = "";
  for (int loop = 1; loop < 50; loop++) {
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
  return from == nodeAddress && to == gatewayAddress ? dataValue : -99;
}

void sendDataHTTP() {
  Serial.print(F("["));
  for (int j = 0; j < numSensors; j++) {
    Serial.print(measurement[j]); 
    if (j < numSensors - 1) Serial.print(F(", ")); 
  } 
  Serial.println(F("]")); 
  comunicaciones();
}

void sleepFor(float minutes) {
  Serial.print(F("Sleeping for ")); Serial.print(minutes); Serial.println(F(" minutes..."));
  delay(10);
  for (int i = 0;  i  <=  15 * minutes; i++)
    LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
}