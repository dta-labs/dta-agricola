#pragma region Comunicaciones

String parse(String dataString, char separator, int index) {
  byte found = 0;
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

String getResponse(int wait, bool response){
  String result = "";
  delay(wait);
  unsigned long iTimer = millis();
  while(!gprs.available() && (millis() - iTimer) <= 1000) {
    delay(5);    
  }
  while(gprs.available() > 0) {
    result += (char)gprs.read();
    delay(1.5);
  }
  result = result != "" ? result : "ERROR";
  if (response) {
    Serial.println(result);
  }
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

void testComunicaciones() {
  gprs.println(F("AT+IPR=9600"));
  getResponse(15, testComm); 
  gprs.println(F("AT"));
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

void setupGSM() {
  Serial.println(F("> Setup GSM"));
  gprs.listen();
  if (restartGSM) {
    gprs.end();
    gprs.begin(9600);
    if (testComm) { testComunicaciones(); }
    // gprs.println(F("AT+CBAND=ALL_BAND"));		// PGSM_MODE, DCS_MODE, PCS_MODE, EGSM_DCS_MODE, GSM850_PCS_MODE, ALL_BAND
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
}

String httpRequest() {
  gprs.listen();
  String param1  = F("&st=");
  String param2  = F("&sa=");
  String param3  = F("&di=");
  String param4  = F("&vo=");
  String param5  = F("&ar=");
  String param6  = F("&sp=");
  String param7  = F("&pr=");
  String param8  = F("&po=");
  String param9  = F("&la=");
  String param10 = F("&lo=");
  String param11 = F("&er=");
  String param12 = F("&rx=");
  String param13 = F("&si=");
  signalVar = getSignalValue();
  param1  += statusVar;
  param2  += (String)(isSequrity ? "true" : "false");
  param3  += directionVar;
  param4  += (String)(isVoltage ? "true" : "false");
  param5  += autoreverseVar;
  param6  += (String)velocityVar;
  param7  += (String)actualPresure;
  param8  += String(positionVar, 1);
  param9  += String(lat_actual, 5);
  param10 += String(lon_actual, 5);
  param11 += (String)errorGPS;
  param12 += (String)(commRx ? "Ok" : "Er");
  param13 += (String)signalVar + "\"";
  gprs.println(F("AT+HTTPINIT"));
  getResponse(15, false); 
  gprs.println(httpServer + param1 + param2 + param3 + param4 + param5 + param6 + param7 + param8 + param9 + param10 + param11 + param12 + param13);
  getResponse(25, true); 
  systemWatchDog();
  gprs.println(F("AT+HTTPACTION=0"));
  String result = getResponse(3000, false); 
  systemWatchDog();
  restartGSM = (result == "" || result.indexOf("ERROR") != -1 || result.indexOf("601") != -1  || result.indexOf("604") != -1 || signalVar < 6) ? true : false;
  gprs.println(F("AT+HTTPREAD"));
  result = getResponse(0, false);
  gprs.println(F("AT+HTTPTERM"));
  getResponse(30, false); 
  commWatchDogReset(signalVar);
  systemWatchDog();
  return result;
}

void setVariables(String data) {
  Serial.print(F("data: "));
  Serial.println(data);
  byte idx = data.indexOf('"');
  String aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  statusVar = (aux == "ON" || aux == "OFF") ? aux : statusVar;                                  // > status
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  directionVar = (aux == "FF" || aux == "RR") ? aux : directionVar;                             // > direction
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  sensorPresionVar = (aux == "") ? sensorPresionVar : (aux.toFloat() > 0) ? aux.toFloat() : 0;  // > sensor de presión
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  autoreverseVar = (aux == "ON" || aux == "OFF") ? aux : autoreverseVar;                        // > autoreverse
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  lat_central = (aux != "") ? aux.toFloat() : lat_central;                                      // > lat_central
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  lon_central = (aux != "") ? aux.toFloat() : lon_central;                                      // > lon_central
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  deviceType = (aux != "") ? aux : deviceType;                                                  // > deviceType
  idx = data.indexOf('"', idx + 1);
  aux = data.substring(idx + 1, data.indexOf('"', idx + 1));
  int bindsNo = (aux != "") ? aux.toInt() : 0;                                                  // > bins
  if (bindsNo > 0) {
    for (int i = 0; i < bindsNo; i++) {
      idx = data.indexOf('"', idx + 1);
      positionIni = (data.substring(idx + 1, data.indexOf('"', idx + 1))).toInt();              // inicio
      idx = data.indexOf('"', idx + 1);
      positionEnd = (data.substring(idx + 1, data.indexOf('"', idx + 1))).toInt();              // fin
      idx = data.indexOf('"', idx + 1);
      byte bindVel = (data.substring(idx + 1, data.indexOf('"', idx + 1))).toInt();             // velocidad
      idx = data.indexOf('"', idx + 1);
      String bindEndGun = (data.substring(idx + 1, data.indexOf('"', idx + 1)));                // end gun
      if (positionIni <= positionVar && positionVar < positionEnd) {
        // Serial.print(F("\nPos: ")); Serial.print(positionIni); Serial.print(F(",")); Serial.print(positionEnd);  Serial.print(F(" "));  Serial.println(positionVar); 
        velocityVar = (bindVel > 100) ? 100 : (bindVel < 0) ? 0 : bindVel;
        endGunVar = (bindEndGun == "T") ? "ON" : "OFF";
        break;
      }
    }
  }
}

void comunicaciones() {
  Serial.println(F("> Server communication"));
  String data = httpRequest();                                                       // Get Settings from HTTP
  data = data.substring(data.indexOf('"'), data.indexOf("OK"));
  if (testFunc) {                                                                    // Para test
    data = (testData) ? F("\"ON\"FF\"0\"OFF\"30.73081\"-107.86308\"PC\"1\"0\"360\"50\"F\"") : F("\"ON\"RR\"0\"OFF\"30.73081\"-107.86308\"PC\"1\"0\"360\"50\"F\"");
    commError = 0;
    testData = testData == true ? false : true;
  }
  if (data != "" && (data.indexOf("ON") != -1 || data.indexOf("OFF") != -1)) {
    commRx = true;
    setVariables(data);
  } else {
    commRx = false;
    Serial.print(F("lat_central: ")); Serial.print(lat_central, 2); Serial.print(F(" lon_central: ")); Serial.println(lon_central, 2);
    Serial.println(F("data: Error!"));
  }
}

/****************************************************************
 *                                                              *
 * Errores HTTP:                                              	*
 *                                                              * 
 * 502	Bad Gateway	The remote server returned an error.        *
 * 600*	Empty access token.                                     *
 *                                                              *
 * 601*	Access token invalid                                    *
 * 602*	Access token expired                                    *
 * 603	Access denied                                           *
 * 604*	Request timed out                                       *
 * 605*	HTTP Method not supported                               *
 * 606	Max rate limit ‘%s’ exceeded with in ‘%s’ secs          *
 * 607	Daily quota reached                                     *
 *                                                              *
 * 608*	API Temporarily Unavailable	                            *
 * 609	Invalid JSON                                            *
 * 610	Requested resource not found                            *
 * 611*	System error	All unhandled exceptions                  *
 * 612	Invalid Content Type                                    *
 * 613	Invalid Multipart Request                               *
 * 614	Invalid Subscription                                    *
 * 615	Concurrent access limit reached                         *
 * 616	Invalid subscription type                               *
 * 701	%s cannot be blank                                      *
 * 702	No data found for given search scenario                 *
 *                                                              *
 * 703	Feature is not enabled for the subscription             *
 * 704	Invalid date format                                     *
 * 709	Business Rule Violation                                 *
 * 710	Parent Folder Not Found                                 *
 * 711	Incompatible Folder Type                                *
 * 712	Merge to person Account operation is invalid            *
 * 713	A system resource was temporarily unavailable           *
 * 714	Unable to find default record type                      *
 * 718	ExternalSalesPersonID not found                         *
 *                                                              *
 ****************************************************************/

/****************************************************************
  *                                                              *
  * Valor  dB   Condición                                        *
  * ===== ====  =========                                        *
  *  2	  -109	Marginal                                          *
  *  3	  -107	Marginal                                          *
  *  4	  -105	Marginal                                          *
  *  5	  -103	Marginal                                          *
  *  6	  -101	Marginal                                          *
  *  7	   -99	Marginal                                          *
  *  8	   -97	Marginal                                          *
  *  9	   -95	Marginal                                          *
  * 10	   -93	OK                                                *
  * 11	   -91	OK                                                *
  * 12	   -89	OK                                                *
  * 13	   -87	OK                                                *
  * 14	   -85	OK                                                *
  * 15	   -83	Good                                              *
  * 16	   -81	Good                                              *
  * 17	   -79	Good                                              *
  * 18	   -77	Good                                              *
  * 19	   -75	Good                                              *
  * 20	   -73	Excellent                                         *
  * 21	   -71	Excellent                                         *
  * 22	   -69	Excellent                                         *
  * 23	   -67	Excellent                                         *
  * 24	   -65	Excellent                                         *
  * 25	   -63	Excellent                                         *
  * 26	   -61	Excellent                                         *
  * 27	   -59	Excellent                                         *
  * 28	   -57	Excellent                                         *
  * 29	   -55	Excellent                                         *
  * 30	   -53	Excellent                                         *
  *                                                              *
  ****************************************************************/

#pragma endregion Comunicaciones
