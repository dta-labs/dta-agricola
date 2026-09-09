#include <LowPower.h>
#include <avr/wdt.h>

#include "configuracion.h"
#include "miscelaneas.h"
#include "sensorSHT4.h"
#include "lora.h"

#pragma region Programa Principal

void setup() {
  Serial.begin(250000);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nSensor de Temperatura y Hr \n[v1.20260905]"));
  Serial.println(F("~ Humedad y temperatura ambiente"));
  Serial.println(F("  - Protocolo: DTA-SHT-0xId,dataType,TTL,Hr,T,Vcc,CS"));
  setupSensors();
  initLoRa();
  Serial.println();
  nextWake = millis() + interval + random(-jitter, jitter);
  wdt_enable(WDTO_8S);
}

void loop() {
  readSHT(t_actual, h_actual);
  if (TEST) {
    t_actual = 0.3;
    h_actual = 30;
  }
  sendData();
  lowPower();
}

void setupSensors() {
  String id = setupSHT();
  id.toUpperCase();
  NODE_ID += TEST ? "F46A000" : id;
  Serial.println(NODE_ID);
}

void sendData() {
  static byte counter = 0;
  static float t_anterior = NAN;
  static float h_anterior = NAN;
  static bool dentroZonaCritica = false;
  bool transmitir = false;
  if (t_actual <= Tmin + 0.5 || t_actual >= Tmax - 0.5) {           // Detectar entrada a zona crítica
    if (!dentroZonaCritica) {
      transmitir = true;                                            // primera vez que entra
      dentroZonaCritica = true;
    } else if (fabs(t_actual - t_anterior) >= 0.2) {
      transmitir = true;                                            // solo si varía ≥0.2 °C dentro de la zona
    }
  } else {
    dentroZonaCritica = false;                                      // salió de la zona crítica
    if (!isnan(t_anterior) && fabs(t_actual - t_anterior) >= 0.5) {
      transmitir = true;                                            // variación normal fuera de zona crítica
    }
  }
  Serial.print(counter == 0 ? F("Tx:\n") : F("."));
  if (transmitir || counter == 0) {
    int intentos = 5;
    do {
      wdt_reset();
      txData(createDataStr());
      delay(500 +  random(50, 1001));
    } while (!receivedConfirmation() && intentos--);
  }
  t_anterior = t_actual;
  h_anterior = h_actual;
  counter = counter < HEARTBEAT * 12 ? counter + 1 : 0;
}

String createDataStr() {
  String dataStr = NODE_ID; 
  dataStr += comma; dataStr += DATA_TYPE; 
  dataStr += comma; dataStr += TTL;
  dataStr += comma; dataStr += String(h_actual, 0);
  dataStr += comma; dataStr += String(t_actual, 1);
  dataStr += comma; dataStr += TEST ? "4.2" : String(getVcc(), 1);
  dataStr += comma; dataStr += String(calculateSum(dataStr));
  return dataStr;
}

void lowPower() {
  wdt_reset();
  Serial.flush();                               // Espera a que se envíe todo
  LoRa.sleep();
  int cycles = (TIMER + random(-1, 2)) * 7.5;   // número de ciclos de 8s
  for (int i = 0; i < cycles; i++) {
    LowPower.powerDown(SLEEP_8S, ADC_OFF, BOD_OFF);
    wdt_reset();
  }
  LoRa.idle();
}

#pragma endregion Programa Principal
