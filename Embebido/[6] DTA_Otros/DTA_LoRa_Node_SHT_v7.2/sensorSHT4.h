#pragma region Sensor SHT4x

#include <Adafruit_SHT4x.h>

Adafruit_SHT4x sht4 = Adafruit_SHT4x();   // SHT4x
#define ENABLE_HEATER SHT4X_NO_HEATER     // Activar el calentador del sensor
sensors_event_t humidity, temp;

void setupSHT() {
  while (!sht4.begin()) delay(10);
  sht4.setPrecision(SHT4X_HIGH_PRECISION);
  sht4.setHeater(SHT4X_NO_HEATER);
  Serial.println(F("  • Sensor SHT4x inicializado correctamente..."));
}

void readSHT() {
  sht4.getEvent(&humidity, &temp);
  t_actual = temp.temperature;
  h_actual = humidity.relative_humidity;
  agregarALaMedia(t_actual, h_actual);
  float t_prom = estimadorAdaptativo(temp_hist, NUM_MUESTRAS);
  float h_prom = estimadorAdaptativo(hum_hist, NUM_MUESTRAS);
  // float t_prom = promedio(temp_hist);
  // float h_prom = promedio(hum_hist);
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

#pragma endregion Sensor SHT4x

