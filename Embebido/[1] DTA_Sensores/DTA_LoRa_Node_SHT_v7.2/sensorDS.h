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
  sensorDS.begin();
  byte iter = 10;
  DeviceAddress sensorAddress;
  while (iter--) {
    if (sensorDS.getAddress(sensorAddress, 0)) return formatAddress(sensorAddress);
    delay(200);
    sensorDS.begin();
  }
  Serial.println(F("  ✗ Sensor de temperatura no detectado después de varios intentos."));
  return F("0x00");
}

void getTemperature() {
  h_actual = -1;
  static float muestras[NUM_MUESTRAS];
  for (byte i = 0; i < NUM_MUESTRAS; i++) {
    sensorDS.requestTemperatures();
    // delay(1000);
    float val = sensorDS.getTempCByIndex(0); // Leer el valor del sensor
    if (val != -127.0 && val != 85.0 && -30.0 < val && val < 70.0) {
      muestras[i] = val;
    } else { 
      i--; 
    }
  }
  t_actual = estimadorAdaptativo(muestras, NUM_MUESTRAS);
}

#pragma endregion DallasSensor

