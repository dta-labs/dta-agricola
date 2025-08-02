#include <SPI.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#pragma region Variables

#define pinDS 4                           // Pin del sensor de temperatura
OneWire owObject(pinDS);
DallasTemperature sensorDS(&owObject);
float temp;

#define DESV_EST_UMBRAL 0.3
#define NUM_LECTURAS 30
float temp_hist[NUM_LECTURAS] = {0};
uint8_t index = 0;

#pragma endregion Variables

#pragma region Programa Principal

void setup() {
  Serial.begin(19200);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nTest sensor de temperatura Ds18B20"));
  sensorDS.begin();
  delay(250);
  if (!detectarSensor()) {
    Serial.println(F("❌ No se logró detectar el sensor después de varios intentos."));
    while (true);                         // Detener ejecución si falla
  }
  String id = getAddress();
  id.toUpperCase();
  Serial.print(F("Configurción:"));
  Serial.print(F("  -> ID: ")); Serial.println(id);
}

void loop() {
  Serial.print("Temp:");
  float temp = getTemperature();
  if (isnan(temp) || temp == -127.0) {
    Serial.println(F("⚠️ Lectura inválida o sensor desconectado."));
  } else {
    Serial.print(temp);
    Serial.println(F("°C"));
  }
  delay(1000);
}

#pragma endregion Programa Principal

#pragma region Sensor Ds18B20

bool detectarSensor() {
  DeviceAddress sensorAddress;
  byte intentos = 5;
  for (uint8_t i = 0; i < intentos; i++) {
    if (sensorDS.getAddress(sensorAddress, 0)) return true;
    delay(200);
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
  sensorDS.requestTemperatures();
  return sensorDS.getTempCByIndex(0);
}

#pragma endregion Sensor Ds18B20

