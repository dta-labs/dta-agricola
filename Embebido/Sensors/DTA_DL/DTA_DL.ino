#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SoftwareSerial.h>
#include <avr/wdt.h>

#include "miscelaneas.h"
#include "configuracion.h"
#include "comunicaciones.h"
#include "analogicSensor.h"

void setup() {
  Serial.begin(115200);
  Serial.println(F("\nDTA-Agricola & DL sensor v0.1"));
  initLCD();
  initComm();
}

void initLCD() {
  lcd.init();
  lcd.backlight();
  lcd.print(F("DTAAgricola & DL"));
}

void initComm() {
  pinMode(pinCommReset, OUTPUT);
  digitalWrite(pinCommReset, HIGH);
  comunicaciones("", "", true);
}

void loop() {
  setLCDCursor();
  String strMeasurements = readData();
  sendData(strMeasurements);
  delay(10000);
}

void setLCDCursor() {
  lcd.setCursor(0, 1);
  lcd.print(F("                "));
  lcd.setCursor(0, 1);
}

String readData() {
  int read = analogRead(A0);
  float data0 = map(read, 0, 10, 0, 100);
  Serial.print(read); Serial.print("b -> "); 
  Serial.print(data0); Serial.print("kN/m2 -> "); 
  Serial.print(data0 * .145); Serial.println("psi");
  writeDataInLCD(data0, "P: ", "psi");
  return (String)data0 + ",0.00";
}

void writeDataInLCD(int data, String title, String subTitle) {
  lcd.print(title);
  lcd.print(data);
  lcd.print(subTitle);
}

void sendData(String strMeasurements) {
  static unsigned long timer = millis();
  if (millis() - timer > commFrec) {
    timer = millis();
    comunicaciones(strMeasurements, "4.00,4.00", false);
  }
}