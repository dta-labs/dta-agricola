#pragma region LoRaWAN

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(22);                            // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3);                 // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);                    // Factor de propagación de 12
  LoRa.setCodingRate4(5);                         // Tasa de codificación 4/5
  LoRa.sleep();
  DBG_PRINTLN(F("LoRa inicializado correctamente..."));
}

int getPossition(String str) {
  for (int i = 0; i < numSensors; i++) if (sensorList[i] == str) return i;
  // DBG_PRINT(F(" -> gP"));
  return -1;
}

int setPossition(String str) {
  for (int i = 0; i < numSensors; i++) { 
    if ((sensorList[i] == baseAddress || sensorList[i] == strEmpty) && str.indexOf(startAddress) == 0) {
      sensorList[i] = str;
      return i;
    }
  }
  // DBG_PRINT(F(" -> sP"));
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

void loraTxData(String dataStr) {
  DBG_PRINT(F("\n        ~ Confirmación: ")); DBG_PRINT(dataStr);
  LoRa.beginPacket();
  LoRa.print(dataStr);
  LoRa.endPacket();
  delay(100);
  DBG_PRINT(F(" [Ok]"));
  LoRa.sleep();
}

void sendConfirmation(String sensorId) {
  int frec = operationMode / 2;
  String confirmation = sensorId + commaChar + frec + commaChar;
  confirmation += String(calculateSum(confirmation));
  delay(500);
  loraTxData(confirmation);
}

void processData(String data, String rssi) {      // DTA-GTW-0x0000,t°C,%Hs,Vcc,rssi
  int addressIdx = data.indexOf(startAddress);
  int commaIdx = data.indexOf(commaChar);
  String sensorId = data.substring(addressIdx, commaIdx);
  int index = getPossition(sensorId);
  if (index != -1) {
    String newData = data.substring(commaIdx + 1, data.lastIndexOf(commaChar));
    // dataToSend[index] = newData + commaChar + rssi;
    dataToSend[index] = newData;
    sendConfirmation(data.substring(0, commaIdx));
  }
}

bool loraCheckData(String data) {
  int idx = data.lastIndexOf(commaChar) + 1;
  int dataCheckSum = (data.substring(idx)).toInt();
  data = data.substring(0, idx);
  int calculatedCheckSum = calculateSum(data);
  return dataCheckSum == calculatedCheckSum;
}

void loraRxData() {
  if (LoRa.parsePacket()) {
    String data = strEmpty;
    while (LoRa.available()) {
      data += (char)LoRa.read();
    }
    if (data.indexOf(F("DTA")) == 0) {
      if (loraCheckData(data)) {
        if (operationMode == 0) {
          discoverNewSensor(data);
        } else {
          DBG_PRINT(F("\n     └─ ")); DBG_PRINT(data);
          processData(data, String(LoRa.packetRssi()));
        }
      } else {
        DBG_PRINT(F("\n     └─ « Error de lectura... »"));
      }
    } else {
      DBG_PRINT(F("\n     └─ « Dispositivo no reconocido... »"));
    }
  }
}

#pragma endregion LoRaWAN
