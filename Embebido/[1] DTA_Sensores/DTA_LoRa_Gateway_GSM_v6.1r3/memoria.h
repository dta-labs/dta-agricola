#pragma region Memoria

#ifndef EEPROM_h
  #include <EEPROM.h>
#endif

bool hayDatos() {
  byte result = 0;
  EEPROM.get(0, result);
  return result == 85;      // 01010101
}

void setDatos() {
  EEPROM.put(0, 85);        // 01010101
}

void guardarDatos() {
  for (int i = 0; i < numSensors; i++){
    sensorIds.sensorList[i] = sensorList[i];
  }
  EEPROM.put(1, sensorIds);  // Guarda el objeto en la dirección 0
}

void recuperarDatos() {
  SensorData datos;
  EEPROM.get(1, datos);
  for (int i = 0; i < numSensors; i++){
    sensorList[i] = datos.sensorList[i];
  }
}

#pragma endregion Memoria
