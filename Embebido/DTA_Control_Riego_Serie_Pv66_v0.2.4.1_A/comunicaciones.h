
#pragma region Comunicaciones

void systemWatchDog() {
  wdt_reset();
  pinMode(watchDogPin, OUTPUT);         // Sink current to drain charge from C2
  digitalWrite(watchDogPin, LOW);
  delay(100);                           // Give enough time for C2 to discharge (should discharge in 50 ms)     
  pinMode(watchDogPin, INPUT);          // Return to high impedance
}

String parse(String dataString, char separator, int index) {
  int found = 0;
  int strIndex[] = {0, -1};
  int maxIndex = dataString.length()-1;
  for(int i = 0; i <= maxIndex && found <= index; i++) {
    if(dataString.charAt(i) == separator || i == maxIndex) {
        found++;
        strIndex[0] = strIndex[1]+1;
        strIndex[1] = (i == maxIndex) ? i+1 : i;
    }
  }
  return found > index ? dataString.substring(strIndex[0], strIndex[1]) : "";
}

void setupGSM() {
  if (restartGSM) {
    Serial.println(F("Setup GSM"));
    gprs.begin(9600);
    gprs.listen();
    if (testComm) { testComunicaciones(); }
    // gprs.println(F("AT+CBAND=PCS_MODE"));		// PGSM_MODE, DCS_MODE, PCS_MODE, EGSM_DCS_MODE, GSM850_PCS_MODE, ALL_BAND
    // getResponse(15, testComm); 
    // gprs.println(F("AT+CBAND=ALL_BAND"));
    // getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\""));
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"APN\",\"internet.itelcel.com\""));
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"USER\",\"webgpr\""));
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"PWD\",\"webgprs2002\""));
    getResponse(15, testComm); 
    gprs.println(F("AT+CFUN=1"));               // Funcionalidad 0 mínima 1 máxima
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=1,1"));
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=2,1"));
    getResponse(15, testComm); 
  }
  systemWatchDog();
}

void testComunicaciones() {
  gprs.println(F("AT+IPR=9600"));      // Velocidad en baudios?
  getResponse(15, testComm); 
  gprs.println(F("AT"));               // Tarjeta SIM Lista? OK
  getResponse(15, testComm); 
  // gprs.println(F("AT+CGMI"));          // Fabricante del dispositivo?
  // getResponse(15, testComm); 
  // gprs.println(F("ATI"));              // Información del producto?
  // getResponse(15, testComm); 
  // gprs.println(F("AT+CGSN"));          // Número de serie?
  // getResponse(15, testComm); 
  // gprs.println(F("AT+IPR?"));          // Velocidad en baudios?
  // getResponse(15, testComm); 
  // gprs.println(F("AT+CBC"));           // Estado de la bateriía
  // getResponse(15, testComm); 
  gprs.println(F("AT+CFUN?"));         // Funcionalidad 0 mínima 1 máxima
  getResponse(15, testComm); 
  gprs.println(F("AT+CGATT=1"));       // Tarjeta SIM insetada? +CPIN: READY OK
  getResponse(15, testComm); 
  gprs.println(F("AT+CPIN?"));         // Tarjeta SIM insetada? +CPIN: READY OK
  getResponse(15, testComm); 
  gprs.println(F("AT+WIND=1"));        // Indicación de tarjeta SIM insetada? +CPIN: READY OK
  getResponse(15, testComm); 
  gprs.println(F("AT+CREG?"));         // Tarjeta SIM registrada? +CREG: 0,1 OK 
  getResponse(15, testComm); 
  gprs.println(F("AT+CGATT?"));        // Tiene GPRS? +CGATT: 1 OK
  getResponse(15, testComm); 
  gprs.println(F("AT+CSQ"));           // Calidad de la señal -  debe ser 9 o superior: +CSQ: 14,0 OK
  getResponse(15, testComm); 
  // gprs.println(F("AT+CCLK?"));         // Fecha y Hora?
  // getResponse(15, testComm); 
  // gprs.println(F("AT+COPS?"));         // Comañía telefónica?
  // getResponse(15, testComm); 
}

void comunicaciones() {
  Serial.println(F("Server communication"));
  positionVar = getPosition();
  systemWatchDog();
  String data = httpRequest();                                                       // Get Settings from HTTP
  data = data.substring(data.indexOf('"'), data.indexOf("OK"));
  // Para test
  if (testFunc) {
    data = (boolData) ? "\"ON\"FF\"0\"OFF\"30.73081\"-107.86308\"PC\"1\"0\"360\"50\"F\"" : "\"ON\"RR\"0\"OFF\"30.73081\"-107.86308\"PC\"1\"0\"360\"50\"F\"";
    commError = 0;
    boolData = boolData == true ? false : true;
  }
  // data = data != "" ? data : eeVar.data;
  if (data != "" && (data.indexOf("ON") != -1 || data.indexOf("OFF") != -1)) {
    setVariables(data);
    updateEEPROM();
  } else {
    Serial.print(F("lat_central: ")); Serial.print(lat_central, 2); Serial.print(F("lon_central: ")); Serial.println(lon_central, 2);
    Serial.println(F("data: Error!"));
  }
}

