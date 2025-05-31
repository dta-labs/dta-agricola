
#define DEBUG

#if defined DEBUG
#define DBG_PRINT(x) Serial.print(x)
#define DBG_PRINTDEC(x) Serial.print(x, DEC)
#define DBG_PRINTLN(x) Serial.println(x)
#else
#define DBG_PRINT(x)
#define DBG_PRINTDEC(x)
#define DBG_PRINTLN(x)
#endif

#include <LoRa.h>
#include "LowPower.h"
#include "miscelaneas.h"
#include "configuracion.h"
#include "loraComm.h"
#include "comunicaciones.h"

#pragma region Programa Principal

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(19200);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  DBG_PRINTLN(F("\n\nLoRa Gateway Universal v6.1.0325"));
  initLoRa();
  resetData();
  comunicaciones(strEmpty);
  commTimer = millis();
}

void loop() {
  systemWatchDog(); 
  loraRxData();
  txData();
  delay(500);
}

void txData() {
  unsigned long commFrequence = 15000;
  if (operationMode > 0) {
    commFrequence = 2 * commFrequence * operationMode;
  }
  if (millis() - commTimer > commFrequence) {
    commTimer = millis();
    comunicaciones(getTxData());
    resetData();
  }
}

String getTxData() {
  String strIds = strEmpty;
  String strToSend = strEmpty;
  for (int i = 0; i < numSensors; i++) {
    strIds += sensorList[i];
    strIds += (i < numSensors - 1) ? commaChar : strEmpty;
    strToSend += dataToSend[i];
    strToSend += (i < numSensors - 1) ? commaChar : strEmpty;
  }
  strToSend = strToSend == F(",,,,") ? strEmpty : strToSend;
  DBG_PRINT(F("\n  └─ Datos leidos: ")); DBG_PRINTLN(strToSend);
  return strToSend;
}

void initVariables() {
  for (int i = 0; i < numSensors; i++) {
    dataToSend[i] = strEmpty;
    sensorList[i] = baseAddress;
  }
}

void resetData() {
  for (int i = 0; i < numSensors; i++) dataToSend[i] = strEmpty;
}

#pragma endregion Programa Principal

