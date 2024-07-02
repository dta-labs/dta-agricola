/*************************************************
 *                   CALIBRATOR                  *
 *************************************************/

#include <SPI.h>
#include "analogicSensor.h"
#define sensor A0

float minValue = 5.00;
float maxValue = 0;

void setup() {
  Serial.begin(115200);
  pinMode(sensor, INPUT);
  while (!Serial);  
  Serial.println(F("\n[[[ Sensor calibration ]]]"));
}
 
void loop() {
  getMeasurements();
  delay(500);
}

void getMeasurements() {
  float measure = readAnalogicData(sensor);
  minValue = minValue < measure ? minValue : measure;
  maxValue = maxValue > measure ? maxValue : measure;
  float voltage = readVcc();
  Serial.print(F("H_agua(min) : ")); Serial.print(minValue); 
  Serial.print(F(" H_relativa(max) : ")); Serial.print(maxValue); 
  Serial.print(F(" voltaje: ")); Serial.print(voltage); 
  Serial.print(F(" | medición: ")); Serial.print(measure); 
  float Hs = map(measure, maxValue, minValue, 0, 100);
  float Hs2 = (measure - minValue) * (0.00 - 100.00) / (maxValue - minValue) + 100.00;
  Serial.print(F(" => H_suelo: ")); Serial.print(Hs); Serial.print(F(" ~ ")); Serial.println(Hs2); 
}
