/****************************************************************
 *                                                              *
 *               Sistemas DTA Serie AGxx v0.2.3 A               *
 *                                                              *
 *   Automatización de Aspersión/Goteo/Jardinería/Paisajismo    *
 *   ~ Salidas:                                                 *
 *     - 7 canales de 24V alterna                               *
 *     - 1 interruptor multipropósito 110V/220V 10A             *
 *   ~ Entradas:                                                *
 *     - Sensor de presión                                      *
 *     - Sensor de voltage                                      *
 *   ~ Comunicación GSM                                         *
 *                                                              *
 *  Configuraciones: {Rx, Tx, Plots, Pais, Lada, Número}        *
 *                                                              *
 ****************************************************************/

#include <SoftwareSerial.h>
#include <EEPROM.h>

#include "miscelaneas.h"
#include "configuracion.h"
#include "comunicaciones.h"

void setup() {
  Serial.begin(115200);
  pinMode(pinBomba, OUTPUT);
  for (byte i = 0; i < plots; i++) {
    pinMode(i + offSet, OUTPUT);
  }
  apagarTodo();
  Serial.println(F(">>> DTA-Agrícola: Serie AGxx v0.2.2 A"));
  Serial.print(F("    «")); Serial.print(telefono); Serial.println(F("»"));
  // activeTime[plot] = millis();
}

void loop() {
  Serial.println(F("\n********************* New loop *********************\n"));
  gestionarComunicaciones();
  systemWatchDog();
  showVars();
  acciones();
  systemWatchDog();
  waitFor(5);                                           // Demora de 5 segundos
}

#pragma region Acciones

void acciones() {
  if (statusVar == "ON") {
    bool isPump = setPlotStatus();
    activatePump(isPump);
    if (!isPump) { apagarTodo(); }
  } else {
    apagarTodo();
  }
}

bool setPlotStatus() {                                  // Estado de la bomba y puertas
  bool isPump = false;
  for (byte plot = 0; plot < plots; plot++) {
    if (activationTime[plot] > 0 && (millis() - activeTime[plot]) < activationTime[plot]) {
      activarDesactivarPuerta(plot, true);              // Activar puerta
      isPump = true;
    } else {
      activarDesactivarPuerta(plot, false);             // Desactivar puerta
      activationTime[plot] = 0;
      activeTime[plot] = 0;
    }
  }
  return isPump;
}

void activarDesactivarPuerta(int plot, bool action) {   // Activar/Desactivar puerta
  if (systemType[plot] == 'F') {
    digitalWrite(plot + offSet, action ? LOW : HIGH);   // Fijo: fija un voltaje
  } else if (systemType[plot] == 'P' && (action && activationFrecuency[plot] == 0 || !action && activationFrecuency[plot] == 1)) {
    digitalWrite(plot + offSet, LOW);                   // Pulso: pone el voltaje por 1.5 segundos
    delay(1500);
    digitalWrite(plot + offSet, HIGH);                  // Pulso: quita el voltaje
    activationFrecuency[plot] < 1 ? activationFrecuency[plot]++ : activationFrecuency[plot] = 0;
  }
}

void activatePump(bool isPump) {                        // Activar/Desactivar la bomba
    digitalWrite(pinBomba, isPump ? LOW : HIGH);
}

void apagarTodo() {
  digitalWrite(pinBomba, HIGH);                         // Bomba pagada
  for (byte plot = 0; plot < plots; plot++) {
    activarDesactivarPuerta(plot, false);
    activationTime[plot] = 0;
    activeTime[plot] = millis();
  }
  statusVar = "OFF";
}

void waitFor(int time) {
  unsigned long initialTimer = millis();
  time *= 1000;
  while (millis() - initialTimer < time) {
    delay(1000);
    systemWatchDog();
  }
}

void systemWatchDog() {
  pinMode(watchDogPin, OUTPUT);         // Sink current to drain charge from C2
  digitalWrite(watchDogPin, LOW);
  delay(100);                           // Give enough time for C2 to discharge (should discharge in 50 ms)     
  pinMode(watchDogPin, INPUT);          // Return to high impedance
}

#pragma endregion Acciones

