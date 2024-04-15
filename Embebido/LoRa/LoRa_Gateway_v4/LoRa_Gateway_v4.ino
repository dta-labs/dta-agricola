/*************************************************
 *                   GATEWAY                     *
 *************************************************/

#include <SPI.h>
#include <LoRa.h>
#include <SoftwareSerial.h>
#include <avr/wdt.h>

#include "miscelaneas.h"
#include "configuracion.h"
#include "comunicaciones.h"
#include "analogicSensor.h"

void setup() {
  Serial.begin(115200);
  while (!Serial);
  while (!LoRa.begin(frequency)) {
    Serial.println(F("LoRa init failed. Check your connections."));
    delay(1);
  }
  Serial.println(F("\n\nDTA-Agrícola LoRa_Gateway v0.4\n"));
  comunicaciones("", "", true);
}

void loop() {
  onReceive();
  if (runEvery(5000)) {
    String message = "DTA_FF," + nodes[idx] + "," + String(sleepingTime);
    Serial.print("\n[" + String(idx) + "] Send Message to " + nodes[idx]);
    LoRa_sendMessage(message);
    repeat++;
    if (repeat == 2) {
      setCounters();
    }
  }
}

void LoRa_sendMessage(String message) {
  LoRa.beginPacket(); 
  LoRa.print(message);
  LoRa.endPacket(true);
}

void onReceive() {
  if (nodes[idx] == String(nodeAddress) && repeat > 0) {
    measurements[idx] = readAnalogicData(sensor);
    voltages[idx] = readVcc();
    setData(String(measurements[idx]) + "," + String(voltages[idx]), 0);
    setCounters();
  } else {
    if (LoRa.parsePacket() > 0) {
      String message = "";
      while (LoRa.available()) {
        message += (char)LoRa.read();
      }
      setData(message, 14);
      setCounters();
    } 
  }
}

void setData(String data, byte offSet) {
  byte i = data.indexOf(',', offSet);
  measurements[idx] = data.substring(offSet, i).toFloat();
  voltages[idx] = data.substring(i + 1, data.length()).toFloat();
  Serial.print(" -> " + nodes[idx] + "," + String(gatewayAddress) + "," + measurements[idx] + "," + String(voltages[idx]));  
}

void setCounters() {
  idx++;
  idx = idx < numSensors ? idx : 0;
  repeat = 0;
  if (idx == 0) showAndTxData();
}

void showAndTxData() {
  String strMeasurements = "";
  String strVoltages = "";
  for (int i = 0; i < numSensors; i++) strMeasurements += i == 0 ? String(measurements[i]) : "," + String(measurements[i]);
  for (int i = 0; i < numSensors; i++) strVoltages += i == 0 ? String(voltages[i]) : "," + String(voltages[i]);
  Serial.print(F("\nMeasurements: [")); Serial.print(strMeasurements); 
  Serial.print(F("]\nVoltages:     [")); Serial.print(strVoltages); Serial.println(F("]"));
  comunicaciones(strMeasurements, strVoltages, false);
}

boolean runEvery(unsigned long interval) {
  static unsigned long previousMillis = 0;
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    return true;
  }
  return false;
}
