#include <SPI.h>
#include <LowPower.h>
#include <avr/wdt.h>

#include "configuracion.h"
#include "miscelaneas.h"
#include "sensorWM.h"
#include "sensorDS.h"
#include "sensorSHT4.h"
#include "lora.h"

#pragma region Programa Principal

void setup() {
  analogReference(DEFAULT);
  Serial.begin(250000);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nSonda Ms, Hr y Temp \n[2da Generación] \n[v1.20261102]"));
  Serial.println(F("~ Irrómetro WM x 1"));
  Serial.println(F("~ Humedad y temperatura ambiente"));
  Serial.println(F("  - Protocolo: DTA-WM1-0xId,Ms,Hr,T,Vcc,CS"));
  setupSensors();
  initLoRa();
  Serial.println();
  wdt_enable(WDTO_8S);
}

void loop() {
  if (NODE_ID.indexOf(NODE_ID_BASE + noSensor) != 0) {
    readSensorsValues();
    sendData();
  }
  lowPower();
}

void setupSensors() {
  setupWM();
  String id = setupDS();
  id = id == noSensor ? setupSHT() : id;
  id.toUpperCase();
  NODE_ID += id;
  if (TEST) {
    sensorType = DS;
    NODE_ID = NODE_ID_TEST;
  } 
  Serial.println(NODE_ID);
}

void readSensorsValues() {
  wdt_reset();
  if (sensorType == SHT) {
    readSHT(t_actual, h_actual);
  } else {
    t_actual = getTemperature(t_actual);
    if (TEST) t_actual = 12.5;
  }
  moisture = getMoisture();
}

void sendData() {
  String txDataStr = createDataStr();
  for (int iter = 0; iter < 3; iter++) {
    wdt_reset();
    txData(txDataStr);
    if (receivedConfirmation()) return;
  }
}

String createDataStr() {
  String dataStr = NODE_ID; 
  dataStr += comma; dataStr += DATA_TYPE; 
  dataStr += comma; dataStr += TTL;
  dataStr += comma; dataStr += String(moisture);
  dataStr += comma; dataStr += String(h_actual, 0);
  dataStr += comma; dataStr += String(t_actual, 1);
  dataStr += comma; dataStr += TEST ? "4.2" : String(getVcc(), 1);
  dataStr += comma; dataStr += String(calculateSum(dataStr));
  return dataStr;
}

void lowPower() {
  wdt_reset();
  Serial.flush();                                     // Espera a que se envíe todo
  LoRa.sleep();
  int JITTER = TIMER > 5 ? random(-1, 2) : 0;         // Agregar aleatoriedad 
  int cycles = (TIMER + JITTER) * 7.5;                // número de ciclos de 8s
  for (int i = 0; i < cycles; i++) {
    LowPower.powerDown(SLEEP_8S, ADC_OFF, BOD_OFF);
    wdt_reset();
  }
}

#pragma endregion Programa Principal
