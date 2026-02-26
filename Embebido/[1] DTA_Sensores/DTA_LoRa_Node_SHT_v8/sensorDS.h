#pragma region DallasSensor 

#include <OneWire.h>
#include <DallasTemperature.h>

#define pinDS 4                           // Pin del sensor de temperatura
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
  Serial.println(F("  • Sensor DS inicializado correctamente..."));
  return formatAddress(sensorAddress);
}

void getTemperature() {
  h_actual = -1;
  do {
    sensorDS.requestTemperatures();
    t_actual = sensorDS.getTempCByIndex(0); // Leer el valor del sensor
    wdt_reset();
  } while (t_actual == -127.0 || t_actual == 85.0 && t_actual <= -30.0 || t_actual >= 70.0);
}

#pragma endregion DallasSensor

