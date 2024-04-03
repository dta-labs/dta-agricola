/*************************************************
 *                 GATEWAY v2                    *
 *************************************************/

#include <SPI.h>
#include <LoRa.h>
#include <SoftwareSerial.h>
#include <EEPROM.h>
#include "LowPower.h"
#include "ListLib.h"
#include "miscelaneas.h"
#include "configuracion.h"
#include "analogicSensor.h"
#include "comunicaciones.h"

void setup() {
  Serial.begin(115200);
  while (!Serial);  
  Serial.print("\nLoRa Gateway: "); Serial.println(gatewayAddress);
  while (!LoRa.begin(433E6)) { // 433E6 or 915E6, the MHz speed of module
    Serial.println("Starting LoRa failed!");
    delay(5);
  }
  comunicaciones(true);
}
 
void loop() {
  sendSensorsRequests();
}

void sendSingleRequest(String nodeAddress) {
  String data = String(gatewayAddress) + "," + String(nodeAddress) + "," + String(sleepingTime);
  LoRa.beginPacket();
  LoRa.print(data);  
  LoRa.endPacket();
}

void getDataValue(String data, String nodeAddress, float value[2]) {
  byte index = data.indexOf(',');
  String from = data.substring(0, index);
  String to = data.substring(index + 1, data.indexOf(',', index + 1));
  if (from == nodeAddress && to == gatewayAddress) {
    index = data.indexOf(',', index + 1);
    value[0] = data.substring(index + 1, data.indexOf(',', index + 1)).toFloat();
    index = data.indexOf(',', index + 1);
    value[1] = data.substring(index + 1, data.length()).toFloat();
  }
  // return value;
}

void requestNode(String nodeAddress, float value[2]) {
  if (idx == 0) {
    value[0] = readAnalogicData();
    value[1] = readVcc() / 1000.0;
  } else {
    sendSingleRequest(nodeAddress);
    String data = receiveData();
    getDataValue(data, nodeAddress, value);
    int iter = 1;
    while (value[0] == -99 && iter <= 10) { 
      sendSingleRequest(nodeAddress);
      data = receiveData();
      getDataValue(data, nodeAddress, value); 
      iter++;
      delay(5);
    }
  }
  if (value[0] != -99) {  Serial.print(F(" = ")); Serial.print(value[0]); Serial.print(" "); Serial.print(value[1]); }
  // return value;
}

void sendSensorsRequests() {
  String newNodeAddress = "DTA_" + sensorsID[idx];
  if (newNodeAddress != "DTA_") {
    Serial.print(F("nodeAddress: ")); Serial.print(newNodeAddress);
    float value[2] = {-99, -99};
    requestNode(newNodeAddress, value);
    measurement.Add(value[0]);
    voltages.Add(value[1]);
    Serial.println();
  }
  idx++;
  if (idx > numSensors) {
    sendDataHTTP();
    sleepFor(sleepingTime);
    Serial.println(F("\nNuevo ciclo..."));
    idx = 0;
    delay(10);
    resetSoftware();
  }
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

void sendDataHTTP() {
  showData(measurement);
  showData(voltages);
  comunicaciones(false);
}

void showData(List<float> list) {
  Serial.print(F("["));
  for (int j = 0; j < numSensors; j++) {
    Serial.print(list[j]); 
    if (j < numSensors - 1) Serial.print(F(", ")); 
  } 
  Serial.println(F("]")); 
}

void sleepFor(float minutes) {
  Serial.print(F("Sleeping for ")); Serial.print(minutes); Serial.println(F(" minutes..."));
  delay(10);
  int timeToSleep = 15 * minutes;
  for (int i = 0; i <= timeToSleep; i++)
    LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
}