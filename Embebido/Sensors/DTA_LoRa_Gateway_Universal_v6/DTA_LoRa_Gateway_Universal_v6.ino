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
  Serial.println("\n\nLoRa Gateway Universal v6.0\n");
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
  for (int i = 0; i < 10; i++) dataToSend[i] = "";
}

#pragma endregion Programa Principal

