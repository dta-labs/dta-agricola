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
 *    GND (D4) ----[R = 10kΩ]----+----[Sensor Watermark]---- Vcc (3.3V / 5V / A1)                                  *
 *                               |                                                                                 *
 *                               +---- A0 (Arduino)                                                                *
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

#define exitationNeg 4
#define exitationPos A1
#define readSensor A0
#define num_of_read 1                        // number of iterations, each is actually two reads of the sensor (both directions)
const int Rx = 10000;                        // fixed resistor attached in series to the sensor and ground...the same value repeated for all WM and Temp Sensor.
const long default_TempC = 24;
const long open_resistance = 35000;          // check the open resistance value by replacing sensor with an open and replace the value here...this value might vary slightly with circuit components
const long short_resistance = 200;           // similarly check short resistance by shorting the sensor terminals and replace the value here.
const long short_CB = 240, open_CB = 255 ;
const float cFactor = 1.1;                   // correction factor optional for adjusting curve, 1.1 recommended to match IRROMETER devices as well as CS CR1000
int i, j = 0, WM1_CB = 0;
float SenV10K = 0, SenVWM1 = 0, SenVWM2 = 0, ARead_A1 = 0, ARead_A2 = 0, WM_Resistance = 0, WM1_Resistance = 0 ;

int convertR2Cb(int res, float TC, float cF) {                    // conversion of ohms to CB
  int WM_CB;
  float resK = res / 1000.0;
  float tempD = 1.00 + 0.018 * (TC - 24.00);
  if (res > 550.00) {                                             // if in the normal calibration range
    if (res > 8000.00) {                                          // above 8k
      WM_CB = (-2.246 - 5.239 * resK * (1 + .018 * (TC - 24.00)) - .06756 * resK * resK * (tempD * tempD)) * cF;
    } else if (res > 1000.00) { //between 1k and 8k
      WM_CB = (-3.213 * resK - 4.093) / (1 - 0.009733 * resK - 0.01205 * (TC)) * cF ;
    } else { //below 1k
      WM_CB = -(resK * 23.156 - 12.736) * tempD;
    }
  } else {                                                        // below normal range but above short (new, unconditioned sensors)
    if (res > 300.00)  {
      WM_CB = 0.00;
    }
    if (res < 300.00 && res >= short_resistance) {                // wire short
      WM_CB = short_CB;                                           // 240 is a fault code for sensor terminal short
      Serial.print("Sensor Short WM \n");
    }
  }
  if (res >= open_resistance || res==0) {
    WM_CB = open_CB;                                              //255 is a fault code for open circuit or sensor not present
  }
  return abs(WM_CB);
}

float readWMsensor() {                                            //read ADC and get resistance of sensor
  ARead_A1 = 0;
  ARead_A2 = 0;
  for (i = 0; i < num_of_read; i++) {                             // the num_of_read initialized above, controls the number of read successive read loops that is averaged.
    digitalWrite(exitationNeg, HIGH);                             // Set pin 5 as Vs
    delayMicroseconds(90);                                        // wait 90 micro seconds and take sensor read
    ARead_A1 += analogRead(readSensor);                           // read the analog pin and add it to the running total for this direction
    digitalWrite(exitationNeg, LOW);                              // set the excitation voltage to OFF/LOW
    delay(100);                                                   // 0.1 second wait before moving to next channel or switching MUX
    // Now lets swap polarity, pin 5 is already low
    digitalWrite(exitationPos, HIGH);                             // Set pin 11 as Vs
    delayMicroseconds(90);                                        // wait 90 micro seconds and take sensor read
    ARead_A2 += analogRead(readSensor);                           // read the analog pin and add it to the running total for this direction
    digitalWrite(exitationPos, LOW);                              // set the excitation voltage to OFF/LOW
    delay(100);                                                   // 0.1 second wait before moving to next channel or switching MUX
  }
  SenVWM1 = (ARead_A1 / 1024) / num_of_read;                      // get the average of the readings in the first direction and convert to volts
  SenVWM2 = (ARead_A2 / 1024) / num_of_read;                      // get the average of the readings in the second direction and convert to volts
  double WM_ResistanceA = Rx * (1.0 - SenVWM1) / SenVWM1;       // do the voltage divider math, using the Rx variable representing the known resistor
  double WM_ResistanceB = Rx * SenVWM2 / (1.0 - SenVWM2);         // reverse
  // SenVWM1 = ((ARead_A1 / 1024) * SupplyV) / (num_of_read);        // get the average of the readings in the first direction and convert to volts
  // SenVWM2 = ((ARead_A2 / 1024) * SupplyV) / (num_of_read);        // get the average of the readings in the second direction and convert to volts
  // double WM_ResistanceA = (Rx * (SupplyV - SenVWM1) / SenVWM1);   // do the voltage divider math, using the Rx variable representing the known resistor
  // double WM_ResistanceB = Rx * SenVWM2 / (SupplyV - SenVWM2);     // reverse
  double WM_Resistance  = (WM_ResistanceA + WM_ResistanceB) / 2;  // average the two directions
  return WM_Resistance;
}

String isIrrigationNeeded(int cb) {
  if (cb <= 10) return "Suelo saturado - No regar"; 
  else if (cb <= 30) return "Humedad óptima - No regar"; 
  else if (cb <= 60) return "Suelo comenzando a secarse - Programar riego pronto"; 
  else if (cb <= 100) return "Estrés moderado - Regar necesario"; 
  else if (cb <= 150) return "Suelo seco - Regar urgente"; 
  else return "Muy seco - Regar inmediatamente";
}

void setupWM() {
  pinMode(exitationNeg, OUTPUT);
  digitalWrite(exitationNeg, LOW);
  pinMode(exitationPos, OUTPUT);
  digitalWrite(exitationPos, LOW);
  delay(100);
}

int getMoisture() {
  WM1_Resistance = readWMsensor();
  return convertR2Cb(WM1_Resistance, default_TempC, cFactor);
}
