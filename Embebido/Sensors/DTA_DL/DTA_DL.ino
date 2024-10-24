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
  Serial.println(strMeasurements);
  sendData(strMeasurements);
  delay(60000);
}

void setLCDCursor() {
  lcd.setCursor(0, 1);
  lcd.print(F("                "));
  lcd.setCursor(0, 1);
}

String readData() {
  int data0 = analogRead(A0);
  writeDataInLCD(data0, 50, "P:", "psi");
  int data1 = analogRead(A1);
  writeDataInLCD(data1, 500, " P:", "psi");
  return (String)data0 + "," + (String)data1;
}

void writeDataInLCD(int data, int maxVal, String title, String subTitle) {
  data = map(data, 0, 1023, 0, maxVal);
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