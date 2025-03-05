#pragma region LoRaWAN

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(20);                    // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3);         // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);            // Factor de propagación de 12
  LoRa.setCodingRate4(5);                 // Tasa de codificación 4/5
  LoRa.idle();
  Serial.println(F("LoRa inicializado correctamente..."));
}

void txData(String dataStr) {
  dataStr = NODE_ID + "," + dataStr + ",";
  dataStr += calculateSum(dataStr);
  Serial.println(dataStr);
  LoRa.beginPacket();
  LoRa.print(dataStr);
  LoRa.endPacket();
  delay(100);
  Serial.println(F("Dato enviado correctamente..."));
  LoRa.sleep();
}

#pragma endregion LoRaWAN

