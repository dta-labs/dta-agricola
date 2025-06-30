#pragma region Comunicaciones

String sendATCommand(String cmd, int wait = responseTime, bool response = false){
  gprs.println(cmd);
  String result = strEmpty;
  delay(wait);
  unsigned long iTimer = millis();
  while(millis() - iTimer <= 20000) {
    while(gprs.available()) {
      result += (char)gprs.read();
      delay(.5);
    }
    if (result.length() > 0) break;
  }
  systemWatchDog();
  if (response) DBG_PRINTLN(result);
  return result;
}

void resetSIM() {
  DBG_PRINTLN(F("Resetting SIM module..."));
  // pinMode(gprsResetPin, OUTPUT);
  // digitalWrite(gprsResetPin, LOW);
  // delay(500);    
  // digitalWrite(gprsResetPin, HIGH);
  // delay(2000);    
  gprs.begin(9600);
  delay(1000);
  gprs.listen();
  // sendATCommand(F("AT+CFUN=0"), 100);
  // delay(1000);
  sendATCommand(F("AT+CFUN=1"),500);
  delay(1000);
  // sendATCommand(F("AT+CNETSTOP")); // Detener red GSM completamente
  // delay(3000);
  // sendATCommand(F("AT+CNETSTART")); // Volver a iniciar la red GSM
  // delay(5000);
  // sendATCommand(F("AT+COPS=0"), 5000);  // Registro automático en la red
  telefono = strEmpty;
}

void commWatchDogReset(String result) {
  restartGSM = (result.indexOf(F("ERROR")) != -1 || result.indexOf(F("601")) != -1  || result.indexOf(F("604")) != -1) ? true : false;
  commError = (signalVar < 6 || QoS > 6 || restartGSM) ? commError + 1 : 0;
  if (commError != 0) { DBG_PRINT(F("commError: ")); DBG_PRINTLN(commError); }
  // if (commError == 2) resetSIM(); 
  if (commError == 4) { 
    commError = 0;
    digitalWrite(watchDogPin, LOW);
    while(1) delay(1000);
    resetSoftware();
  }
}

/*
  Intensidad de señal (RSSI) - debe ser 9 o superior: +CSQ: 14,0 OK:
  0-9: Señal muy débil.
  10-14: Señal baja.
  15-19: Señal aceptable.
  20-24: Señal buena.
  25-31: Señal excelente
*/
int getRSSI() {
  String aux = sendATCommand(F("AT+CSQ"));    // +CSQ: 25,6
  if (aux.indexOf(F("+CSQ: ")) != -1) {
    return aux.substring(aux.indexOf(F("+CSQ: ")) + 6, aux.indexOf(F(","))).toInt();
  }
  return -1; // Valor inválido
}

/*
  Tasa de error de bits (BER):
  0-3: Buena calidad de conexión.
  4-6: Conexión moderada.
  7-99: Conexión con errores significativos.
*/
int getBER() {
  String aux = sendATCommand(F("AT+CSQ"));    // +CSQ: 25,6
  if (aux.indexOf(F("+CSQ: ")) != -1) {
    return aux.substring(aux.indexOf(F(",")) + 1, aux.length()).toInt();
  }
  return -1;
}

String getTelefono() {
  String result = sendATCommand(F("AT+CCID"));
  result.replace(F("\r"), strEmpty);
  result.replace(F("\n"), strEmpty);
  result.replace(F("AT+CCID"), strEmpty);
  result.replace(F(" "), strEmpty);
  result.replace(F("OK"), strEmpty);
  result.trim();
  result = result.substring(8, result.length() - 1);
  return isNumber(result) && 10 <= result.length() && result.length() <= 11 ? result : strEmpty;
}

