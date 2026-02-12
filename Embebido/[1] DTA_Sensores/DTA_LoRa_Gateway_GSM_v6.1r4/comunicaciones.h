#pragma region Comunicaciones

#define RESETDATA(x, y) for (int i = 0; i < y; i++) x[i] = String()

String sendATCommand(String cmd, int wait = responseTime, bool response = false) {
  gprs.println(cmd);
  delay(wait);  // Pequeña espera inicial tras enviar
  systemWatchDog();
  String result = "";
  unsigned long timeout = millis() + 5000; // Espera máxima de 5s
  unsigned long interByteTimer = millis();
  while (millis() < timeout) {
    while (gprs.available()) {
      char c = gprs.read();
      result += c;
      interByteTimer = millis(); // Reinicia cuando llega un byte
    }
    systemWatchDog(); 
    // Si pasaron 200ms sin recibir nada más, asumimos fin
    if (result.length() > 0 && (millis() - interByteTimer > 200)) {
      break;
    }
  }
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
  sendATCommand(F("AT+CFUN=0"), 100);
  delay(1000);
  sendATCommand(F("AT+CFUN=1"),500);
  delay(1000);
  // sendATCommand(F("AT+CNETSTOP")); // Detener red GSM completamente
  // delay(3000);
  // sendATCommand(F("AT+CNETSTART")); // Volver a iniciar la red GSM
  // delay(5000);
  // sendATCommand(F("AT+COPS=0"), 5000);  // Registro automático en la red
  telefono = strEmpty;
}

