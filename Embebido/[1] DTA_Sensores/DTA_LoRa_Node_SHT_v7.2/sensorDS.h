#pragma region DallasSensor 

#include <OneWire.h>
#include <DallasTemperature.h>

#define pinDS 4                           // Pin del sensor de temperatura
OneWire owObject(pinDS);
DallasTemperature sensorDS(&owObject);
byte moisture;

bool detectarSensor() {
  DeviceAddress sensorAddress;
  byte intentos = 5;
  for (uint8_t i = 0; i < intentos; i++) {
    if (sensorDS.getAddress(sensorAddress, 0)) return true;
    delay(200);
  }
  return false;
}

void setupDS() {
  sensorDS.begin();
  byte iter = 10;
  while (!detectarSensor() && iter > 0) {
    delay(250);
    sensorDS.begin();
    iter--;
  }
  if (!detectarSensor() && iter == 0) Serial.println(F("  ✗ No se logró detectar el sensor después de varios intentos."));
}

void getTemperature() {
  sensorDS.requestTemperatures();
  h_actual = -1;
  t_actual = sensorDS.getTempCByIndex(0);
  // if (isnan(t_actual) || t_actual == -127.0) {
  //   Serial.println(F("⚠️ Lectura inválida o sensor desconectado."));
  // } else {
  //   Serial.print(t_actual);
  //   Serial.println(F("°C"));
  // }
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

#pragma endregion DallasSensor

