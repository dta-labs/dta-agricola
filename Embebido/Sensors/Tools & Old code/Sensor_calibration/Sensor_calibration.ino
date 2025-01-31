/*************************************************
 *                   CALIBRATOR                  *
 *************************************************/

#include <SPI.h>
#include "analogicSensor.h"
#define sensor A0

import processing.serial.*;

float minValue = 5.00;
float maxValue = 0;
PrintWriter output;

void setup() {
  Serial.begin(115200);
  pinMode(sensor, INPUT);
  output = createWriter( "data.txt" );
  while (!Serial);  
  Serial.println(F("\n[[[ Sensor calibration ]]]"));
}
 
void loop() {
  getMeasurements();
  // delay(500);
}

void getMeasurements() {
  float measure = readAnalogicData(sensor);
  measure += readAnalogicData(sensor);
  measure += readAnalogicData(sensor);
  measure /= 3;
  minValue = minValue < measure ? minValue : measure;
  maxValue = maxValue > measure ? maxValue : measure;
  float voltage = readVcc();
  String msg = "H_agua(min) : "; msg += minValue; 
  msg += " H_relativa(max) : "; msg += maxValue; 
  msg += " voltaje: "; msg += voltage; 
  msg += " || medición: "; msg += measure; 
  float Hs = map(measure, minValue, maxValue, 0, 100);
  float Hs2 = 100 - (((measure - minValue) / (maxValue - minValue)) * 100.00);
  Hs2 = Hs2 < 0 ? 0 : Hs2 > 100 ? 100 : Hs2;
  msg += " => H_suelo: "; msg += Hs; msg += " ~ "; msg += Hs2; 
  Serial.println(msg);
  // os.system("echo " msg " >> datosSensor.txt");
  output.println(msg);
}

void keyPressed() {
    output.flush();  // Writes the remaining data to the file
    output.close();  // Finishes the file
    exit();  // Stops the program
}