void commWatchDogReset(String result, bool readError = false) {
  restartGSM = (result.indexOf(F("ERROR")) != -1 || result.indexOf(F("601")) != -1  || result.indexOf(F("604")) != -1) ? true : false;
  commError = (signalVar < 6 || QoS > 6 || restartGSM || readError) ? commError + 1 : 0;
  if (commError != 0) { DBG_PRINT(F("commError: ")); DBG_PRINTLN(commError); }
  // if (commError == 2) resetSIM(); 
  if (commError == 1) { 
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

bool verificarRed() {
  DBG_PRINTLN(F("\n🔍 Diagnóstico de Red GSM"));
  String simStatus = sendATCommand(F("AT+CSMINS?"), 500, true);
  if (simStatus.indexOf(F("0,1")) == -1) {
    DBG_PRINTLN(F("❌ SIM no detectado"));
    return false;
  }
  String pinStatus = sendATCommand(F("AT+CPIN?"), 500, true);
  if (pinStatus.indexOf(F("READY")) == -1) {
    DBG_PRINTLN(F("❌ SIM no está listo"));
    return false;
  }
  sendATCommand(F("AT+CFUN=1"), 500);
  delay(1000);
  sendATCommand(F("AT+COPS=0"), 5000);
  delay(3000);
  String reg = sendATCommand(F("AT+CREG?"), 500, true);
  if (!(reg.indexOf(F(",1")) != -1 || reg.indexOf(F(",5")) != -1)) {
    DBG_PRINTLN(F("❌ SIM no registrado en red"));
    return false;
  }
  signalVar = getRSSI();
  QoS = getBER();
  DBG_PRINT("📶 RSSI: "); DBG_PRINT(signalVar); DBG_PRINT(F(" | "));
  DBG_PRINT("📊 BER: "); DBG_PRINTLN(QoS);
  if (signalVar <= 0 || signalVar == 99 || QoS >= 7) {
    DBG_PRINTLN(F("⚠️ Señal insuficiente o calidad muy baja"));
    return false;
  }
  return true;
}

void setupGSM() {
  if (restartGSM) {
    systemWatchDog(); 
    DBG_PRINT(F("GSM inicializado"));
    gprs.begin(9600);
    systemWatchDog(); 
    gprs.listen();
    systemWatchDog(); 
    // if (!verificarRed()) {
    //   DBG_PRINTLN(F("🚫 Red no disponible. Abortando configuración."));
    //   // return;
    // }
    sendATCommand(F("AT+CFUN=1"));
    sendATCommand(F("AT+SAPBR=0,1"));
    sendATCommand(F("AT+CDNSCFG=\"8.8.8.8\",\"8.8.4.4\""));
    sendATCommand(F("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\""));
    sendATCommand(F("AT+SAPBR=3,1,\"APN\",\"internet.itelcel.com\""));
    sendATCommand(F("AT+SAPBR=3,1,\"USER\",\"webgpr\""));
    sendATCommand(F("AT+SAPBR=3,1,\"PWD\",\"webgprs2002\""));
    sendATCommand(F("AT+SAPBR=1,1"));
    systemWatchDog(); 
    int i = 10;
    while (telefono == strEmpty && i > 0) {
      telefono = getTelefono();
      // delay(1000);
      setPowerLEDBlink();
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

String setDir() {
  String result = sendATCommand(F("AT+CDNSGIP=\"dtaamerica.com\""), 5000);
  return result.indexOf("+CDNSGIP: 1") != -1 ? domainName : domainIP;
}

String setURL(String baseURL) {
  String url = httpServer1; url += baseURL; url += httpServer2; url += telefono; 
  // String url = httpServer; url += telefono; 
  url += F("&data=["); url += getData() + F("]");
  url += F("&rx="); url += systemStart ? F("ini") : commRx ? F("Ok") : F("Er");
  url += F("&si="); url += (String)signalVar;
  url += F("&qos="); url += (String)QoS + F("\"");
  DBG_PRINTLN(url);
  sendATCommand(url);
  String result = sendATCommand(F("AT+HTTPACTION=0"), 10000, true);
  return (result.indexOf("+HTTPACTION: 0,603,0") == -1) ? sendATCommand(F("AT+HTTPREAD=0,300"), 0, true) : "";
  // return result.indexOf("+HTTPACTION: 0,603,0") == -1;
}

void httpRequest() {
  signalVar = getRSSI();
  if (telefono != strEmpty /*&& signalVar > 0*/) {
    DBG_PRINTLN(F("Inicio de la comunicación..."));
    QoS = getBER();
    // telefono = "333333333333";
    sendATCommand(F("AT+HTTPINIT"));
    sendATCommand(F("AT+HTTPPARA=\"CID\",1"));
    String result = setURL(domainName);
    if (result == "") { result = setURL(domainIP); } 
    // if (!setURL(domainName)) {
    //   setURL(domainIP);
    // } 
    // String result = sendATCommand(F("AT+HTTPREAD=0,300"), 0, true);
    // commWatchDogReset(result);
    int real = result.substring(result.indexOf('"'), result.lastIndexOf('"') + 1).length();
    int expected = result.substring(result.indexOf(F("+HTTPREAD: ")) + 11, result.indexOf(F("\n"), 21)).toInt();
    DBG_PRINTLN((String)real + " / " + (String)expected);
    systemWatchDog(); 
    // if (expected != real || expected == 0 || real == 0) while(1) delay(1000);
    sendATCommand(F("AT+HTTPTERM"), 30); 
    if (expected == real && expected != 0) {
      isPowerLEDBlink = false;
      setPowerLEDOn();
      result = result.substring(result.indexOf('"'), result.lastIndexOf('"') + 1);
      result.replace(F("\""), commaChar);
      int numAuxMode = result.substring(1, result.indexOf(commaChar, 1)).toInt();
      // if (operationMode == 0 && numAuxMode != 0) RESETDATA(dataToSend, numSensors);
      operationMode = numAuxMode;
      sensorList = result.substring(result.indexOf(commaChar, 1) + 1, result.length() - 1);
      if (sensorList) RESETDATA(dataToSend, numSensors);
    }
    commWatchDogReset(result, expected != real);
  } else { 
    restartGSM = true;
    commError++;
    isPowerLEDBlink = true;
    DBG_PRINTLN("Teléfono: " + telefono + " Señal: " + String(signalVar)); 
  }
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
  systemWatchDog(); 
  DBG_PRINTLN(F("\nComunicación con el servidor"));
  setupGSM();
  httpRequest(); 
  showVariables();
  systemStart &= false;
}

#pragma endregion Comunicaciones
