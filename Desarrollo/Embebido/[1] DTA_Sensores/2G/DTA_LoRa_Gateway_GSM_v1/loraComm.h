#pragma region LoRaWAN

#ifndef LoRa_h
  #include <LoRa.h>
#endif

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(20);                            // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3);                 // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(9);                     // Factor de propagación de 9
  LoRa.setCodingRate4(5);                         // Tasa de codificación 4/5
  LoRa.receive();
  DBG_PRINTLN(F("-> LoRa inicializado correctamente"));
}

void resetSPI() {
  SPI.end();
  SPI.begin();
  delay(10);
}

int getPossition(String str) {
  if (sensorList.indexOf(str) != -1) {
    int startIndex = sensorList.indexOf(startAddress); 
    for (int i = 0; i < numSensors; i++) {
      int endIndex = sensorList.indexOf(startAddress, startIndex + 1); 
      if (sensorList.substring(startIndex, endIndex).indexOf(str) != -1) return i;
      startIndex = endIndex;
    }
  }
  return -1;
}

int setPossition(String str) {
  if (sensorList.indexOf(str) != -1) return -1;
  sensorList += "," + str;
  return getPossition(str);
}

void discoverNewSensor(String data) {                 // DTA-###-0x0000
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
  Serial.print(F("\n        ~ Confirmación: ")); Serial.print(dataStr);
  LoRa.idle();
  LoRa.beginPacket();
  LoRa.print(dataStr);
  LoRa.endPacket();
  delay(100);
  DBG_PRINT(F(" [Ok]"));
  LoRa.receive();
}

void sendConfirmation(String sensorId) {
  int frec = operationMode / 2;
  frec = frec > 1 ? frec : 1;
  String confirmation = sensorId + commaChar + "a" + commaChar + TTL + commaChar + frec + commaChar;
  confirmation += String(calculateSum(confirmation));
  delay(500);
  loraTxData(confirmation);
}

void processData(String data) {                               // DTA-###-0x00000000,%Ms,%Hr,t°C,Vcc
  int addressIdx = data.indexOf(startAddress);
  int commaIdx = data.indexOf(commaChar);
  String sensorId = data.substring(addressIdx, commaIdx);
  String header = data.substring(0, commaIdx);
  int index = getPossition(sensorId);                         // Encontrar la posición del dispositivo en el arreglo
  // DBG_PRINT("[" + (String)index + "]" + sensorId);
  if (index != -1) {
    int typeIdx = data.indexOf(",d,") + 3;                    // Detectar que es un dato
    int dataIdx = data.indexOf(commaChar, typeIdx + 1) + 1;   // Eliminar el campo TTL
    String newData = data.substring(dataIdx, data.lastIndexOf(commaChar));  // Extraer datos: Ms,Hr,T,Vcc
    dataToSend[index] = newData;
    sendConfirmation(header);
  }
}

bool loraCheckData(String data) {
  int idx = data.lastIndexOf(commaChar);
  int dataCheckSum = (data.substring(idx + 1)).toInt();                       // Lee CheckSum
  data = data.substring(0, idx + 1);                                          // Elimina CheckSum
  int calculatedCheckSum = calculateSum(data);                                // Calcula CheckSum
  return data.indexOf(F(",d,")) != -1 && dataCheckSum == calculatedCheckSum;  // Es un dato y CheckSum correcto
}

void loraRxData() {
  if (LoRa.parsePacket()) {
    String data = strEmpty;
    while (LoRa.available()) {
      data += (char)LoRa.read();
    }
    if (!data.startsWith(F("DTA"))) {  DBG_PRINT(data); DBG_PRINT(F("\n     -> Dispositivo no reconocido")); return; }
    if (!loraCheckData(data)) { DBG_PRINT(F("\n     -> Error de lectura")); return; }
    if (operationMode == 0) {
      discoverNewSensor(data);
    } else {
      DBG_PRINT(F("\n     -> ")); DBG_PRINT(data); 
      processData(data);
      systemWatchDog();
    }
  }
}

#pragma endregion LoRaWAN
