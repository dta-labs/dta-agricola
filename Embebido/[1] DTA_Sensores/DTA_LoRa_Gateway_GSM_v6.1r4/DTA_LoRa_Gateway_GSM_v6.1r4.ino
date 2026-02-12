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

#include "configuracion.h"
#include "miscelaneas.h"
#include "comunicaciones.h"
#include "loraComm.h"

#pragma region Programa Principal

void setup() {
  pinMode(powerLED, OUTPUT);
  setPowerLEDBlink();
  systemWatchDog();
  Serial.begin(19200);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  DBG_PRINTLN(F("\n\nLoRa Gateway Universal v6.1.250806"));
  initLoRa();
  systemWatchDog(); 
  setPowerLEDBlink();
  // resetSIM();
  comunicaciones();
  setPowerLEDBlink();
  RESETDATA(dataToSend, numSensors);
  commTimer = millis();
  // sensorList="0xF46A405,0x10B9CE36,0xF46A38F,0xF46A2F8";
}

void loop() {
  systemWatchDog(); 
  if (isTxTime() || systemStart) {
    txData();
    commTimer = millis();
  } else {
    rxData();
  }
  if (isPowerLEDBlink) setPowerLEDBlink(); else setPowerLEDOn();
  delay(50);
}

bool isTxTime() {
  unsigned long commFrequency = 30000;
  if (operationMode > 0) {
    commFrequency = 2 * operationMode * commFrequency;
  }
  return millis() - commTimer >= commFrequency;
}

void txData() {
  DBG_PRINTLN();
  for(int i = 0; i < numSensors; i++) {
    DBG_PRINT(dataToSend[i]);
    if (i < numSensors - 1) DBG_PRINT(commaChar); 
    else strEmpty;
  }
  DBG_PRINT(F("\n"));
  systemWatchDog(); 
  comunicaciones();
}

void rxData() {
  loraRxData();
  // DBG_PRINT(F("\nMemoria disponible al leer HTTP: ")); DBG_PRINTLN(freeRam());
}

#pragma endregion Programa Principal

