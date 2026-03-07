/*******************************************************************************************************************
 *                                                                                                                 *
 * Watermark (www.irrometer.com/200ss.html)                                                                        *
 * Version 1.1 updated 7/21/2023 by Jeremy Sullivan, Irrometer Co Inc.                                             *
 *                                                                                                                 *
 * Purpose of this code is to demonstrate valid WM reading code, circuitry and excitation using a voltage divider, *
 * "psuedo-ac" method and Dr. Clint Shock's 1998 calibration equation, with a default temperature of 24C.          *
 * Sensor to be energized by digital pin 11 or digital pin 5, alternating between HIGH and LOW states              *
 *                                                                                                                 *
 * NOTE:                                                                                                           *
 * 1. The 0.09 excitation time may not be sufficient depending on circuit design, cable lengths, voltage, etc.     *
 * 2. Increase if necessary to get accurate readings, do not exceed 0.2                                            *
 * 3. This code assumes a 10 bit ADC. If using 12 bit, replace the 1024 in the voltage conversions to 4096         *
 *    GND (D4) ----[R = 10kΩ]----+----[Sensor Watermark]---- Vcc (A1)                                              *
 *                               |                                                                                 *
 *                               +---- Lectura (A0)                                                                *
 *    3.1. If the direction is reversed, the WM1_Resistance A and B formulas would have to be swapped              *
 *                                                                                                                 *
 * 4. Necesidad de riego:                                                                                          *
 *      0– 10 cb	Suelo saturado, exceso de agua - No regar (riesgo de anoxia)                                     *
 *     10– 30 cb	Humedad óptima para la mayoría de cultivos - No regar aún                                        *
 *     30– 60 cb	Suelo comenzando a secarse, plantas sensibles sienten estrés - Programar riego pronto            *
 *     60–100 cb	Humedad limitada, estrés moderado - Regar necesario                                              *
 *    100–150 cb	Suelo seco, difícil extracción de agua - Regar urgente                                           *
 *       >150 cb	Muy seco, plantas en fuerte estrés - Regar inmediatamente                                        *
 *                                                                                                                 *
 *******************************************************************************************************************/

#include <math.h>

#define exitationPos A1
#define exitationNeg 4
#define sensorIn A0
#define open_resistance 35000 // Check the open resistance value by replacing sensor with an open and replace the value here...this value might vary slightly with circuit components
#define short_resistance 200
#define short_CB 240
#define open_CB 255
#define Rx 10000              // Fixed resistor attached in series to the sensor and ground...the same value repeated for all WM and Temp Sensor.
#define default_TempC 24
#define cFactor 1.1           // Correction factor optional for adjusting curve, 1.1 recommended to match IRROMETER devices as well as CS CR1000

int convertR2Cb(int res) {
  float resK = res / 1000.0;
  float tempD = 1.00 + 0.018 * (default_TempC - 24.00);
  if (isinf(res)) return 0;
  if (res >= open_resistance) return open_CB;
  if (res > 8000) return abs((-2.246 - 5.239 * resK * (1 + .018 * (default_TempC - 24.00)) - .06756 * resK * resK * (tempD * tempD)) * cFactor);
  if (res > 1000) return abs((-3.213 * resK - 4.093) / (1 - 0.009733 * resK - 0.01205 * (default_TempC)) * cFactor);
  if (res > 550) return abs(-(resK * 23.156 - 12.736) * tempD);
  if (res > 300) return 0;
  return short_CB;  
}

float readWMsensor() {
  digitalWrite(exitationPos, HIGH);
  delayMicroseconds(90);
  float ADC_Pos = analogRead(A0);
  digitalWrite(exitationPos, LOW);
  delay(100);
  digitalWrite(exitationNeg, HIGH);
  delayMicroseconds(90);
  float ADC_Neg = analogRead(A0);
  digitalWrite(exitationNeg, LOW);
  float SupplyV = getVcc();
  float SenVWM1 = ((ADC_Pos / 1024) * SupplyV);
  float SenVWM2 = ((ADC_Neg / 1024) * SupplyV);
  double WM_ResistanceA = Rx * (SupplyV - SenVWM1) / SenVWM1;
  double WM_ResistanceB = Rx * SenVWM2 / (SupplyV - SenVWM2);
  double WM_Resistance = ((WM_ResistanceA + WM_ResistanceB) / 2);
  // Serial.print(F(" R1 = ")); Serial.print(WM_ResistanceA); Serial.print(F(" R2 = ")); Serial.print(WM_ResistanceB);
  // Serial.print(F(" Rt = ")); Serial.print(WM_Resistance); Serial.print(F("ohms  ->  "));
  return WM_Resistance;
}

String isIrrigationNeeded(int cb) {
  if (cb <= 10) return String(cb) + "cb: Suelo saturado - No regar"; 
  else if (cb <= 30) return String(cb) + "cb: Humedad óptima - No regar"; 
  else if (cb <= 60) return String(cb) + "cb: Suelo comenzando a secarse - Programar riego pronto"; 
  else if (cb <= 100) return String(cb) + "cb: Estrés moderado - Regar necesario"; 
  else if (cb <= 150) return String(cb) + "cb: Suelo seco - Regar urgente"; 
  else if (cb < 240) return String(cb) + "cb: Muy seco - Regar inmediatamente"; 
  else if (cb <= 255) return String(cb) + "cb: Cortocircuito"; 
  else return String(cb) + "cb: Circuito abierto";
}

void setupWM() {
  pinMode(exitationPos, OUTPUT);
  pinMode(exitationNeg, OUTPUT);
  digitalWrite(exitationPos, LOW);
  digitalWrite(exitationNeg, LOW);
  delay(100);
}

int getMoisture() {
  float resistanceWM = readWMsensor();
  return convertR2Cb(resistanceWM);
}
