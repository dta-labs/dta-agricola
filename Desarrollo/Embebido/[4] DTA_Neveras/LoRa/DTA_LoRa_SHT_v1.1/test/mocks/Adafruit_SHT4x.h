// Simulación del sensor SHT4x (Adafruit_SHT4x)
#pragma once
#include "Arduino.h"

struct sensors_event_t { float temperature; float relative_humidity; };
enum sht4x_precision_t { SHT4X_HIGH_PRECISION, SHT4X_MED_PRECISION, SHT4X_LOW_PRECISION };
enum sht4x_heater_t { SHT4X_NO_HEATER, SHT4X_LOW_HEATER_100MS };

class Adafruit_SHT4x {
 public:
  bool present = true;                         // Responde en el bus I2C
  bool readOk = true;                          // getEvent() devuelve true
  uint32_t serial = 0xABCDEF12;
  float t = 4.0, h = 60.0;

  bool begin() { mock::log("sht.begin"); return present; }
  void setPrecision(sht4x_precision_t) {}
  void setHeater(sht4x_heater_t) {}
  uint32_t readSerial() { return serial; }
  bool getEvent(sensors_event_t* hum, sensors_event_t* temp) {
    if (!present || !readOk) return false;
    temp->temperature = t;
    hum->relative_humidity = h;
    return true;
  }
  void reset() { present = true; readOk = true; serial = 0xABCDEF12; t = 4.0; h = 60.0; }
};
