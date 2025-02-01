#pragma region LoRaWAN

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(22);                            // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3);                 // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);                    // Factor de propagación de 12
  LoRa.setCodingRate4(5);                         // Tasa de codificación 4/5
  Serial.println(F("LoRa inicializado correctamente..."));
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

void discoverNewSensor(String data) {             // DTA-GTW-0x0000
  int addressIdx = data.indexOf("0x");
  int commaIdx = data.indexOf(",");
  String sensorId = data.substring(addressIdx, commaIdx);
  int index = getPossition(sensorList, sensorId);
  if (index == -1) {
    index = setPossition(sensorList, sensorId);
    if (index != -1) dataToSend[index] = sensorId;
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
    Serial.println(data);
  }
}

#pragma endregion LoRaWAN
