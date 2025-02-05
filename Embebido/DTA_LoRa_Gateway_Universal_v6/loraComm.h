#pragma region LoRaWAN

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(22);                            // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3);                 // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);                    // Factor de propagación de 12
  LoRa.setCodingRate4(5);                         // Tasa de codificación 4/5
  Serial.println(F("LoRa inicializado correctamente..."));
}

int getPossition(String str) {
  for (int i = 0; i < 5; i++) if (sensorList[i] == str) return i;
  return -1;
}

int setPossition(String str) {
  for (int i = 0; i < 5; i++) { 
    if ((sensorList[i] == baseAddress || sensorList[i] == strEmpty) && str.indexOf(startAddress) == 0) {
      sensorList[i] = str;
      return i;
    }
  }
  return -1;
}

void discoverNewSensor(String data) {             // DTA-GTW-0x0000
  int addressIdx = data.indexOf(startAddress);
  int commaIdx = data.indexOf(commaChar);
  String sensorId = data.substring(addressIdx, commaIdx);
  int index = getPossition(sensorId);
  if (index == -1) index = setPossition(sensorId);
  for (int i = 0; i < 5; i++) dataToSend[i] = sensorList[i] != "" ? sensorList[i] : baseAddress;
}

void processData(String data, String rssi) {      // DTA-GTW-0x0000,t°C,%Hs,Vcc,rssi
  int addressIdx = data.indexOf(startAddress);
  int commaIdx = data.indexOf(commaChar);
  String sensorId = data.substring(addressIdx, commaIdx);
  int index = getPossition(sensorId);
  if (index != -1) {
    data = data.substring(commaIdx + 1, data.lastIndexOf(commaChar));
    // dataToSend[index] = data + commaChar + rssi;
    dataToSend[index] = data;
  }
}

void rxData() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String data = strEmpty;
    while (LoRa.available()) {
      data += (char)LoRa.read();
    }
    if (data.indexOf(F("DTA")) == 0 && checkData(data)) {
      if (operationMode == 0) {
        discoverNewSensor(data);
      } else {
        processData(data, String(LoRa.packetRssi()));
      }
    } else {
      Serial.print(F("Error de lectura... "));
    }
    Serial.print("\n" + data);
  }
}

#pragma endregion LoRaWAN
