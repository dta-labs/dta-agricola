// #include <SPI.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#pragma region Variables

#define pinDS 4                           // Pin del sensor de temperatura
OneWire owObject(pinDS);
DallasTemperature sensorDS(&owObject);
float temp;

#define DESV_EST_UMBRAL 0.3
#define NUM_MUESTRAS 30
uint8_t index = 0;

#pragma endregion Variables

#pragma region Programa Principal

void setup() {
  Serial.begin(19200);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  if (!detectarSensor()) {
    Serial.println(F("\n✗ No se logró detectar el sensor después de varios intentos."));
    while (true);                         // Detener ejecución si falla
  }
  String id = getAddress();
  id.toUpperCase();
  Serial.print(F("\n ✓ Se detectó sendor ID: ")); Serial.println(id);
}

void loop() {
  float temp = getTemperature();
  if (isnan(temp) || temp == -127.0) {
    Serial.println(F("⚠️ Lectura inválida o sensor desconectado."));
  } else {
    Serial.print(F("Temp:"));
    Serial.print(temp);
    Serial.println(F("°C"));
  }
  delay(1000);
}

#pragma endregion Programa Principal

#pragma region Sensor Ds18B20

bool detectarSensor() {
  DeviceAddress sensorAddress;
  byte intentos = 15;
  Serial.print(F("\n\nTest sensor de temperatura Ds18B20"));
  for (uint8_t i = 0; i < intentos; i++) {
    Serial.print(F("."));
    sensorDS.begin();
    delay(250);
    if (sensorDS.getAddress(sensorAddress, 0)) return true;
    delay(250);
  }
  return false;
}

String getAddress(){
  String address = "";
  DeviceAddress sensorAddress;
  sensorDS.getAddress(sensorAddress, 0);
  for (byte i = 0; i < 8; i++) {
    address += sensorAddress[i] < 0x10 ? ("0" + String(sensorAddress[i], HEX)) : String(sensorAddress[i], HEX);
  }
  return address;
}

float getTemperature() {
  static float muestras[NUM_MUESTRAS];
  for (byte i = 0; i < NUM_MUESTRAS; i++) {
    sensorDS.requestTemperatures();
    // delay(800);
    float val = sensorDS.getTempCByIndex(0); // Leer el valor del sensor
    if (val != -127.0 && val != 85.0 && -30.0 < val && val < 70.0) {
      muestras[i] = val;
    } else { 
      i--; 
    }
  }
  return estimadorAdaptativo(muestras, NUM_MUESTRAS);
}

#pragma endregion Sensor Ds18B20

#pragma region Estadísticas

float promedio(float *hist) {
  float suma = 0;
  for (int i = 0; i < NUM_MUESTRAS; i++) suma += hist[i];
  return suma / NUM_MUESTRAS;
}

float moda(float *valores, byte n) {
  float moda = valores[0];
  int maxCount = 0;
  for (int i = 0; i < n; i++) {
    int count = 0;
    for (int j = 0; j < n; j++) {
      if (abs(valores[j] - valores[i]) < 0.1) count++;  // tolerancia de 0.1
    }
    if (count > maxCount) {
      maxCount = count;
      moda = valores[i];
    }
  }
  return moda;
}

float mediana(float *valores, byte n) {
  float copia[n];
  memcpy(copia, valores, n * sizeof(float));
  for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
      if (copia[j] > copia[j + 1]) {
        float temp = copia[j];
        copia[j] = copia[j + 1];
        copia[j + 1] = temp;
      }
    }
  }
  if (n % 2 == 0)
    return (copia[n / 2 - 1] + copia[n / 2]) / 2.0;
  else
    return copia[n / 2];
}

float desviacionEstandar(float *valores, int n) {
  float suma = 0, media = 0, varianza = 0;
  for (int i = 0; i < n; i++) suma += valores[i];
  media = suma / n;
  for (int i = 0; i < n; i++) varianza += pow(valores[i] - media, 2);
  return sqrt(varianza / n);
}

float estimadorAdaptativo(float *valores, int n) {
  float desviacion = desviacionEstandar(valores, n);
  if (desviacion < DESV_EST_UMBRAL) {                 // Umbral ajustable según sensor
    return moda(valores, n);
  } else {
    return mediana(valores, n);
  }
}

#pragma endregion Estadísticas

