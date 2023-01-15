/****************************************************************************
 *                                                                          * 
 *                    Sistemas DTA Serie Pv66 v0.2.5 A                      *
 *                               2023.01.14                                 *
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
  ssGPS.begin(9600);
  Serial.print(F("\n>>> DTA-Agrícola: Serie Pv66 v0.2.5 A\n"));
  Serial.print(F("    «")); Serial.print(telefono); Serial.print(F("»\n"));
  // readEEPROM();
  setActivationTimer();
  wdt_enable(WDTO_8S);
  actualTimer = millis();
}

void loop() {
  unsigned long deltaTimer = millis() - actualTimer;
  Serial.print(deltaTimer); 
  switch (definirEstado(deltaTimer)) {
    case NUEVOCICLO:
      estadoNuevoCiclo();
      break;
    case SENSORES:
      estadoSensores();
      break;
    case AVANZANDO:
      estadoActivadoAvanzando();
      break;
    case DETENIDO:
      estadoActivadoDetenido();
      break;
    case APAGADO:
      estadoApagado();
      break;
    case COMUNICACION:
      estadoComunicaciones(deltaTimer);
      break;
    default:
      Serial.println(F(": Inicial"));
      estadoActual = Estado::INICIAL;
      break;
  }
  systemWatchDog();
}

Estado definirEstado(unsigned long deltaTimer) {
  int posicion = 0;
  if (estadoActual != Estado::NUEVOCICLO && estadoActual != Estado::COMUNICACION) {
    if (deltaTimer >= 60000) { posicion = 0; }                                                              // Nuevo ciclo
    else if (statusVar == "ON" && activationTimer > 0 && deltaTimer <= activationTimer) { posicion = 1; }   // Avanzar
    else if (statusVar == "ON" && deactivationTimer > 0 && deltaTimer > activationTimer && 
            deltaTimer - activationTimer > 0 && 
            deltaTimer - activationTimer <= deactivationTimer) { posicion = 2; }                            // Detener
    else if (statusVar == "OFF" && deltaTimer < 60000) { posicion = 3; }                                    // Apagar
    return matrizEstados[estadoActual][posicion];                                                           // Nuevo estado
  }
  return estadoActual;                                                                                      // Estado actual
}

void estadoNuevoCiclo() {
  estadoActual = Estado::NUEVOCICLO;
  actualTimer = millis();
  Serial.print(F("\n> New loop \n"));
  commFrec = 0;
  estadoActual = Estado::INICIAL;
}

void estadoSensores() {
  estadoActual = Estado::SENSORES;
  Serial.println(F(": Sensores"));
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
  estadoActual = Estado::AVANZANDO;
  Serial.println(F(": Avanzando"));
  digitalWrite(pinActivationTimer, LOW);
  digitalWrite(pinEngGunControl, (endGunVar == "ON") ? (serie == 0 ? LOW : HIGH) : (serie == 0 ? HIGH : LOW));
}

void estadoActivadoDetenido() {
  estadoActual = Estado::DETENIDO;
  Serial.println(F(": Deteneido"));
  statusVar = (activationTimer == 0 && autoreverseVar == "OFF") ? "OFF" : statusVar;  // Control de apagado
  digitalWrite(pinActivationTimer, deactivationTimer > 0 ? HIGH : LOW);
}

void estadoApagado() {
  estadoActual = Estado::APAGADO;
  Serial.println(F(": Apagado"));
  apagar();
  waitFor(5);
}

void estadoComunicaciones(unsigned long deltaTimer) {
  estadoActual = Estado::COMUNICACION;
  Serial.println(F(": Comunicación"));
  if (commAvailability(deltaTimer)) {
    setupGSM();
    comunicaciones();
    setActivationTimer();
    showVars();
    commFrec = commFrec + 1 == 2 ? 0 : commFrec + 1;
  }
  estadoActual = Estado::INICIAL;
}

bool commAvailability(unsigned long deltaTimer) {
  return commFrec == 0 && deltaTimer < 30000 && (activationTimer - deltaTimer > 9000 || deltaTimer > activationTimer) ? true : 
         commFrec == 1 && deltaTimer > 30000 && (activationTimer - deltaTimer > 9000 || 
         (deltaTimer > activationTimer && activationTimer - deltaTimer < 51000)) ? true : false;
  // Serial.print("commFrec: "); Serial.print(commFrec); Serial.print(" deltaTimer: "); Serial.print(deltaTimer); Serial.print(" Comm: "); Serial.println(result ? "true" : "false");
  // return result;
}
