#pragma region Comunicaciones

#ifndef Arduino_h
  #include "Arduino.h"
#endif

// void(* resetSoftware)(void) = 0;

String getResponse(int wait, bool response){
  String result = "";
  delay(wait);
  unsigned long iTimer = millis();
  while(!gprs.available() && (millis() - iTimer) <= 10000) {
    delay(5);    
  }
  while(gprs.available() > 0) {
    result += (char)gprs.read();
    delay(1.5);
  }
  if (response) {
    Serial.println(result);
  }
  return result;
}

void resetSIM() {
  Serial.println(F("Resetting SIM module..."));
  digitalWrite(pinCommRST, LOW);                // Reiniciar el Módulo de comunicaciones SIM800
  delay(500);
  digitalWrite(pinCommRST, HIGH);
  delay(5000);
}

void commWatchDogReset() {
  commError = ((signalVar < 6 || QoS > 6 || restartGSM) && !testFunc) ? commError + 1 : 0;
  if (commError != 0) { Serial.print(F("commError: ")); Serial.println(commError); }
  if (commError == 4) { resetSIM(); }
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

/*
  Intensidad de señal (RSSI) - debe ser 9 o superior: +CSQ: 14,0 OK:
  0-9: Señal muy débil.
  10-14: Señal baja.
  15-19: Señal aceptable.
  20-24: Señal buena.
  25-31: Señal excelente
*/
int getRSSI() {
  gprs.println(F("AT+CSQ"));
  String aux = getResponse(15, false);
  if (aux.indexOf("+CSQ: ") != -1) {
    return aux.substring(aux.indexOf("+CSQ: ") + 6, aux.indexOf(",")).toInt();
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
  gprs.println(F("AT+CSQ"));
  String aux = getResponse(15, false);// +CSQ: 25,6
  if (aux.indexOf("+CSQ: ") != -1) {
    return aux.substring(aux.indexOf(",") + 1, aux.length()).toInt();
  }
  return -1;
}

void testComunicaciones() {
  gprs.println(F("AT+IPR=9600"));      // Velocidad en baudios?
  getResponse(15, testComm); 
  gprs.println(F("AT"));               // Tarjeta SIM Lista? OK
  getResponse(15, testComm); 
  gprs.println(F("AT+CGMI"));          // Fabricante del dispositivo?
  getResponse(15, testComm); 
  gprs.println(F("ATI"));              // Información del producto?
  getResponse(15, testComm); 
  gprs.println(F("AT+CGSN"));          // Número de serie?
  getResponse(15, testComm); 
  gprs.println(F("AT+IPR?"));          // Velocidad en baudios?
  getResponse(15, testComm); 
  gprs.println(F("AT+CBC"));           // Estado de la bateriía
  getResponse(15, testComm); 
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
  gprs.println(F("AT+CCLK?"));         // Fecha y Hora?
  getResponse(15, testComm); 
  gprs.println(F("AT+COPS?"));         // Comañía telefónica?
  getResponse(15, testComm); 
}

void setupGSM() {
  if (restartGSM) {
    Serial.println(F("Setup GSM"));
    gprs.listen();
    gprs.begin(9600);
    // resetSIM(); 
    if (testComm) { testComunicaciones(); }
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

String getSectorStatus() {
  String result = F("["); 
  for (int i = 0; i < plots; i++) {
    result += i > 0 ? "," : "";
    result += activationTime[i] > 0 ? "1" : "0";
  }
  result += F("]");
  return result;
}

String httpRequest() {
  if (testFunc) { return F("\"ON\"P\"7\"60000\"F\"0\"F\"0\"F\"0\"F\"45000\"F\"0\"F\"60000\"F\""); }
  signalVar = getRSSI();
  QoS = getBER();
  gprs.println(F("AT+HTTPINIT"));
  getResponse(15, false); 
  gprs.print(httpServer); gprs.print(telefono);
  gprs.print(F("&st=")); gprs.print(statusVar);
  gprs.print(F("&dt=")); gprs.print(getSectorStatus());
  gprs.print(F("&rx=")); gprs.print((String)(systemStart ? "ini" : commRx ? "Ok" : "Er"));
  gprs.print(F("&si=")); gprs.print((String)signalVar);
  gprs.print(F("&qos=")); gprs.println((String)QoS + "\"");
  getResponse(25, true); 
  String result = ""; 
  byte counter = 5;
  while (result.indexOf('"') == -1 && counter > 0) {
    gprs.println(F("AT+HTTPACTION=0"));
    result = getResponse(4000, false); 
    if (result.indexOf("ERROR") != -1) { 
      resetSIM(); 
      restartGSM = true;
      return result;
    }
    restartGSM = (result.indexOf("601") != -1  || result.indexOf("604") != -1 || signalVar < 6) ? true : false;
    gprs.println(F("AT+HTTPREAD"));
    result = getResponse(0, true);
    counter--;
    delay(500);
  }
  gprs.println(F("AT+HTTPTERM"));
  // commWatchDogReset();
  getResponse(30, false); 
  return result.substring(result.indexOf('"'), result.lastIndexOf('"') + 1);
}

void comunicaciones() {
  Serial.println();
  String data = httpRequest();                                       // Get Settings from HTTP
  Serial.print(F("data: ")); Serial.println(data);
  commRx = checkData(data, 18);
  if (systemStart) { systemStart = false; }
  if (commRx) {
    String aux = "";
    aux = parse(data, '"', 1);                                        // status
    statusVar = (aux == "ON" || aux == "OFF") ? aux : statusVar;
    aux = parse(data, '"', 2);                                        // status
    irrigationMode = (aux == "P" || aux == "S" || aux == "C") ? aux[0] : irrigationMode;
    aux = parse(data, '"', 3);                                        // Number of plots
    plots = (aux != "") ? aux.toInt() : plots;
    for (byte i = 0; i < plots; i++) {
      aux = parse(data, '"', (i * 2) + 4);                            // Plot value
      activationTime[i] = (aux != "") ? aux.toInt() : 0;
      aux = parse(data, '"', (i * 2) + 5);                            // Plot valve type
      systemType[i] = (aux != "") ? aux[0] : 'F';
    }
    commStr = data;
    guardarEstado();
  }
}

void gestionarComunicaciones() {
  if (commLoops == 0) {
    setupGSM();
    comunicaciones();
    commLoops++;
  } else {
    commLoops = commLoops < 10 ? commLoops + 1 : 0;
  }
}

void showVars() {
  Serial.print(fillNumber(commLoops, 2)); Serial.print(F(".- <")); Serial.print(statusVar); Serial.print(F("> "));
  Serial.print(F("<")); Serial.print(irrigationMode); Serial.print(F("> "));
  for (byte i = 0; i < plots; i++) {
    if (activationTime[i] > 0) {
      Serial.print(F("[[")); Serial.print(i + 1); Serial.print(F("]] "));
    } else {
      Serial.print(F("[")); Serial.print(i + 1); Serial.print(F("] "));
    }
  }
  Serial.println();
}

#pragma endregion Comunicaciones

/****************************************************************
 *                                                              *
 * Errores HTTP:                                                *
 *                                                              * 
 * 502  Bad Gateway The remote server returned an error.        *
 * 600* Empty access token.                                     *
 *                                                              *
 * 601* Access token invalid                                    *
 * 602* Access token expired                                    *
 * 603  Access denied                                           *
 * 604* Request timed out                                       *
 * 605* HTTP Method not supported                               *
 * 606  Max rate limit ‘%s’ exceeded with in ‘%s’ secs          *
 * 607  Daily quota reached                                     *
 *                                                              *
 * 608* API Temporarily Unavailable                             *
 * 609  Invalid JSON                                            *
 * 610  Requested resource not found                            *
 * 611* System error  All unhandled exceptions                  *
 * 612  Invalid Content Type                                    *
 * 613  Invalid Multipart Request                               *
 * 614  Invalid Subscription                                    *
 * 615  Concurrent access limit reached                         *
 * 616  Invalid subscription type                               *
 * 701  %s cannot be blank                                      *
 * 702  No data found for given search scenario                 *
 *                                                              *
 * 703  Feature is not enabled for the subscription             *
 * 704  Invalid date format                                     *
 * 709  Business Rule Violation                                 *
 * 710  Parent Folder Not Found                                 *
 * 711  Incompatible Folder Type                                *
 * 712  Merge to person Account operation is invalid            *
 * 713  A system resource was temporarily unavailable           *
 * 714  Unable to find default record type                      *
 * 718  ExternalSalesPersonID not found                         *
 *                                                              *
 ****************************************************************/

/****************************************************************
 *                                                              *
 * Valor  dB   Condición                                        *
 * ===== ====  =========                                        *
 *  2   -109  Marginal                                          *
 *  3   -107  Marginal                                          *
 *  4   -105  Marginal                                          *
 *  5   -103  Marginal                                          *
 *  6   -101  Marginal                                          *
 *  7    -99  Marginal                                          *
 *  8    -97  Marginal                                          *
 *  9    -95  Marginal                                          *
 * 10    -93  OK                                                *
 * 11    -91  OK                                                *
 * 12    -89  OK                                                *
 * 13    -87  OK                                                *
 * 14    -85  OK                                                *
 * 15    -83  Good                                              *
 * 16    -81  Good                                              *
 * 17    -79  Good                                              *
 * 18    -77  Good                                              *
 * 19    -75  Good                                              *
 * 20    -73  Excellent                                         *
 * 21    -71  Excellent                                         *
 * 22    -69  Excellent                                         *
 * 23    -67  Excellent                                         *
 * 24    -65  Excellent                                         *
 * 25    -63  Excellent                                         *
 * 26    -61  Excellent                                         *
 * 27    -59  Excellent                                         *
 * 28    -57  Excellent                                         *
 * 29    -55  Excellent                                         *
 * 30    -53  Excellent                                         *
 *                                                              *
 ****************************************************************/
