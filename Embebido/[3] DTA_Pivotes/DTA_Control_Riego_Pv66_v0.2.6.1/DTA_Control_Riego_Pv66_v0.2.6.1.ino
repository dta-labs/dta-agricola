/****************************************************************************
 *                                                                          * 
 *                    Sistemas DTA Serie Pv66 v0.2.6 A                      *
 *                               2024.03.03                                 *
 *                                                                          *
 *   Sensores:                                                              *
 *   - Presión ................... A0                                       *
 *   - Seguridad ................. D9                                       *
 *   - Electricidad .............. D10                                      *
 *   - Comunicación............... D2, D3                      				      *
 *   - GPS........................ D11, D12, D13 (Tarjetas amarillas)       *
 *                                                                          *
 ****************************************************************************/

#pragma region includes

#include <TinyGPS.h>
#include <SoftwareSerial.h>
#include <avr/wdt.h>

#include "SensorKalman.h"
#include "config.h"
#include "sensores.h"
#include "acciones.h"
#include "comunicaciones.h"

#pragma endregion includes

void setup() {
  wdt_disable();
  pinMode(pinIrrigationControl, OUTPUT);
  digitalWrite(pinIrrigationControl, LOW);  // Control de riego Activado
  pinMode(pinSensorVoltaje, INPUT);
  pinMode(pinSensorSeguridad, INPUT);
  pinMode(pinEngGunControl, OUTPUT);
  pinMode(pinActivationTimer, OUTPUT);
  pinMode(pinMotorRR, OUTPUT);
  pinMode(pinMotorFF, OUTPUT);
  apagar();
  controlPosicion();
  sensorKalman.setDistance(commFrec);
  Serial.begin(115200);
  Serial.print(F("\n>>> DTA-Agrícola: Serie Pv66 v0.2.6.251114 A\n"));
  setupGSM();
  if (telefono != strEmpty) { Serial.print(F("    «")); Serial.print(telefono); Serial.print(F("»\n")); }
  // wdt_enable(WDTO_8S);
  dtKalman = millis();
}

void loop(){
  communications();
  machineControl();
  waitFor(1);
}

void communications() {
  static unsigned long lastCommunication = 0;
  if (millis() - lastCommunication > commFrec * 1000) {
    lastCommunication = millis();
    comunicaciones();
    setActivationTimers();
    showVars();
  }
}

void machineControl() {
  if (statusVar == "ON") {
    static unsigned long activeTime = 0;
    unsigned long actualTime = millis() - activeTime;
    if (actualTime < activationTimer) {
      activeMachine();
    } else {
      unactiveMachine();
    }
    if (actualTime >= 60000) { activeTime = millis(); }
  } else {
    apagar();
    Serial.println(F("> System off!"));
    waitFor(9);
  }
}

void activeMachine() {
  setDirection(); 
  if (getSensors()) {
    if (isPosition && isPresure) {
      Serial.println(directionVar == "FF" ? F("> Running: forward") : F("> Running: reverse"));
      digitalWrite(pinActivationTimer, LOW);
      digitalWrite(pinEngGunControl, (endGunVar == "ON") ? (serie == 0 ? LOW : HIGH) : (serie == 0 ? HIGH : LOW));
    } else {
      digitalWrite(pinActivationTimer, HIGH);
      digitalWrite(pinEngGunControl, (endGunVar == "ON") ? (serie == 0 ? HIGH : LOW) : (serie == 0 ? LOW : HIGH));
      Serial.println(!isPresure ? F("> Stopped: Insuficient presure!") : F("> Stopped: Position error!"));
      statusVar = !isPosition ? "OFF" : statusVar;
      // if ((lat_actual != 0.0f || lon_actual != 0.0f) && !isPosition) {  // <- Esto qué es???
      //   statusVar = !isPosition ? F("OFF") : F("ON");
      // }
    }
  } else {
    apagar();
    statusVar = !isVoltage ? statusVar : "OFF";
    Serial.println(!isVoltage ? F("> Stopped: Voltage error!") : F("> Stopped: Sequrity error!"));
  }
}

void unactiveMachine() {
  static unsigned long unactiveTime = 0;
  if (!controlSeguridad()) {
    Serial.print(F(": Sequrity error!"));
    apagar();
    statusVar = "OFF";
  }
  statusVar = !controlPosicion() ? "OFF" : statusVar;
  if (millis() - unactiveTime < deactivationTimer) {
    Serial.print(F("> Stopped"));
    digitalWrite(pinActivationTimer, HIGH);
    Serial.println();
  } else {
    unactiveTime = millis();
  }
}
