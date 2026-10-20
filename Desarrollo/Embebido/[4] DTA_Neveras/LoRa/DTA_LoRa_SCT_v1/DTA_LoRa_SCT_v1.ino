#include <LowPower.h>
#include <avr/wdt.h>

#include "configuracion.h"
#include "miscelaneas.h"
#include "sensorSCT.h"
#include "lora.h"

#pragma region Programa Principal

void setup() {
  Serial.begin(250000);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nSensor de Irms doble fase \n[v1.20260826]"));
  Serial.println(F("~ Corriente en 2 fases"));
  Serial.println(F("  - Protocolo: DTA-SCT-0xId,Hr,T,Vcc,CS"));
  setupSensors();
  initLoRa();
  Serial.println();
  nextWake = millis() + interval + random(-jitter, jitter);
  wdt_enable(WDTO_8S);
}

void loop() {
  i_actual[0] = getIrms(0);
  i_actual[1] = getIrms(1);
  sendData();
  lowPower();
}

void setupSensors() {
  String id = setupSCT();
  id.toUpperCase();
  NODE_ID += id;
  Serial.println("  - " + NODE_ID);
}

void sendData() {
  static byte counter = 0;
  static float i_anterior[2] = {NAN, NAN};
  bool transmitir = false;
  if (!isnan(i_anterior[0]) && fabs(i_actual[0] - i_anterior[0]) >= 0.5) {
    transmitir = true;                                            // variación normal fuera de zona crítica
  }
  if (!isnan(i_anterior[1]) && fabs(i_actual[1] - i_anterior[1]) >= 0.5) {
    transmitir = true;                                            // variación normal fuera de zona crítica
  }
  if (transmitir || counter == 0) {
    int intentos = 10;
    do {
      wdt_reset();
      txData(createDataStr());
      delay(500 +  random(50, 101));
    } while (!receivedConfirmation() && intentos--);
  }
  i_anterior[0] = i_actual[0];
  i_anterior[1] = i_actual[1];
  counter = counter < HEARTBEAT * 12 ? counter + 1 : 0;
}

String createDataStr() {
  String dataStr = NODE_ID; 
  dataStr += comma; dataStr += DATA_TYPE; 
  dataStr += comma; dataStr += TTL;
  dataStr += comma; dataStr += String(i_actual[0], 1);
  dataStr += comma; dataStr += String(i_actual[1], 1);
  dataStr += comma; dataStr += String(getVcc(), 1);
  dataStr += comma; dataStr += String(calculateSum(dataStr));
  return dataStr;
}

void lowPower() {
  wdt_reset();
  Serial.flush();                               // Espera a que se envíe todo
  int cycles = (TIMER + random(-1, 2)) * 7.5;   // número de ciclos de 8s
  for (int i = 0; i < cycles; i++) {
    LowPower.powerDown(SLEEP_8S, ADC_OFF, BOD_OFF);
    wdt_reset();
  }
}

#pragma endregion Programa Principal
