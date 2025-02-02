#pragma region LoRaWAN

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(22);                            // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3);                 // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);                    // Factor de propagación de 12
  LoRa.setCodingRate4(5);                         // Tasa de codificación 4/5
  Serial.println(F("LoRa inicializado correctamente..."));
}

int getPossition(String strArr[], String str) {
  for (int i = 0; i < 10; i++) if (strArr[i] == str) return i;
  return -1;
}

int setPossition(String strArr[], String str) {
  for (int i = 0; i < 10; i++) { 
    if (strArr[i] == "0x0" || strArr[i] == "") {
      strArr[i] = str;
      return i;
    }
  }
  return -1;
}

void discoverNewSensor(String data) {             // DTA-GTW-0x0000
  int addressIdx = data.indexOf("0x");
  int commaIdx = data.indexOf(",");
  String sensorId = data.substring(addressIdx, commaIdx);
  int index = getPossition(sensorList, sensorId);
  if (index == -1) index = setPossition(sensorList, sensorId);
  if (index != -1) dataToSend[index] = sensorId;
  for (int i = 0; i < 10; i++) dataToSend[i] = sensorList[i] != "" ? sensorList[i] : "0x0";
}

void processData(String data, String rssi) {      // DTA-GTW-0x0000,t°C,%Hs,Vcc,rssi
  int addressIdx = data.indexOf("0x");
  int commaIdx = data.indexOf(",");
  String sensorId = data.substring(addressIdx, commaIdx);
  int index = getPossition(sensorList, sensorId);
  if (index != -1) {
    data = data.substring(commaIdx + 1, data.lastIndexOf(","));
    dataToSend[index] = data + "," + rssi;
  }
}

void rxData() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String data = "";
    while (LoRa.available()) {
      data += (char)LoRa.read();
    }
    if (data.indexOf("DTA") == 0 && checkData(data)) {
      if (operationMode == "N") {
        processData(data, String(LoRa.packetRssi()));
      } else {
        discoverNewSensor(data);
      }
    } else {
      Serial.print(F("Error de lectura... "));
    }
    Serial.println("\n" + data);
  }
}

#pragma endregion LoRaWAN
