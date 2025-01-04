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
  // initRS485(9600);
  initCaudalSensor(2400);
  initHall();
  initLCD();
  initComm();
}

void initLCD() {
  lcd.init();
  lcd.backlight();
  setLCDCursor(0);
  lcd.print(F("DTA-Agricola &  "));
  setLCDCursor(1);
  lcd.print(F("Dragon Line v0.1"));
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
  setLCDCursor(0);                                        // Cursor 0
  float pressure = readPressure();                        // Leer presión
  writeDataInLCD(String(pressure, 1) + "psi ");
  String caudal = String(readHallSensor(), 1) + "p/s";    // Leer pulsos
  Serial.print(" | "); Serial.print(caudal);
  writeDataInLCD(caudal);
  setLCDCursor(1);                                        // Cursor 1

  // caudal = readCaudal() + "m3/h";
  caudal = instantaneousFlowRate('L');
  Serial.print(" | "); Serial.println(caudal);
  writeDataInLCD(caudal);

  return String(pressure, 1) + "," + caudal;
}

float readPressure() {
  int offset = 58;
  float read = 0;
  // for(int i = 0; i < 100; i++) {
    read = analogRead(A0);
  //   delay(1);
  // }
  // read /= 100;
  read = read >= offset ? read : offset;
  float pressure_kN = map(read, offset, 1024, 0, 1600);
  // float pressure_kN = map(read, 0, 10, 0, 100);
  float pressure_psi = pressure_kN * .145;
  // int read = readAnalogicData(A0);
  // float pressure_kN = read;
  Serial.print(read); Serial.print("b -> "); 
  Serial.print(pressure_kN); Serial.print("kN/m2 -> "); 
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
    comunicaciones(strMeasurements, "4.00,4.00", false);
  }
}