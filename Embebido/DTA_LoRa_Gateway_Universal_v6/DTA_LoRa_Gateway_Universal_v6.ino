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
  rxData();
  txData();
  delay(500);
}

void txData() {
  unsigned long factor = 30000;     // 30 segundos, modo descubrimiento
  switch (operationMode) {
    case 0:                         // 30 segundos, modo descubrimiento
      factor =    30000;
      break;
    case 1:                         // 15 minutos
      factor =   900000;
      break;
    case 2:                         // 30 minutos
      factor =  1800000;
      break;
    case 3:                         // 45 minutos
      factor =  2700000;
      break;
    case 4:                         // 1 hora
      factor =  3600000;
      break;
    case 5:                         // 1 1/2 horas
      factor =  5400000;
      break;
    case 6:                         // 2 horas
      factor =  7200000;
      break;
    case 7:                         // 8 horas
      factor = 28800000;
      break;
    case 8:                         // 12 horas
      factor = 43200000;
      break;
    case 9:                         // 24 horas
      factor = 86400000;
      break;
  }
  unsigned long commFrequence = factor;
  if (millis() - commTimer > commFrequence) {
    commTimer = millis();
    comunicaciones(getTxData());
    resetData();
  }
}

String getTxData() {
  String strIds = strEmpty;
  String strToSend = strEmpty;
  for (int i = 0; i < 5; i++) {
    strIds += sensorList[i];
    strIds += (i < 4) ? commaChar : strEmpty;
    strToSend += dataToSend[i];
    strToSend += (i < 4) ? commaChar : strEmpty;
  }
  strToSend = strToSend == F(",,,,") ? strEmpty : strToSend;
  Serial.print(F("\n  ├─ Ínices: ")); Serial.println(strIds);
  Serial.print(F("  └─ Datos leidos: ")); Serial.println(strToSend);
  return strToSend;
}

void initVariables() {
  for (int i = 0; i < 5; i++) {
    dataToSend[i] = strEmpty;
    sensorList[i] = baseAddress;
  }
}

void resetData() {
  for (int i = 0; i < 5; i++) dataToSend[i] = strEmpty;
}

#pragma endregion Programa Principal

