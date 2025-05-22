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

#include "miscelaneas.h"
#include "configuracion.h"
#include "eeprom.h"
#include "comunicaciones.h"

void setup() {
  Serial.begin(115200);
  pinMode(pinBomba, OUTPUT);
  for (byte i = 0; i < plots; i++) {
    pinMode(i + offSet, OUTPUT);
    activeTime[i] = millis();
  }
  pinMode(pinCommRST, OUTPUT);
  digitalWrite(pinCommRST, HIGH);
  Serial.println(F("<<< DTA-Agrícola: Serie AGxx v0.2.3 A >>>"));
  Serial.print(F("    «")); Serial.print(telefono); Serial.println(F("»"));
  // apagarTodo();
  // waitFor(360);                                // Demora de 6 minutos (360 segundos), para proteger al motor
  // restoreStatus();
}

void loop() {
  gestionarComunicaciones();
  systemWatchDog();
  showVars();
  acciones();
  systemWatchDog();
  waitFor(5);                                           // Demora de 5 segundos
}

#pragma region Acciones

void restoreStatus() {
  if (hayEstadoGuardado()) {
    Serial.println(F("<----- Recuperar Estado ----->"));
    recuperarEstado();
    showVars();
    acciones();
  } else {
    apagarTodo();
  }
}

void acciones() {
  if (statusVar == "ON") {
    bool isPump = irrigationMode == 'P' ? setPlotStatusParalell() : irrigationMode == 'S' ? setPlotStatusSerial('S') : setPlotStatusSerial('C');
    activatePump(isPump);
    if (!isPump) { apagarTodo(); }
  } else {
    apagarTodo();
  }
}

bool setPlotStatusParalell() {                          // Estado de la bomba y puertas Paralelo
  bool isPump = false;
  for (byte i = 0; i < plots; i++) {
    if (activationTime[i] > 0 && (millis() - activeTime[i]) < activationTime[i]) {
      activarDesactivarPuerta(i, true);                 // Activar puerta
      isPump = true;
    } else {
      activarDesactivarPuerta(i, false);                // Desactivar puerta
      activationTime[i] = 0;
      activeTime[i] = 0;
    }
  }
  return isPump;
}

bool setPlotStatusSerial(char cyclic) {                 // Estado de la bomba y puertas Serie
  if (cyclic == 'C' || plot < plots - 1 || (plot == plots - 1 && (millis() - activeTime[plot]) < activationTime[plot])) {
    // digitalWrite(pinBomba, LOW);                        // Bomba de agua encendida
    setPlot();
    activarDesactivarPuerta(plot, true);
    return true;
  }
  return false;
}

void setPlot() {                                        // Estado de la bomba y puertas Serie
  // Serial.print(plot); Serial.print(F(" ")); Serial.print(millis() - activeTime[plot]); 
  // Serial.print(F(" >= ")); Serial.print(activationTime[plot]); Serial.print(F(" "));
  if ((millis() - activeTime[plot]) >= activationTime[plot]) {
    plot = (plot < plots - 1) ? plot + 1 : 0;
    // Serial.print(F("Change to plot: ")); Serial.print(plot + 1); Serial.print(F(": ")); Serial.print(millis() - activeTime[plot]); Serial.print(F(" >= ")); Serial.println(activationTime[plot]);
    for (byte i = 0; i < plots; i++) {
      activarDesactivarPuerta(i, false);
      // activationTime[i] = 0;
      activeTime[i] = millis();
    }
  }
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
  for (byte i = 0; i < plots; i++) {
    activarDesactivarPuerta(i, false);
    activationTime[i] = 0;
    activeTime[i] = millis();
  }
  statusVar = "OFF";
}

void waitFor(int time) {
  for (int i = 0; i < time; i++) {
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

