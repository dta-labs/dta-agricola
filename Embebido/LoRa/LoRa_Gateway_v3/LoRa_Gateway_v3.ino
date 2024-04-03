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
#include "analogicSensor.h"

void setup() {
  Serial.begin(115200);
  while (!Serial);  
  Serial.print(F("\n[[[ LoRa Gateway: ")); Serial.print(gatewayAddress); Serial.println(F(" ]]]"));
  while (!LoRa.begin(433E6)) { // 433E6 or 915E6, the MHz speed of module
    Serial.println(F("Starting LoRa failed!"));
    delay(1);
  }
  comunicaciones(false);
}
 
void loop() {
  sendRequests();
}

void sendRequests() {
  String newNodeAddress = "DTA_" + sensorsID.substring(idx * 2, idx * 2 + 2);
  Serial.print(F("nodeAddress: ")); Serial.print(newNodeAddress);
  requestNode(newNodeAddress);
  Serial.println();
  if (idx >= numSensors) {
    sendDataHTTP();
    sleepFor(sleepingTime);
    Serial.println(F("\nNuevo ciclo..."));
    // resetSoftware();
    idx = 0;
  }
}

void requestNode(String nodeAddress) {
  if (nodeAddress == (String)gatewayAddress) {
    measurements[idx] = readAnalogicData(sensor);
    voltages[idx] = readVcc();
    Serial.print(F(" = ")); Serial.print(measurements[idx]); 
    idx++;
  } else {
    bool result =  false;
    int iter = 1;
    do { 
      sendSingleRequest(nodeAddress);
      String data = receiveData();
      result = getDataValue(data, nodeAddress); 
      iter++;
      delay(5);
    } while (!result && iter <= 10);
    idx += (result || iter > 10) ? 1 : 0;
  }
}

void sendSingleRequest(String nodeAddress) {
  String data = String(gatewayAddress) + "," + String(nodeAddress) + "," + String(sleepingTime);
  LoRa.beginPacket();
  LoRa.print(data);  
  LoRa.endPacket();
}

String receiveData() {
  String inString = "";
  for (int loop = 1; loop < 100; loop++) {
    int packetSize = LoRa.parsePacket();
    if (packetSize) { 
      while (LoRa.available()) {
        int inChar = LoRa.read();
        inString += (char)inChar;
      }
      LoRa.packetRssi(); 
      break;
    }
    delay(5);
  }
  return inString;   
}

bool getDataValue(String data, String nodeAddress) {
  byte index = data.indexOf(',');
  String from = data.substring(0, index);
  String to = data.substring(index + 1, data.indexOf(',', index + 1));
  if (from == nodeAddress && to == gatewayAddress) {
    index = data.indexOf(',', index + 1);
    measurements[idx] = data.substring(index + 1, data.indexOf(',', index + 1)).toFloat();
    index = data.indexOf(',', index + 1);
    voltages[idx] = data.substring(index + 1, data.length()).toFloat();
    Serial.print(F(" = ")); Serial.print(measurements[idx]); 
    return true;
  }
  return false;
}

void sendDataHTTP() {
  Serial.print(F("["));
  for (int j = 0; j < numSensors; j++) {
    Serial.print(measurements[j]); 
    if (j < numSensors - 1) Serial.print(F(", ")); 
  } 
  Serial.println(F("]")); 
  comunicaciones(true);
}

void sleepFor(float minutes) {
  Serial.print(F("Sleeping for ")); Serial.print(minutes); Serial.println(F(" minutes..."));
  delay(10);
  int time = 15 * minutes;
  for (int i = 0; i <= time; i++)
    LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
}