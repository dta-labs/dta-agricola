#pragma region Persistent

void getDataFromEEPROM() {
  Config auxConfig;
  EEPROM.get(eeAddress, auxConfig);
  sysConfig = auxConfig.idx ? auxConfig : sysConfig;
}

void setDataToEEPROM() {
  EEPROM.put(eeAddress, sysConfig);
}

#pragma endregion Persistent