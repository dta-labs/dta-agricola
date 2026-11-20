#pragma region Sensor SHT4x

#include <Adafruit_SHT4x.h>

Adafruit_SHT4x sht4 = Adafruit_SHT4x();

bool setupSHT() {
  for (uint8_t i = 0; i < 10; i++) {
    if (sht4.begin()) {
      sht4.setPrecision(SHT4X_MED_PRECISION);
      sht4.setHeater(SHT4X_NO_HEATER);
      return true;
    }
    delay(200);
  }
  return false;
}

// Devuelve false si la lectura falla o está fuera del rango del sensor
bool readSHT(float &t, float &h) {
  sensors_event_t humidity, temp;
  if (!sht4.getEvent(&humidity, &temp)) return false;
  t = temp.temperature;
  h = humidity.relative_humidity;
  return !isnan(t) && !isnan(h) && t >= -40.0 && t <= 125.0 && h >= 0.0 && h <= 100.0;
}

#pragma endregion Sensor SHT4x
