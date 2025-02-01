#include <SPI.h>
#include <LoRa.h>
#include <avr/wdt.h>
#include <Adafruit_SHT4x.h>
#include "LowPower.h"
#include "miscelaneas.h"
#include "configuracion.h"
#include "loraComm.h"
#include "comunicaciones.h"
#include "analogicSensor.h"

#pragma region Programa Principal

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(19200);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nLoRa Gateway Universal v6.0130"));
  initLoRa();
  resetData();
  comunicaciones("", true);
  commTimer = millis();
}

void loop() {
  rxData();
  txData();
  delay(500);
}

void txData() {
  unsigned long commFrequence = TIMER * 60000;
  if (millis() - commTimer > commFrequence) {
    commTimer = millis();
    comunicaciones(getTxData(sensorList, dataToSend), false);
    resetData();
  }
}

String getTxData(String* _sensorList, String* _dataToSend) {
    String strIds = F("[");
    String strToSend = F("[");
    for (int i = 0; i < 10; i++) {
      strIds += _sensorList[i];
      strIds += (i < 9) ? "," : "";
      strToSend += dataToSend[i];
      strToSend += (i < 9) ? "," : "";
    }
    strIds += F("]");
    strToSend += F("]");
    Serial.print(F("Ínices: ")); Serial.println(strIds);
    Serial.print(F("Datos leidos: ")); Serial.println(strToSend);
    return strToSend;
}

void resetData() {
  for (int i = 0; i < 10; i++) dataToSend[i] = "";
}

#pragma endregion Programa Principal

