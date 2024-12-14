#include <Arduino.h>
#include <Wire.h>
#include "Adafruit_SHT31.h"

bool enableHeater = false;        // SHT Sensor
uint8_t loopCnt = 0;
Adafruit_SHT31 sht31 = Adafruit_SHT31();
float shtData[2] = {0, 0};

#define vMax 4.78                 // HW Sensor

void setup() {
  Serial.begin(9600);
  while (!Serial) delay(10);     // will pause Zero, Leonardo, etc until serial console opens
  Serial.println("\nHumedad y temperatura del suelo...\n");
  settupSHT();
}

void loop() {
  float vcc = readVcc();
  float hwData = readHW();
  readSHT();

  Serial.print("SHT[Temp] = "); Serial.print(shtData[0]); Serial.print("°C\t");
  Serial.print("SHT[Hum] = "); Serial.print(shtData[1]); Serial.print("%\t");
  Serial.print("HW[Hum] = "); Serial.print(hwData); Serial.print("%\t\t");
  Serial.print("Vcc = "); Serial.print(vcc); Serial.println("V");

  delay(1000);
}

float readHW() {
  float read = analogRead(A0);
  float val = map(read, 644, 264, 0, 100);
  return val;
}

void settupSHT() {
  if (! sht31.begin(0x44)) {   // Set to 0x45 for alternate i2c addr
    Serial.println("Couldn't find SHT31");
    while (1) delay(1);
  }
  Serial.print("Heater Enabled State: ");
  if (sht31.isHeaterEnabled())
    Serial.println("ENABLED");
  else
    Serial.println("DISABLED");
}

void readSHT() {
  float t = sht31.readTemperature();
  float h = sht31.readHumidity();
  shtData[0] = !isnan(t) ? t : -99;
  shtData[1] = !isnan(h) ? h : -99;
  delay(1000);
  setHeater();
  loopCnt++;
}

void setHeater() {
  // Toggle heater enabled state every 30 seconds
  // An ~3.0 degC temperature increase can be noted when heater is enabled
  if (loopCnt >= 30) {
    enableHeater = !enableHeater;
    sht31.heater(enableHeater);
    Serial.print("Heater Enabled State: ");
    if (sht31.isHeaterEnabled())
      Serial.println("ENABLED");
    else
      Serial.println("DISABLED");
    loopCnt = 0;
  }
}

long readVcc() {
  ADMUX = _BV(REFS0) | _BV(MUX3) | _BV(MUX2) | _BV(MUX1);
  delay(2);
  ADCSRA |= _BV(ADSC);
  while (bit_is_set(ADCSRA, ADSC));
  
  long result = ADCL;
  result |= ADCH << 8;
  result = 1126400L / result; // Back-calculate AVcc in mV
  return result / 1000.0;
}
