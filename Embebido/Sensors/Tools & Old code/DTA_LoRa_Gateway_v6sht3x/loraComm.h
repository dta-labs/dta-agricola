#pragma region LoRaWAN

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(22);            // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3); // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);    // Factor de propagación de 12
  LoRa.setCodingRate4(5);         // Tasa de codificación 4/5
}

void processData(String data, String rssi) {      // DTA-GTW-00x0000,t°C,%Hs,Vcc,rssi
  data = data.substring(8, data.lastIndexOf(","));
  String sensorId = data.substring(0, 7);
  int index = getPossition(sensorList, sensorId);
  if (index != -1){
    dataToSend[index] = data.substring(8) + "," + rssi;
  }
}

void rxData() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String data = "";
    while (LoRa.available()) {
      data += (char)LoRa.read();
    }
    if (data.indexOf("DTA-S") == 0 && checkData(data)) {
      processData(data, String(LoRa.packetRssi()));
    } else {
      Serial.print(F("Error de lectura... "));
    }
    Serial.println(data);
  }
}

#pragma endregion LoRaWAN
