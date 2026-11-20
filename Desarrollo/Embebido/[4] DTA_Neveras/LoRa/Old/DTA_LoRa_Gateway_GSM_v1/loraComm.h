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
  LoRa.idle();
  Serial.print(F("\n        ~ Confirmación: ")); Serial.print(dataStr);
  LoRa.beginPacket();
  LoRa.print(dataStr);
  LoRa.endPacket();
  delay(100);
  DBG_PRINT(F(" [Ok]"));
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

bool loraCheckData(String trama) {
  if (!trama.startsWith("DTA-") || trama.indexOf("0x0") != -1) return false;
  int idx1 = trama.indexOf(',');
  int idx2 = trama.indexOf(',', idx1 + 1);
  int idx3 = trama.indexOf(',', idx2 + 1);
  int idx4 = trama.indexOf(',', idx3 + 1);
  int idx5 = trama.indexOf(',', idx4 + 1);
  int idx6 = trama.indexOf(',', idx5 + 1);
  if (idx1 == -1 || idx2 == -1 || idx3 == -1 || idx4 == -1 || idx5 == -1 || idx6 == -1) return false;
  String header     = trama.substring(0, idx1);               // DTA-Indicador-Id
  String type       = trama.substring(idx1 + 1, idx2);
  String ttl        = trama.substring(idx2 + 1, idx3);
  String val1       = trama.substring(idx3 + 1, idx4);
  String val2       = trama.substring(idx4 + 1, idx5);
  String Vcc        = trama.substring(idx5 + 1, idx6);
  String CS         = trama.substring(idx6 + 1);
  String tramaSinCS = trama.substring(0, idx6 + 1);           // Todo hasta la última coma
  if (!(type == "a" || type == "d")) return false;            // Validar DataType
  if (!(0 <= ttl.toInt() && ttl.toInt() <= 5)) return false;  // Validar TTL
  int hrVal = val1.toInt();
  if (!(-1 <= hrVal && hrVal <= 100)) return false;           // Validar Hr & Irms1
  if (header.indexOf("SHT") != -1) {
    float tVal = val2.toFloat();
    if (!(-25.0 <= tVal && tVal <= 75.0)) return false;       // Validar T
  }
  if (header.indexOf("SCT") != -1) {
    int hri2Val = val1.toInt();
    if (!(-1 <= hri2Val && hri2Val <= 100)) return false;     // Validar Irms2
  }
  float vccVal = Vcc.toFloat();
  if (!(2.0 <= vccVal && vccVal <= 6.0)) return false;        // Validar Vcc
  if (calculateSum(tramaSinCS) != CS.toInt()) return false;   // Validar checksum
  return true;
}

void loraRxData() {
  if (LoRa.parsePacket()) {
    String data = strEmpty;
    while (LoRa.available()) data += (char)LoRa.read();
    if (!loraCheckData(data)) { 
      DBG_PRINT(F("\n     -> ")); 
      DBG_PRINT(data); 
      DBG_PRINT(F("Error de lectura / Dispositivo no reconocido")); 
      return; 
    }
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
