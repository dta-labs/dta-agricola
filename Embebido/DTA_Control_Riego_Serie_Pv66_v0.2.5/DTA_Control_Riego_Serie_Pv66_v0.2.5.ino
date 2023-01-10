/****************************************************************************
 *                                                                          * 
 *                    Sistemas DTA Serie Pv66 v0.2.5 A                      *
 *                               2023.01.03                                 *
 *                                                                          *
 *   Sensores:                                                              *
 *   - Presión 150psi............. A0                                       *
 *   - Seguridad efecto Hall...... A1                                       *
 *   - Seguridad lectura directa.. D9                                       *
 *   - Comunicación............... D2, D3                      				      *
 *   - GPS........................ D11, D12, D13 (Tarjetas amarillas)       *
 *                                                                          *
 ****************************************************************************/

#pragma region inclues

#include <SoftwareSerial.h>
#include "analogo.h"
// #include <EEPROM.h>
#include <avr/wdt.h>
#include <TinyGPS.h>

#include "config.h"
// #include "eeprom.h"
#include "sensores.h"
#include "comunicaciones.h"
#include "acciones.h"

#pragma endregion inclues

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
  ssGPS.begin(9600);
  Serial.println(F("\n>>> DTA-Agrícola: Serie Pv66 v0.2.5 A"));
  Serial.print(F("    «"));
  Serial.print(telefono);
  Serial.println(F("»"));
  // readEEPROM();
  wdt_enable(WDTO_8S);
  actualTimer = millis();
}

void loop() {
  switch (definirEstado()) {
    case NUEVOCICLO:
      estadoActual = Estado::SENSORES;
      estadoNuevoCiclo();
      break;
    case SENSORES:
      estadoActual = Estado::SENSORES;
      estadoSensores();
      break;
    case AVANZANDO:
      estadoActual = Estado::AVANZANDO;
      estadoActivadoAvanzando();
      break;
    case DETENIDO:
      estadoActual = Estado::DETENIDO;
      estadoActivadoDetenido();
      break;
    case APAGADO:
      estadoActual = Estado::APAGADO;
      estadoApagado();
      break;
    case COMUNICACION:
      estadoActual = Estado::COMUNICACION;
      estadoComunicaciones();
      break;
    default:
      estadoActual = Estado::INICIAL;
      break;
  }
  systemWatchDog();
}

Estado definirEstado() {
  unsigned long deltaTimer = millis() - actualTimer;
  courrentTimer = deltaTimer;
  int posicion = 0;
  // Serial.print("---> estadoActual: "); Serial.println(estadoActual);
  if (estadoActual == INICIAL || estadoActual == SENSORES) {
    if (deltaTimer >= 60000) { posicion = 0; }                                                              // Nuevo ciclo
    else if (statusVar == "ON" && activationTimer > 0 && deltaTimer <= activationTimer) { posicion = 1; }   // Avanzar
    else if (statusVar == "ON" && deactivationTimer > 0 && deltaTimer > activationTimer && 
             deltaTimer - activationTimer > 0 &&
             deltaTimer - activationTimer <= deactivationTimer) { posicion = 2; }                           // Detener
    else if (commAvailability(deltaTimer)) { posicion = 3; }                                                // Comunicación
    else if (statusVar == "OFF" && deltaTimer < 60000) { posicion = 4; }                                    // Apagar
    return matrizEstados[estadoActual][posicion];                                                           // Nuevo estado
  }
  return estadoActual;                                                                                      // Estado actual
}

void estadoNuevoCiclo() {
  Serial.println(F("\n> New loop\n"));
  setActivationTimer();
  showVars();
  estadoActual = Estado::INICIAL;
  actualTimer = millis();
}

void estadoSensores() {
  Serial.println(F("Sensores"));
  if (statusVar == "ON") { setDirection(); }
  getSensors();
  if (!isVoltage || !isSequrity || !isPresure || !isPosition) {
    Serial.print(F("     "));
    Serial.print(!isVoltage ? F("Voltage") : !isSequrity ? F("Sequrity")
                                           : !isPresure  ? F("Presure")
                                           : !isPosition ? F("Position")
                                                         : F("Unknow"));
    Serial.println(F(" error!"));
    estadoActual = Estado::APAGADO;
  }
}

void estadoActivadoAvanzando() {
  Serial.println(F("Avanzando"));
  digitalWrite(pinActivationTimer, LOW);
  digitalWrite(pinEngGunControl, (endGunVar == "ON") ? (serie == 0 ? LOW : HIGH) : (serie == 0 ? HIGH : LOW));
  if (commAvailability(courrentTimer)) estadoComunicaciones();
  estadoActual = Estado::INICIAL;
}

void estadoActivadoDetenido() {
  Serial.println(F("Detenido"));
  statusVar = (activationTimer == 0 && autoreverseVar == "OFF") ? "OFF" : statusVar;  // Control de apagado
  digitalWrite(pinActivationTimer, deactivationTimer > 0 ? HIGH : LOW);
  if (commAvailability(courrentTimer)) estadoComunicaciones();
  estadoActual = Estado::INICIAL;
}

void estadoApagado() {
  Serial.println(F("Apagado"));
  apagar();
  waitFor(5);
  estadoActual = Estado::INICIAL;
}

void estadoComunicaciones() {
  setupGSM();
  comunicaciones();
  setActivationTimer();
  showVars();
  commFrec = commFrec + 1 == 2 ? 0 : commFrec + 1;
  estadoActual = Estado::INICIAL;
}

bool commAvailability(unsigned long deltaTimer) {
  return commFrec == 0 && deltaTimer < 30000 && (activationTimer - deltaTimer > 9000 || deltaTimer > activationTimer) ? true : 
         commFrec == 1 && deltaTimer > 30000 && (activationTimer - deltaTimer > 9000 || 
         (deltaTimer > activationTimer && activationTimer - deltaTimer < 51000)) ? true : false;
}
