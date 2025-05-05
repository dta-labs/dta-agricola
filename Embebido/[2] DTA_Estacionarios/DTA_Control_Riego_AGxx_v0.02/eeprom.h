#pragma region EEPROM

#ifndef EEPROM_h
  #include <EEPROM.h>
#endif

const byte flagEscrito = 42;

struct Datos {
  bool statusVar;
  unsigned long activationTime[8];
  char systemType[8];
};

void guardarEstado() {
  Datos datos;
  datos.statusVar = statusVar == "ON" ? true : false;
  for (int i = 0; i < 8; i++) {
    datos.activationTime[i] = activationTime[i];
    datos.systemType[i] = systemType[i];
  }
  EEPROM.put(1, datos);
  EEPROM.put(0, flagEscrito);
}

void recuperarEstado() {
  Datos datos;
  EEPROM.get(1, datos);
  statusVar = datos.statusVar ? "ON" : "OFF";
  for (int i = 0; i < 8; i++) {
    activationTime[i] = datos.activationTime[i];
    systemType[i] = datos.systemType[i];
  }
  return datos;
}

bool hayEstadoGuardado() {
  return EEPROM.read(0) == flagEscrito;
}

#pragma endregion EEPROM
