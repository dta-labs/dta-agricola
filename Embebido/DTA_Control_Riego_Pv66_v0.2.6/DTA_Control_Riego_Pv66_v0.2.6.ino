/****************************************************************************
 *                                                                          * 
 *                    Sistemas DTA Serie Pv66 v0.2.6 A                      *
 *                               2023.03.12                                 *
 *                                                                          *
 *   Sensores:                                                              *
 *   - Presión 150psi............. A0                                       *
 *   - Seguridad efecto Hall...... A1                                       *
 *   - Seguridad lectura directa.. D9                                       *
 *   - Comunicación............... D2, D3                      				      *
 *   - GPS........................ D11, D12, D13 (Tarjetas amarillas)       *
 *                                                                          *
 ****************************************************************************/

#pragma region includes

#include <TinyGPS.h>
#include <SoftwareSerial.h>
#include <avr/wdt.h>

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
  Serial.begin(115200);
  Serial.print(F("\n>>> DTA-Agrícola: Serie Pv66 v0.2.6\n"));
  Serial.print(F("    «")); Serial.print(telefono); Serial.print(F("»\n"));
  // wdt_enable(WDTO_8S);
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
    gprs.begin(9600);
    setupGSM();
    comunicaciones();
    setActivationTimers();
    showVars();
    gprs.end();
  }
}

void machineControl() {
  if (statusVar == "ON") {
    activeMachine();
  } else {
    apagar();
    Serial.println(F("> System off!"));
    waitFor(10);
  }
}

void activeMachine() {
  static unsigned long activeTime = 0;
  unsigned long actualTime = millis() - activeTime;
  if (actualTime < activationTimer) {
    Serial.print(F("> Running ")); Serial.println(directionVar == "FF" ? F("forward") : F("reverse"));
    setDirection(); 
    if (getSensors()) {
      digitalWrite(pinActivationTimer, LOW);
      digitalWrite(pinEngGunControl, (endGunVar == "ON") ? (serie == 0 ? LOW : HIGH) : (serie == 0 ? HIGH : LOW));
    } else {
      apagar();
      Serial.print(F("  * "));
      Serial.print(!isVoltage ? F("Voltage")  : 
                  !isSequrity ? F("Sequrity") :
                  !isPresure  ? F("Presure")  :
                  !isPosition ? F("Position") : 
                  F("Unknow"));
      Serial.println(F(" error!"));
    }
  } else {
    unactiveMachine();
  }
  if (actualTime >= 60000) {
    activeTime = millis();
  }
}

void unactiveMachine() {
  static unsigned long unactiveTime = 0;
  if (millis() - unactiveTime < deactivationTimer) {
    Serial.println(F("> Stopped"));
    digitalWrite(pinActivationTimer, HIGH);
    if (!controlSeguridad()) {
      Serial.println(F("> Stopped: Sequrity error!"));
      apagar();
    }
  } else {
    unactiveTime = millis();
  }
}