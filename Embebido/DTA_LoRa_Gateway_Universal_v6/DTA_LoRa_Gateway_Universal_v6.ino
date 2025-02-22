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
  Serial.println(F("\n\nLoRa Gateway Universal v6.0202"));
  initLoRa();
  resetData();
  comunicaciones(strEmpty);
  commTimer = millis();
}

void loop() {
  systemWatchDog(); 
  rxData();
  txData();
  delay(500);
}

void txData() {
  unsigned long commFrequence = 30000;
  switch (operationMode) {
    case 0:                         // 30 segundos, modo descubrimiento
      commFrequence =    30000;
      break;
    case 1:                         // 15 minutos
      commFrequence =   900000;
      break;
    case 2:                         // 30 minutos
      commFrequence =  1800000;
      break;
    case 3:                         // 45 minutos
      commFrequence =  2700000;
      break;
    case 4:                         // 1 hora
      commFrequence =  3600000;
      break;
    case 5:                         // 1 1/2 horas
      commFrequence =  5400000;
      break;
    case 6:                         // 2 horas
      commFrequence =  7200000;
      break;
    case 7:                         // 8 horas
      commFrequence = 28800000;
      break;
    case 8:                         // 12 horas
      commFrequence = 43200000;
      break;
    case 9:                         // 24 horas
      commFrequence = 86400000;
      break;
  }
  commFrequence /= 2;
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
  Serial.print(F("  └─ Datos leidos: ")); Serial.println(strToSend);
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

