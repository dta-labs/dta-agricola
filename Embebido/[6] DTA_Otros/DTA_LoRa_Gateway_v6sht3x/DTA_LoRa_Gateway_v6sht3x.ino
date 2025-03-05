#include <SPI.h>
#include <LoRa.h>
#include <avr/wdt.h>
#include "LowPower.h"
#include "miscelaneas.h"
#include "configuracion.h"
#include "loraComm.h"
#include "comunicaciones.h"
#include "analogicSensor.h"
#include <Adafruit_SHT31.h>

#pragma region Programa Principal

void setup() {
  Serial.begin(9600);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println("\nLoRa Gateway v6.0\n");
  initLoRa();
  resetData();
  // comunicaciones("", true);
  commTimer = millis();
}

void loop() {
  rxData();
  txData();
  delay(50);
}

void txData() {
  unsigned long commFrequence = TIMER * 60000;
  if (millis() - commTimer > commFrequence) {
    commTimer = millis();
    getLocalData();
    String strToSend = "data:";
    for (int i = 0; i < 10; i++) {
      strToSend += dataToSend[i];
      strToSend += (i < 9) ? "," : "";
    }
    Serial.println(strToSend);
    // comunicaciones(strToSend, false);
    resetData();
  }
}

void resetData() {
  for (int i = 0; i < 10; i++) dataToSend[i] = "-99,-99,-99,-99";
}

// void sendingGSMData() {
//   String strMeasurements = "", strVoltages = "", strQualities = "";
//   for (int i = 0; i < numSensors; i++) {
//     strMeasurements += i == 0 ? String(measurements[i]) : "," + String(measurements[i]);
//     strVoltages += i == 0 ? String(voltages[i]) : "," + String(voltages[i]);
//     strQualities += i == 0 ? String(qualities[i]) : "," + String(qualities[i]);
//   } 
//   Serial.print(F("[")); Serial.print(strMeasurements); Serial.print(F("],"));
//   Serial.print(F("[")); Serial.print(strVoltages); Serial.print(F("],"));
//   Serial.print(F("[")); Serial.print(strQualities); Serial.println(F("]"));
//   if (millis() - commTimer > 60000) {
//     commTimer = millis();
//     // comunicaciones(strMeasurements, strVoltages, strQualities, false);
//   }
//   for (int i = 1; i < numSensors; i++)
//     dataToSend[i] = "";
// }

void getLocalData() {                         // DTA-GTW-00x0000,t°C,%Hs,Vcc,rssi
  String result = "18,48,";
  result += String(readVcc());
  result += ",23";
  dataToSend[0] = result;
}

#pragma endregion Programa Principal

