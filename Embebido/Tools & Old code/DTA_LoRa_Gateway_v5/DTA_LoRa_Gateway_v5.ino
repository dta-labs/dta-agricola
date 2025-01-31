#include <SPI.h>
#include <LoRa.h>
#include <avr/wdt.h>

#include "LowPower.h"
#include "miscelaneas.h"
#include "configuracion.h"
#include "comunicaciones.h"
#include "analogicSensor.h"

void setup() {
  Serial.begin(115200);
  while (!Serial);
  Serial.println("\nLoRa Receiver\n");
  initLoRa();
  // comunicaciones("", "", "", true);
  commTimer = millis();
}

void loop() {
  rxData();
  delay(500);
}

void initLoRa() {
  if (!LoRa.begin(frequency)) {
    Serial.println("Starting LoRa failed!");
    while (1);
  }
  LoRa.setTxPower(22);            // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3); // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);    // Factor de propagación de 12
  LoRa.setCodingRate4(5);         // Tasa de codificación 4/5
}

void rxData() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String data = "";
    while (LoRa.available()) {
      data += (char)LoRa.read();
    }
    if (checkData(data)) {
      Serial.println(data);
      processData(data, String(LoRa.packetRssi()));
    } else {
      Serial.print(F("Error de lectura... "));
      Serial.println(data);
    }
  }
}

void processData(String data, String rssi) {
  data = data.substring(0, data.lastIndexOf(","));
  int index = (data.substring(3,4)).toInt();
  dataToSend[index] = data.substring(data.indexOf(":") + 1) + "," + rssi;
  if (index == numSensors - 1) {
    getLocalData();
    for (int i = 0; i < numSensors; i++) {
      measurements[i] = parse(dataToSend[i], ',', 0).toFloat();
      voltages[i] = parse(dataToSend[i], ',', 1).toFloat();
      qualities[i] = parse(dataToSend[i], ',', 2).toInt();
    }
    sendingGSMData();
  }
}

void sendingGSMData() {
  String strMeasurements = "", strVoltages = "", strQualities = "";
  for (int i = 0; i < numSensors; i++) {
    strMeasurements += i == 0 ? String(measurements[i]) : "," + String(measurements[i]);
    strVoltages += i == 0 ? String(voltages[i]) : "," + String(voltages[i]);
    strQualities += i == 0 ? String(qualities[i]) : "," + String(qualities[i]);
  } 
  Serial.print(F("[")); Serial.print(strMeasurements); Serial.print(F("],"));
  Serial.print(F("[")); Serial.print(strVoltages); Serial.print(F("],"));
  Serial.print(F("[")); Serial.print(strQualities); Serial.println(F("]"));
  if (millis() - commTimer > 60000) {
    commTimer = millis();
    // comunicaciones(strMeasurements, strVoltages, strQualities, false);
  }
  for (int i = 1; i < numSensors; i++)
    dataToSend[i] = "";
}

void getLocalData() {
  String result = String(counter) + ",";
  result += String(readVcc());
  result += ",-10";
  counter++;
  dataToSend[0] = result;
}
