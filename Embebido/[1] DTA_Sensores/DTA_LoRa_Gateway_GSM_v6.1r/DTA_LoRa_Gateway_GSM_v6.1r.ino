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
  systemWatchDog();
  Serial.begin(19200);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  DBG_PRINTLN(F("\n\nLoRa Gateway Universal v6.1.0618"));
  initLoRa();
  // resetSIM();
  comunicaciones();
  resetData();
  commTimer = millis();
}

void loop() {
  systemWatchDog(); 
  if (isTxTime()) {
    txData();
    commTimer = millis();
  } else {
    rxData();
  }
  delay(5000);
}

bool isTxTime() {
  unsigned long commFrequence = 30000;
  if (operationMode > 0) {
    commFrequence = 2 * operationMode * commFrequence;
  }
  return millis() - commTimer >= commFrequence;
}

void rxData() {
  LoRa.idle();
  loraRxData();
}

void txData() {
  LoRa.sleep();
  delay(500);
  comunicaciones();
}

#pragma endregion Programa Principal

