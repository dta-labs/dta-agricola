#include <SPI.h>
#include <LowPower.h>
#include <avr/wdt.h>

#include "configuracion.h"
#include "miscelaneas.h"
#include "estadisticas.h"
#include "sensorWM.h"
#include "sensorDS.h"
#include "sensorSHT4.h"
#include "lora.h"

#pragma region Programa Principal

void setup() {
  pinMode(LINK, INPUT_PULLUP);
  analogReference(DEFAULT);
  Serial.begin(250000);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nMicroestación agrícola STH v8"));
  Serial.println(F("~ Sonda de humedad del suelo"));
  Serial.println(F("~ Humedad y temperatura ambiente"));
  Serial.println(F("  • Protocolo: DTA-WM-0xId,Ms,Hr,T,Vcc,CS"));
  Serial.println(F("  • Sensor de humedad del suelo inicializado correctamente..."));
  setupSensors();
  initLoRa();
  Serial.println();
  wdt_enable(WDTO_8S);
}

void setupSensors() {
  setupWM();
  String id = setupDS();
  id = id == noSensor ? setupSHT() : id;
  id.toUpperCase();
  NODE_ID += id; 
  Serial.println(NODE_ID);
}

void loop() {
  wdt_reset();
  if (NODE_ID != noSensor) {
    if (sensorType == SHT) {
      readSHT();
    } else {
      // Serial.println(F("Leyendo temperatura..."));
      getTemperature();
    }
  }
  wdt_reset();
  // Serial.println(F("Leyendo humedad..."));
  moisture = getMoisture();
  wdt_reset();
  txData(createDataStr());
  wdt_reset();
  if (waitConfirmation()) lowPower();
}

String createDataStr() {
  String dataStr = NODE_ID;
  dataStr += comma;
  dataStr += String(moisture);
  dataStr += comma;
  dataStr += String(h_actual, 0);
  dataStr += comma;
  dataStr += String(t_actual, 1);
  dataStr += comma;
  dataStr += String(getVcc(), 1);
  dataStr += comma;
  dataStr += String(calculateSum(dataStr));
  return dataStr;
}

void lowPower() {
  // wdt_disable();
  int estado = digitalRead(LINK); // Leer el estado del pin
  delay(5000);
  if (estado == HIGH) {
    // LoRa.idle();
    int minutes = TIMER * 15;
    for (int i = 0; i < minutes; i++) {
      wdt_reset();
      LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
      wdt_reset();
      if(digitalRead(LINK) == LOW) break;
    }
  } 
  // wdt_enable(WDTO_8S);
}

#pragma endregion Programa Principal
