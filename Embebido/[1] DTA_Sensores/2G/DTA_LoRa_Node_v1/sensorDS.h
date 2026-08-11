#pragma region DallasSensor 

#include <OneWire.h>
#include <DallasTemperature.h>

#define pinDS 3                           // Pin del sensor de temperatura
OneWire owObject(pinDS);
DallasTemperature sensorDS(&owObject);

String formatAddress(DeviceAddress sensorAddress){
  String address = "";
  for (byte i = 0; i < 8; i++) {
    address += sensorAddress[i] < 0x10 ? ("0" + String(sensorAddress[i], HEX)) : String(sensorAddress[i], HEX);
  }
  return address;
}

String setupDS() {
  byte iter = 10;
  DeviceAddress sensorAddress;
  while (iter--) {
    sensorDS.begin();
    if (sensorDS.getAddress(sensorAddress, 0)) break;
    if (iter == 0) return noSensor;
    delay(200);
  }
  sensorType = DS;
  Serial.print(F("  - Sensor DS: "));
  return formatAddress(sensorAddress);
}

float getTemperature(float t_act) {
  byte iter = 3;
  float t = -999;
  do {
    sensorDS.requestTemperatures();
    t = sensorDS.getTempCByIndex(0); // Leer el valor del sensor
    wdt_reset();
    iter--;
  } while ((t == -127.0 || t == 85.0 || t <= -30.0 || t >= 70.0) && iter > 0);
  return t != -999 && t != -127.0 && t != 85.0 && t > -30.0 && t < 70.0 ? t : t_act;
}

#pragma endregion DallasSensor

