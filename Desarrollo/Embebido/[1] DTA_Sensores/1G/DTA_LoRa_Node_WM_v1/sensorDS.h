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
  Serial.print(F("  • Sensor DS: "));
  return formatAddress(sensorAddress);
}

void getTemperature() {
  h_actual = -1;
  float t_medicion = -999;
  byte iter = 0;
  do {
    sensorDS.requestTemperatures();
    t_medicion = sensorDS.getTempCByIndex(0); // Leer el valor del sensor
    wdt_reset();
    iter++;
  } while ((t_medicion == -127.0 || t_medicion == 85.0 || t_medicion <= -30.0 || t_medicion >= 70.0) && iter < 3);
  t_actual = t_medicion != -999 && t_medicion != -127.0 && t_medicion != 85.0 && t_medicion > -30.0 && t_medicion < 70.0 ? t_medicion : t_actual;
}

#pragma endregion DallasSensor

