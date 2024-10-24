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
  initLCD();
  // initComm();
}

void initLCD() {
  lcd.init();
  lcd.backlight();
  lcd.print("DTAAgricola & DL");
}

void initComm() {
  pinMode(pinCommReset, OUTPUT);
  digitalWrite(pinCommReset, HIGH);
  comunicaciones("", "", true);
}

void loop() {
  lcd.setCursor(0, 1);
  lcd.print(F("                "));
  lcd.setCursor(0, 1);
  int data = analogRead(A0);
  String strMeasurements = (String)data + ",";
  writeDataInLCD(data, 50, "P:", "psi");
  data = analogRead(A1);
  strMeasurements += (String)data + ",0";
  writeDataInLCD(data, 500, " P:", "psi");
  // comunicaciones(strMeasurements, "4,4,4", false);
  Serial.println(strMeasurements);
  delay(5000);
}

void writeDataInLCD(int data, int maxVal, String title, String subTitle) {
  data = map(data, 0, 1023, 0, maxVal);
  lcd.print(title);
  lcd.print(data);
  lcd.print(subTitle);
}