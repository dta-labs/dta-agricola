#pragma region LoRaWAN

#ifndef LoRa_h
  #include <LoRa.h>
#endif

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(22);                            // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3);                 // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);                    // Factor de propagación de 12
  LoRa.setCodingRate4(5);                         // Tasa de codificación 4/5
  // LoRa.setSyncWord(0x12);                         // Reducir el tamaño del buffer
  // LoRa.sleep();                                   // Modo de reposo
  LoRa.receive();
  DBG_PRINTLN(F("LoRa inicializado correctamente ✔"));
}

void resetSPI() {
  SPI.end();
  SPI.begin();
  // LoRa.begin(FREQUENCY);
}

int getPossition(String valor) {
  for (int i = 0; i < numSensors; i++) {
    if (sensorList[i].equals(valor)) {
      return i;
    }
  }
  return -1;
}

// int getPossition_old(String str) {
//   if (sensorList.indexOf(str) != -1) {
//     int startIndex = sensorList.indexOf(startAddress); 
//     for (int i = 0; i < numSensors; i++) {
//       int endIndex = sensorList.indexOf(startAddress, startIndex + 1); 
//       if (sensorList.substring(startIndex, endIndex).indexOf(str) != -1) return i;
//       startIndex = endIndex;
//     }
//   }
//   return -1;
// }

int setPossition(String str) {
  // if (sensorList.indexOf(str) != -1) return -1;
  // sensorList += "," + str;
  // return getPossition(str);
  return -1;
}

void discoverNewSensor(String data) {             // DTA-GTW-0x0000
  int addressIdx = data.indexOf(startAddress);
  int commaIdx = data.indexOf(commaChar);
  String sensorId = data.substring(addressIdx, commaIdx);
  if (isHexadecimal(sensorId)) {
    int index = getPossition(sensorId);
    if (index == -1) {
      index = setPossition(sensorId);
      if (index != -1) {
        Serial.print(F("\n     [")); Serial.print(index); Serial.print(F("] <- ")); Serial.print(sensorId);
      }
    }
  }
}

// void discoverNewSensor_old(String data) {             // DTA-GTW-0x0000
//   int addressIdx = data.indexOf(startAddress);
//   int commaIdx = data.indexOf(commaChar);
//   String sensorId = data.substring(addressIdx, commaIdx);
//   if (isHexadecimal(sensorId)) {
//     int index = getPossition(sensorId);
//     if (index == -1) {
//       index = setPossition(sensorId);
//       if (index != -1) {
//         Serial.print(F("\n     [")); Serial.print(index); Serial.print(F("] <- ")); Serial.print(sensorId);
//       }
//     }
//   }
// }

void loraTxData(String dataStr) {
  // DBG_PRINT(F("\n        ~ Confirmación: ")); DBG_PRINT(dataStr);
  LoRa.beginPacket();
  LoRa.print(dataStr);
  LoRa.endPacket();
  delay(100);
  DBG_PRINT(F(" ✔ Ok"));
  LoRa.receive();
}

void sendConfirmation(String sensorId) {
  int frec = operationMode / 5;
  String confirmation = sensorId + commaChar + frec + commaChar;
  confirmation += String(calculateSum(confirmation));
  delay(50);
  loraTxData(confirmation);
}

void processData(String data, String rssi) {      // DTA-GTW-0x0000,t°C,%Hs,Vcc,rssi
  int addressIdx = data.indexOf(startAddress);
  int commaIdx = data.indexOf(commaChar);
  String sensorId = data.substring(addressIdx, commaIdx);
  // if (sensorList.indexOf(sensorIdx) == -1) return;
  int index = getPossition(sensorId);
  DBG_PRINT(" [" + (String)index + "]");
  if (index != -1) {
    String newData = data.substring(commaIdx + 1, data.lastIndexOf(commaChar));
    dataToSend[index] = newData;
    sendConfirmation(data.substring(0, commaIdx));
  }
}

bool loraCheckData(String data) {
  int idx = data.lastIndexOf(commaChar) + 1;
  int dataCheckSum = (data.substring(idx)).toInt();
  data = data.substring(0, idx);
  int calculatedCheckSum = calculateSum(data);
  return data.startsWith(F("DTA")) && dataCheckSum == calculatedCheckSum;
}

void loraRxData() {
  // LoRa.receive();
  // delay(100);
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String data = strEmpty;
    while (LoRa.available()) {
      data += (char)LoRa.read();
    }
    if (!data.startsWith(F("DTA"))) {  DBG_PRINT(data); DBG_PRINT(F("\n     → « ✘ Dispositivo no reconocido... »")); return; }
    if (!loraCheckData(data)) { DBG_PRINT(F("\n     → « ✘ Error de lectura... »")); return; }
    if (operationMode == 0) {
      discoverNewSensor(data);
    } else {
      DBG_PRINT(F("\n     → ")); DBG_PRINT(data);
      processData(data, String(LoRa.packetRssi()));

      // LoRa.receive();
      // systemWatchDog();
    }
  }
}

// void loraRxData_old() {
//   if (LoRa.parsePacket()) {
//     String data = strEmpty;
//     while (LoRa.available()) {
//       data += (char)LoRa.read();
//     }
//     if (data.indexOf(F("DTA")) == 0) {
//       if (loraCheckData(data)) {
//         if (operationMode == 0) {
//           discoverNewSensor(data);
//         } else {
//           DBG_PRINT(F("\n     → ")); DBG_PRINT(data);
//           processData(data, String(LoRa.packetRssi()));
//           DBG_PRINT(F("."));
//           // systemWatchDog();
//         }
//       } else {
//         DBG_PRINT(F("\n     → « ✘ Error de lectura... »"));
//       }
//     } else {
//       DBG_PRINT(F("\n     → « ✘ Dispositivo no reconocido... »"));
//     }
//   }
// }

#pragma endregion LoRaWAN
