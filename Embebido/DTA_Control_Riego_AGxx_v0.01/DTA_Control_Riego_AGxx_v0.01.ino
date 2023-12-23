/****************************************************************
 *                                                              *
 *               Sistemas DTA Serie AGxx v0.2.2 A               *
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
#include "eeprom.h"
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
  // readEEPROM();
  setActivationTime();
  activeTime = millis();
}

void loop() {
  Serial.println(F("\n********************* New loop *********************\n"));
  gestionarComunicaciones();
  systemWatchDog();
  showVars();
  // if (cyclic || (!cyclic && (plot < plots - 1 || (plot == plots - 1 && (millis() - activeTime) < activationTime)))) {
    acciones();
  // }
  systemWatchDog();
  waitFor(3);                                                            // Demora de 30 segundos
}

#pragma region Acciones

void acciones() {
  if (statusVar == "ON") {
    digitalWrite(pinBomba, LOW);                                        // Bomba de agua encendida
    setPlot();
    setActivationTime();
    activarPuerta();
    // updateEEPROM(0);
  } else {
    apagarTodo();
    // deleteEEPROM();
  }
}

void setPlot() {
  // unsigned long irrigationTime = activationTime != 0 && activationTime > eeVar.enlapsedTime ? activationTime - eeVar.enlapsedTime : activationTime;
  // if ((millis() - activeTime) >= irrigationTime) {
  if ((millis() - activeTime) >= activationTime) {
    plot = (plot < plots - 1) ? plot + 1 : 0;
    Serial.print(F("Change to plot: ")); Serial.println(plot + 1);
    apagar();
    activationTime = 0;
    activeTime = 0;
  }
}

void setActivationTime() {
  String aux = parse(commStr, '"', (plot * 2) + offSet);   
  activationTime = (aux != "") ? aux.toInt() : activationTime;
  aux = parse(commStr, '"', (plot * 2) + offSet + 1); 
  char arrType[1];
  aux.toCharArray(arrType, 1);
  systemType = (arrType[0] == 'F' || arrType[0] == 'P') ? arrType[0] : 'F'; // Valvle type
  activeTime = activeTime == 0 & activationTime > 0 ? millis() : activeTime;
}

void activarPuerta() {
  if (activationTime != 0) {                // Activar
    if (systemType == 'F') {
      digitalWrite(plot + offSet, LOW);     // Fijo: fija un voltaje
    } else {
      digitalWrite(plot + offSet, LOW);     // Pulso: pone el voltaje por 1.5 segundos
      delay(1500);
      digitalWrite(plot + offSet, HIGH);    // Pulso: quita el voltaje
    }
  }
}

void apagarTodo() {
  digitalWrite(pinBomba, HIGH);  // Apagado
  apagar();
}

void apagar() {
  if (systemType == 'F') {
    for (byte i = 0; i < plots; i++) {
      digitalWrite(i + offSet, HIGH);      // Fijo: quita el voltaje
    }
  } else {
    for (byte i = 0; i < plots; i++) {
      digitalWrite(i + offSet, LOW);      // Pulso: pone el voltaje por 5 segundos
      delay(5000);
      digitalWrite(i + offSet, HIGH);
   }
  }
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