void setupGSM() {
  if (restartGSM) {
    DBG_PRINT(F("GSM inicializado"));
    systemWatchDog(); 
    gprs.begin(9600);
    gprs.listen();
    sendATCommand(F("AT+CFUN=1"));
    sendATCommand(F("AT+SAPBR=0,1"));
    sendATCommand(F("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\""));
    sendATCommand(F("AT+SAPBR=3,1,\"APN\",\"internet.itelcel.com\""));
    sendATCommand(F("AT+SAPBR=3,1,\"USER\",\"webgpr\""));
    sendATCommand(F("AT+SAPBR=3,1,\"PWD\",\"webgprs2002\""));
    sendATCommand(F("AT+SAPBR=1,1"));
    // telefono = "333333333333";
    int i = 10;
    while (telefono == strEmpty && i > 0) {
      telefono = getTelefono();
      delay(1000);
      systemWatchDog(); 
      Serial.print(".");
      i--;
    }
    if (telefono != strEmpty) {
      DBG_PRINT(F(" correctamente ✔ ID: ")); DBG_PRINT(telefono);
      DBG_PRINT(F(" RSSI: ")); DBG_PRINTLN(getRSSI());
    } else {
      DBG_PRINTLN(F(" con error ✘"));
      // resetSIM();
    }
  }
}

void resetData() {
  for (int i = 0; i < numSensors; i++) dataToSend[i] = strEmpty;
}

String getData() {
  bool empty = true;
  String result = strEmpty;
  for (int i = 0; i < numSensors; i++) { 
    dataToSend[i] = dataToSend[i].indexOf("DTA") == -1 ? dataToSend[i] : strEmpty;
    empty = dataToSend[i] != strEmpty ? false : empty;
    result += dataToSend[i] + (i < numSensors - 1 ? commaChar : strEmpty);
  }
  return empty ? strEmpty : result;
}

void httpRequest() {
  signalVar = getRSSI();
  if (telefono != strEmpty /*&& signalVar > 0*/) {
    DBG_PRINTLN(F("Inicio de la comunicación..."));
    QoS = getBER();
    sendATCommand(F("AT+HTTPINIT"));
    sendATCommand(F("AT+HTTPPARA=\"CID\",1"));
    String url = httpServer; url += telefono; 
    url += F("&data=["); url += getData() + F("]");
    url += F("&rx="); url += systemStart ? F("ini") : commRx ? F("Ok") : F("Er");
    url += F("&si="); url += (String)signalVar;
    url += F("&qos="); url += (String)QoS + F("\"");
    DBG_PRINTLN(url);
    sendATCommand(url);
    systemWatchDog(); 
    sendATCommand(F("AT+HTTPACTION=0"), 10000); 
    String result = sendATCommand(F("AT+HTTPREAD=0,500"), 15);
    sendATCommand(F("AT+HTTPTERM"), 30); 
    commWatchDogReset(result);
    int real = result.substring(result.indexOf('"'), result.lastIndexOf('"') + 1).length();
    int expected = result.substring(result.indexOf(F("+HTTPREAD: ")) + 11, result.indexOf(F("\n"), 21)).toInt();
    DBG_PRINTLN((String)expected + " == " + (String)real);
    systemWatchDog(); 
    if (expected != real || expected == 0 || real == 0) resetSoftware();
    setPowerLEDOn();
    result = result.substring(result.indexOf('"'), result.lastIndexOf('"') + 1);
    result.replace(F("\""), commaChar);
    int numAuxMode = result.substring(1, result.indexOf(commaChar, 1)).toInt();
    if (operationMode == 0 && numAuxMode != 0) resetData();
    operationMode = numAuxMode;
    sensorList = result.substring(result.indexOf(commaChar, 1) + 1, result.length() - 1);
    commWatchDogReset(result);
  } else { Serial.print(String(signalVar) + " " + telefono); }
  systemWatchDog(); 
}

void showVariables() {
  DBG_PRINT(F("Memoria disponible: ")); DBG_PRINTLN(freeRam());
  DBG_PRINTLN(F("» Variables: "));
  DBG_PRINT(F("  ├─ Frecuencia: ")); operationMode != 0 ? (DBG_PRINTLN(String(operationMode) + " minutos")) : (DBG_PRINTLN(F("Descubrimiento")));
  DBG_PRINT(F("  └─ Sensores: ")); 
  DBG_PRINTLN(sensorList);
}

void comunicaciones() {
  DBG_PRINTLN(F("\nComunicación con el servidor"));
  setupGSM();
  httpRequest(); 
  showVariables();
  if (systemStart) { systemStart = false; }
}

#pragma endregion Comunicaciones
