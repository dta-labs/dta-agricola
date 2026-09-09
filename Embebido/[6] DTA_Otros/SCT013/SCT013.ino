#include "EmonLib.h"                // Librería de OpenEnergyMonitor
EnergyMonitor emon1;

void setup() {
  Serial.begin(9600);
  emon1.current(A0, 50.0);          // A0 = corriente (SCT-013)
  emon1.voltage(A1, 110.0, 1.7);    // A1 = voltaje (ZMPT101B o transformador) 110.0 = voltaje nominal, 1.7 = fase (ajustar en pruebas)
}

void loop() {
  medirI();

  delay(1000);
}

void medirVI() {
  emon1.calcVI(20,2000); // 20 ciclos, timeout 2000 ms
  double Vrms = emon1.Vrms;
  double Irms = emon1.Irms;
  double Power = emon1.realPower;
  Serial.print(Vrms); Serial.print(" V  ");
  Serial.print(Irms); Serial.print(" A  ");
  Serial.print(Power); Serial.println(" W");
}

void medirI() {
  double Irms = emon1.calcIrms(1480); // número de muestras
  Serial.print("Corriente RMS: "); Serial.print(Irms); Serial.println(" A");
}

