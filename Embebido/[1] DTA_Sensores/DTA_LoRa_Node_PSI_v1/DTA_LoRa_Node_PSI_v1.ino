#include <SPI.h>
#include <LowPower.h>
#include <avr/wdt.h>

#include "configuracion.h"
#include "miscelaneas.h"
#include "estadisticas.h"
#include "sensorAnalog.h"
#include "sensorDS.h"
#include "sensorSHT4.h"
#include "lora.h"

#pragma region Programa Principal

void setup() {
  analogReference(DEFAULT);
  Serial.begin(250000);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nSensor analógico Aire/Agua/Aceite v1"));
  Serial.println(F("~ Presión PSI"));
  Serial.println(F("  • Protocolo: DTA-PSI-0xId,psi,-1,-1,Vcc,CS"));
  setupSensors();
  initLoRa();
  Serial.println();
}

void setupSensors() {
  pinMode(sensorPin, INPUT);
  NODE_ID += "0001"; 
  Serial.println("  • Sensor PSI: " + NODE_ID);
}

void loop() {
  float psi = readAnalogicData();
  txData(createDataStr(psi));
  if (waitConfirmation()) lowPower();
}

String createDataStr(float psi) {
  String dataStr = NODE_ID;
  dataStr += comma;
  dataStr += String(psi);
  dataStr += comma;
  dataStr += String(-1);
  dataStr += comma;
  dataStr += String(-1);
  dataStr += comma;
  dataStr += String(getVcc(), 1);
  dataStr += comma;
  dataStr += String(calculateSum(dataStr));
  return dataStr;
}

void lowPower() {
  delay(5000);
  int minutes = TIMER * 15;
  for (int i = 0; i < minutes; i++) {
    LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
  }
}

#pragma endregion Programa Principal
