#include <SPI.h>
#include <LowPower.h>

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
  Serial.begin(19200);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nMicroestación agrícola STH v7.0726L"));
  Serial.println(F("~ Sonda de humedad del suelo"));
  Serial.println(F("~ Humedad y temperatura ambiente"));
  Serial.println(F("  • Protocolo: DTA-SHT4-0xId,Ms,Hr,T°C,Vcc,CS"));
  initLoRa();
  setupSensors();
  Serial.println(F("  • Sensor de humedad del suelo inicializado correctamente..."));
  Serial.println(F("~ Configuración:"));
  Serial.print(F("  • ID: ")); Serial.println(NODE_ID);
  Serial.print(F("  • valAire: ")); Serial.println(valAire);
  Serial.print(F("  • valAgua: ")); Serial.println(valAgua);Serial.println(); 
}

void setupSensors() {
  String id;
  if (sensorType == "SHT") {
    setupSHT();
    id = String(sht4.readSerial(), HEX);
  } else {
    id = setupDS();
    // id = getAddress();
  }
  id.toUpperCase();
  NODE_ID += id;
}

void loop() {
  if (sensorType == "SHT") {
    readSHT();
  } else {
    getTemperature();
  }
  moisture = getMoisture();
  txData(createDataStr());
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
  int estado = digitalRead(LINK); // Leer el estado del pin
  delay(5000);
  if (estado == HIGH) {
    LoRa.idle();
    int minutes = TIMER * 15;
    for (int i = 0; i < minutes; i++) {
      LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
      if(digitalRead(LINK) == LOW) break;
    }
  } 
}

#pragma endregion Programa Principal
