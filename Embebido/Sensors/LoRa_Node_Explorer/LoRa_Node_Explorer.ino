/*************************************************
 *                 NODE EXPLORER                 *
 *************************************************/

#include <SPI.h>
#include <LoRa.h>
#include <SoftwareSerial.h>
#include <avr/wdt.h>

#include "LowPower.h"
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
  Serial.println(F("\n\n[[ DTA-Agrícola LoRa_Node_Explorer v0.1 ]]\n"));
  comunicaciones("", "", true);
}

void loop() {
  onReceive();
  if (runEvery(1000)) {
    String message = "DTA_FF," + nodes[idx] + "," + String(sleepingTime);
    LoRa_sendMessage(message);
    Serial.print("\nSend Message to " + nodes[idx]);
    repeat++;
    if (repeat == 3) {
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
  measurements[idx] = -99.0;
  voltages[idx] = -99.0;
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
      if (message.length() > 14 && message.substring(0, 6) == nodes[idx] && message.substring(7, 13) == String(gatewayAddress)) {
        setData(message, 14);
        setCounters();
      }
    } 
  }
}

void setData(String data, byte offSet) {
  Serial.print(F(" -> "));
  if (offSet == 0) {
    Serial.print(nodes[idx] + "," + String(gatewayAddress));
  } else {
    Serial.print(data.substring(0, offSet - 1));
    byte i = data.indexOf(',', offSet);
    measurements[idx] = data.substring(offSet, i).toFloat();
    voltages[idx] = data.substring(i + 1, data.length()).toFloat();
  }
  Serial.print("," + String(measurements[idx]) + "," + String(voltages[idx]));  
}

void setCounters() {
  idx++;
  idx = idx < numSensors ? idx : 0;
  repeat = 0;
  if (idx == 0) {
    showAndTxData();
    delay(50);
    sleepFor(sleepingTime);
    Serial.println(F("\n[[[ Nuevo ciclo... ]]]"));
  }
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

void sleepFor(float minutes) {
  Serial.print(F("Sleeping for ")); Serial.print(minutes); Serial.println(F(" minutes..."));
  delay(10);
  int timeToSleep = 15 * minutes;
  for (int i = 0; i <= timeToSleep; i++) {
    LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
    wdt_reset();
  }
}
