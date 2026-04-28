#include <SPI.h>
#include <LowPower.h>
#include <avr/wdt.h>

#include "configuracion.h"
#include "miscelaneas.h"
#include "estadisticas.h"
#include "sensorHW390.h"
#include "sensorDS.h"
#include "sensorSHT4.h"
#include "lora.h"

#pragma region Programa Principal

void setup() {
  pinMode(LINK, INPUT_PULLUP);
  pinMode(VCC, OUTPUT);
  analogReference(DEFAULT);
  digitalWrite(A1, LOW);
  Serial.begin(250000);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nMicroestación agrícola STH v7.3r2"));
  Serial.println(F("~ Sonda de humedad del suelo"));
  Serial.println(F("~ Humedad y temperatura ambiente"));
  Serial.println(F("  • Protocolo: DTA-SHT4-0xId,Ms,Hr,T°C,Vcc,CS"));
  Serial.println(F("  • Sensor de humedad del suelo inicializado correctamente..."));
  setupSensors();
  initLoRa();
  Serial.println();
  wdt_enable(WDTO_8S);
}

void setupSensors() {
  String id = setupDS();
  id = id == noSensor ? setupSHT() : id;
  id.toUpperCase();
  NODE_ID += id;
  Serial.println(NODE_ID);
}

void loop() {
  wdt_reset();
  if (NODE_ID.indexOf(NODE_ID_BASE + noSensor) != 0) {
    if (sensorType == SHT) {
      readSHT();
    } else {
      getTemperature();
    }
  }
  wdt_reset();
  moisture = getMoisture();
  bool isConfirm = false;
  if (txPOWER > 10 && getVcc() > 3.0) {
    txPOWER -= 2;
    LoRa.setTxPower(txPOWER);
  }
  byte iter = 0;
  do {
    wdt_reset();
    txData(createDataStr());
    iter++;
    wdt_reset();
    isConfirm = waitConfirmation();
    if (!isConfirm && txPOWER < 20) {
      txPOWER += 2;
      LoRa.setTxPower(txPOWER);
    }
  } while (!isConfirm && iter < 5 && (getVcc() > 3.0 || iter < 1));
  lowPower();
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

String createDataStr_() {
  char buffer[64];
  snprintf(buffer, sizeof(buffer), "%s,%d,%d,%d,%.1f",
           NODE_ID.c_str(), moisture, h_actual, t_actual, getVcc());
  int checksum = calculateSum(buffer);
  snprintf(buffer + strlen(buffer), sizeof(buffer) - strlen(buffer), ",%d", checksum);
  return String(buffer);
}

void lowPower() {
  Serial.flush();             // Espera a que se envíe todo
  int cycles = TIMER * 7.5;   // número de ciclos de 8s
  for (int i = 0; i < cycles; i++) {
    wdt_reset();
    LowPower.powerDown(SLEEP_8S, ADC_OFF, BOD_OFF);
    wdt_reset();
    if (digitalRead(LINK) == LOW) break;
  }
}

#pragma endregion Programa Principal
