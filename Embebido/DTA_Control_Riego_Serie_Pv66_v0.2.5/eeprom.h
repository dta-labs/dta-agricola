// #pragma region EEPROM

// void clearEEPROM() {
//   int length = EEPROM.length();
//   for (int i = 0; i < length; i++) {
//     EEPROM.put(i, 0);
//   }
// }

// void readEEPROM() {
//   EEPROM.get(0, eeVar);
//   if (eeVar.status == -5.0 || eeVar.status == 5.0) {
//     statusVar = (eeVar.status > 0 ? "ON" : "OFF");
//     directionVar = (eeVar.direction > 0 ? "FF" : "RR");
//     sensorPresionVar = eeVar.presion;
//     lat_central = eeVar.lat_central;
//     lon_central = eeVar.lon_central;
//     positionIni = eeVar.positionIni;
//     positionEnd = eeVar.positionEnd;
//     velocityVar = eeVar.velocity;
//     endGunVar = (eeVar.endGun > 0 ? "T" : "F");
//     // dataVar = eeVar.data;
//     Serial.print(F("EEPROM: ")); Serial.print(statusVar);
//     Serial.print(F(" ")); Serial.print(directionVar);
//     Serial.print(F(" ")); Serial.print(sensorPresionVar);
//     Serial.print(F(" ")); Serial.print(String(lat_central, 5));
//     Serial.print(F(" ")); Serial.print(String(lon_central, 5));
//     Serial.print(F(" ")); Serial.print(positionIni);
//     Serial.print(F(" ")); Serial.print(positionEnd);
//     Serial.print(F(" ")); Serial.print(velocityVar);
//     Serial.print(F(" ")); Serial.println(endGunVar);
//     // Serial.print(F(" ")); Serial.println(dataVar);
//   } else {
//     clearEEPROM();
//   }
// }

// void updateEEPROM() {
//   float st = (statusVar == "ON") ? 5.0 : -5.0;
//   float di = (directionVar == "FF") ? 5.0 : -5.0;
//   float eg = (endGunVar == "T") ? 5.0 : -5.0;
//   if (eeVar.status != st || eeVar.direction != di || eeVar.presion != sensorPresionVar || eeVar.lat_central != lat_central || eeVar.lon_central != lon_central || eeVar.positionIni != positionIni || eeVar.positionEnd != positionEnd || eeVar.velocity != velocityVar || eeVar.endGun != eg) {
//     eeVar.status = st;
//     eeVar.direction = di;
//     eeVar.presion = sensorPresionVar;
//     eeVar.lat_central = lat_central;
//     eeVar.lon_central = lon_central;
//     eeVar.positionIni = positionIni;
//     eeVar.positionEnd = positionEnd;
//     eeVar.velocity = velocityVar;
//     eeVar.endGun = eg;
//     // eeVar.data = dataVar;
//     EEPROM.put(0, eeVar);
//     Serial.println(F("EEPROM updated successfully!"));
//   }
  
// }

// #pragma endregion EEPROM