void setVariables(String data) {
  Serial.print(F("data: "));
  Serial.println(data);
  commRx = (data != "") ? true : false;
  int idx = data.indexOf('"');
  String aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  statusVar = (aux == "ON" || aux == "OFF") ? aux : statusVar;                       // > status
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  directionVar = (aux == "FF" || aux == "RR") ? aux : directionVar;                  // > direction
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  sensorPresionVar = (aux == "") ? sensorPresionVar : (aux.toFloat() > 0) ? aux.toFloat() : 0;                 // > sensor de presión
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  autoreverseVar = (aux == "ON" || aux == "OFF") ? aux : autoreverseVar;             // > autoreverse
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  lat_central = (aux != "") ? aux.toFloat() : lat_central;                           // > lat_central
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  lon_central = (aux != "") ? aux.toFloat() : lon_central;                           // > lon_central
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  deviceType = (aux != "") ? aux : deviceType;                                       // > deviceType
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  int bindsNo = (aux != "") ? aux.toInt() : 0;                                       // > bins
  if (bindsNo > 0) {
    binsVar = data.substring(idx + 1);
    for (int i = 0; i < bindsNo; i++) {
      idx = data.indexOf('"', idx + 1);
      positionIni = (data.substring(idx + 1, data.indexOf('"', idx + 1))).toInt();   // inicio
      idx = data.indexOf('"', idx + 1);
      positionEnd = (data.substring(idx + 1, data.indexOf('"', idx + 1))).toInt();   // fin
      idx = data.indexOf('"', idx + 1);
      int bindVel = (data.substring(idx + 1, data.indexOf('"', idx + 1))).toInt();   // velocidad
      idx = data.indexOf('"', idx + 1);
      String bindEndGun = (data.substring(idx + 1, data.indexOf('"', idx + 1)));     // end gun
      if (positionIni <= positionVar && positionVar < positionEnd) {
        velocityVar = (bindVel > 100) ? 100 : (bindVel < 0) ? 0 : bindVel;
        endGunVar = (bindEndGun == "T") ? "ON" : "OFF";
        break;
      }
    }
  }
  systemWatchDog();
}

String httpRequest() {
  gprs.listen();
  String param1 = "&st=" + statusVar;
  String param2 = "&sa=" + (String)(isSequrity ? "true" : "false");
  String param3 = "&di=" + directionVar;
  String param4 = "&vo=" + (String)(controlVoltaje() ? "true" : "false");
  String param5 = "&ar=" + activateAutoreverse;
  String param6 = "&sp=" + (String)velocityVar;
  String param7 = "&pr=" + (String)controlPresionAnalogica();
  String param8 = "&po=" + String(positionVar, 1);
  String param9 = "&la=" + String(lat_actual, 5);
  String param10 = "&lo=" + String(lon_actual, 5);
  String param11 = "&er=" + (String)errorGPS;
  String param12 = "&rx=" + (String)(commRx ? "Ok" : "Er");
  signalVar = getSignalValue();
  String param13 = "&si=" + (String)signalVar + "\"";
  // Serial.println(httpServer + param1 + param2 + param3 + param4 + param5 + param6 + param7 + param8 + param9 + param10 + param11 + param12 + param13);
  gprs.println(F("AT+HTTPINIT"));
  getResponse(15, true); 
  gprs.println(httpServer + param1 + param2 + param3 + param4 + param5 + param6 + param7 + param8 + param9 + param10 + param11 + param12 + param13);
  getResponse(25, true); 
  systemWatchDog();
  gprs.println(F("AT+HTTPACTION=0"));
  String result = getResponse(6000, true); 
  systemWatchDog();
  restartGSM = (result.indexOf("ERROR") != -1 || result.indexOf("601") != -1  || result.indexOf("604") != -1 || signalVar < 6) ? true : false;
  gprs.println(F("AT+HTTPREAD"));
  result = getResponse(0, false);
  gprs.println(F("AT+HTTPTERM"));
  getResponse(30, false); 
  commWatchDogReset(signalVar);
  systemWatchDog();
  return result;
}

String getResponse(int wait, bool response){
  String result = "";
  delay(wait);
  systemWatchDog();
  unsigned long iTimer = millis();
  while(!gprs.available() && (millis() - iTimer) <= 1000) {
    delay(5);    
  }
  // while(!gprs.available()) {}
  while(gprs.available() > 0) {
    result += (char)gprs.read();
    delay(1.5);
  }
  result = result != "" ? result : "ERROR";
  if (response) {
    Serial.println(result);
  }
  // systemWatchDog();
  return result;
}

int getSignalValue() {
  gprs.println(F("AT+CSQ"));           // Calidad de la señal -  debe ser 9 o superior: +CSQ: 14,0 OK
  String aux1 = getResponse(15, false);
  String aux2 = parse(aux1, ' ', 1);
  String aux3 = parse(aux2, ',', 0);
  int result = aux3.toInt(); 
  return result;
}

void commWatchDogReset(int signalValue) {
  commError += (signalValue < 6 || restartGSM) ? 1 : 0;
  Serial.print(F("commError: "));
  Serial.println(commError);
  if (commError == 5) {
    while (true) { delay(1000); }
  }
}

#pragma endregion Comunicaciones
