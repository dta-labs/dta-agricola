#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SoftwareSerial.h>
#include <avr/wdt.h>

#include "miscelaneas.h"
#include "configuracion.h"
#include "comunicaciones.h"
#include "analogicSensor.h"
#include "hallSensor.h"
#include "caudal.h"
// #include "rs485.h"

void setup() {
  Serial.begin(115200);
  Serial.println(F("\nDTA-Agricola & DL sensor v0.1"));
  delay(1000);
  initCaudalSensor(2400);
  // initHall();
  // initLCD();
  // initComm();
}

void initLCD() {
  lcd.init();
  lcd.backlight();
  setLCDCursor(0);
  lcd.print(F("DTA-Agricola &  "));
  setLCDCursor(1);
  lcd.print(F("Dragon Line v0.1"));
  delay(5000);
}

void initComm() {
  pinMode(pinCommReset, OUTPUT);
  digitalWrite(pinCommReset, HIGH);
  comunicaciones("", "", true);
}

void loop() {
  String strMeasurements = readData();
  sendData(strMeasurements);
  delay(10000);
}

void setLCDCursor(int pos) {
  lcd.setCursor(0, pos);
  lcd.print(F("                "));
  lcd.setCursor(0, pos);
}

String readData() {
  float pressure = readPressure();                        // Leer presión
  float caudalFloat = readCaudal();
  
  // String caudal = String(readHallSensor(), 1) + "p/s";    // Leer pulsos
  // Serial.print(" | "); Serial.print(caudal);
  // writeDataInLCD(caudal);
  
  // writeDataInLCD(String(pressure, 1), caudalToStr(caudalFloat));
  return String(pressure, 1) + "," + String(caudalFloat, 1);
}

float readCaudal() {
  float caudalFloat = instantaneousFlowRate();
  Serial.print(" | "); Serial.println(caudalToStr(caudalFloat));
  return caudalFloat;
}

String caudalToStr(float caudal) {
  char unit = 'm';
  return caudal == -1 ? "Error!!!" : (unit == 'L') ? String(caudal, 1) + "L/h" : String(caudal / 1000.0, 1) + "m3/h";
}

void writeDataInLCD(String pressure, String caudal) {
  setLCDCursor(0);
  lcd.print("P: " + pressure + "psi ");
  setLCDCursor(1);
  lcd.print("C: " + caudal);
}



float readPressure() {
  int offset = 0;
  float read = 0;
  read = analogRead(A0);
  read = constrain(read, offset, 1023);
  float pressure_bar = map(read, offset, 1023, 0, 16);
  float pressure_psi = pressure_bar * 14.504;
  Serial.print(read); Serial.print("b -> "); 
  Serial.print(pressure_bar); Serial.print("bar -> "); 
  Serial.print(pressure_psi); Serial.print("psi");
  return pressure_psi;
}

// String readCaudal() {
//   String caudal = readRS485();
//   return caudal != "" ? caudal : "0.0";
// }

void writeDataInLCD(String data) {
  lcd.print(data);
}

void sendData(String strMeasurements) {
  static unsigned long timer = millis();
  if (millis() - timer > commFrec) {
    timer = millis();
    // comunicaciones(strMeasurements, "4.00,4.00", false);
  }
}