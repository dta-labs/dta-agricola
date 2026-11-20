// Simulación de la EEPROM (1 KB, borrada = 0xFF). Cuenta las escrituras reales.
#pragma once
#include "Arduino.h"

class EEPROMClass {
 public:
  uint8_t mem[1024];
  int writes = 0;
  EEPROMClass() { erase(); }
  void erase() { std::memset(mem, 0xFF, sizeof mem); writes = 0; }
  uint8_t read(int addr) { return mem[addr]; }
  void write(int addr, uint8_t v) { mem[addr] = v; writes++; }
  void update(int addr, uint8_t v) { if (mem[addr] != v) write(addr, v); }
  template <class T> T& get(int addr, T& t) { std::memcpy(&t, mem + addr, sizeof(T)); return t; }
  template <class T> const T& put(int addr, const T& t) {       // put() usa update(): solo escribe cambios
    const uint8_t* p = (const uint8_t*) &t;
    for (size_t i = 0; i < sizeof(T); i++) update(addr + (int) i, p[i]);
    return t;
  }
};
inline EEPROMClass EEPROM;
