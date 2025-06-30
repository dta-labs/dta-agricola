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
  // if (isPowerLEDBlink) setPowerLEDBlink();
  systemWatchDog();
  Serial.begin(19200);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  DBG_PRINTLN(F("\n\nLoRa Gateway Universal v6.1.0618"));
  initLoRa();
  // if (isPowerLEDBlink) setPowerLEDBlink();
  resetSIM();
  comunicaciones();
  // if (isPowerLEDBlink) setPowerLEDBlink();
  resetData();
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
  if (isPowerLEDBlink) setPowerLEDBlink();
  delay(50);
}

bool isTxTime() {
  unsigned long commFrequence = 30000;
  if (operationMode > 0) {
    commFrequence = 2 * operationMode * commFrequence;
  }
  return millis() - commTimer >= commFrequence;
}

void txData() {
  // LoRa.sleep();
  // delay(500);
  DBG_PRINTLN();
  for(int i = 0; i < numSensors; i++) {
    DBG_PRINT(dataToSend[i]);
    if (i < numSensors - 1) DBG_PRINT(commaChar); 
    else strEmpty;
  }
  DBG_PRINT(F("\n"));
  comunicaciones();
}

void rxData() {
  // LoRa.idle();
  loraRxData();
  // LoRa.sleep();
  // DBG_PRINT(F("\nMemoria disponible al leer HTTP: ")); DBG_PRINTLN(freeRam());
}

#pragma endregion Programa Principal

