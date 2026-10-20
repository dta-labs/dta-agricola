#pragma region EEPROM

void showEEPROM() {
  Serial.print(F("EEPROM ")); Serial.print(EEPROM.length());
  Serial.print(F(" ")); Serial.print((String)eeVar.status);
  Serial.print(F(" ")); Serial.print((String)eeVar.plot);
  Serial.print(F(" ")); Serial.print((String)eeVar.enlapsedTime);
  Serial.println();
}

void readEEPROM() {
  EEPROM.get(0, eeVar);
  statusVar = eeVar.status;
  plot = eeVar.plot;
  showEEPROM();
}

void updateEEPROM(unsigned long enlapsedTime) {
  statusVar.toCharArray(eeVar.status, 4);
  eeVar.plot = plot;
  eeVar.enlapsedTime = enlapsedTime;
  EEPROM.put(0, eeVar);
  showEEPROM();
}

void deleteEEPROM() {
  String("OFF").toCharArray(eeVar.status, 4);
  eeVar.plot = 0;
  eeVar.enlapsedTime = 0;
  EEPROM.put(0, eeVar);
  showEEPROM();
}

#pragma endregion EEPROM

