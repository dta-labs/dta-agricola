#pragma region Sensor SHT4x

#include <Adafruit_SHT4x.h>

Adafruit_SHT4x sht4 = Adafruit_SHT4x();   // SHT4x
#define ENABLE_HEATER SHT4X_NO_HEATER     // Activar el calentador del sensor
sensors_event_t humidity, temp;

String setupSHT() {
  byte iter = 10;
  while (!sht4.begin() && iter--) {
    if (iter == 0) return noSensor;
    delay(200);
  }
  sensorType = SHT;
  sht4.setPrecision(SHT4X_MED_PRECISION);
  sht4.setHeater(SHT4X_NO_HEATER);
  Serial.print(F("  - Sensor SHT4: "));
  return String(sht4.readSerial(), HEX);
}

void reviewHeaterCondition(float t_prom, float h_prom) {
  if (h_prom > 94.0 && t_prom < 10.0 && activeHeater) {  // Evaluar si hay condiciones para calentamiento
    Serial.println(F("⚠️ Posible condensación detectada, activando calentador."));
    sht4.setHeater(SHT4X_LOW_HEATER_100MS);
    delay(200); // calentamiento suave
    sht4.setHeater(SHT4X_NO_HEATER);
    delay(5000); // esperar disipación
    sht4.getEvent(&humidity, &temp);
    t_actual = temp.temperature;
    h_actual = humidity.relative_humidity;
    calentado = true;
  } else {
    calentado = false;
  }
}

void readSHT(float &t, float &h) {
  sht4.getEvent(&humidity, &temp);
  t = temp.temperature;
  h_actual = humidity.relative_humidity;
}

#pragma endregion Sensor SHT4x

