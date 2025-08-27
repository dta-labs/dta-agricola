#pragma region Comunicaciones

// #ifndef Arduino_h
//   #include "Arduino.h"
// #endif

void(*resetSoftware)(void) = 0;  // Puntero a dirección 0

String sendATCommand(String cmd, int wait = responseTime, bool response = false) {
  // Serial.println(cmd);
  gprs.println(cmd);
  delay(wait);  // Pequeña espera inicial tras enviar
  String result = "";
  unsigned long timeout = millis() + 5000; // Espera máxima de 5s
  unsigned long interByteTimer = millis();
  while (millis() < timeout) {
    while (gprs.available()) {
      char c = gprs.read();
      result += c;
      interByteTimer = millis(); // Reinicia cuando llega un byte
    }
    if (result.length() > 0 && (millis() - interByteTimer > 200)) {
      break;
    }
  }
  if (response) DBG_PRINTLN(result);
  return result;
}

void commWatchDogReset(String result, bool readError = false) {
  restartGSM = (result.indexOf(F("ERROR")) != -1 || result.indexOf(F("601")) != -1  || result.indexOf(F("604")) != -1) ? true : false;
  commError = (signalVar < 6 || QoS > 6 || restartGSM || readError) ? commError + 1 : 0;
  if (commError != 0) { DBG_PRINT(F("commError: ")); DBG_PRINTLN(commError); }
  if (commError == 1) { 
    commError = 0;
    digitalWrite(watchDogPin, LOW);
    resetSoftware();
    while(1) delay(1000);
  }
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
  ---------------------------
  Tasa de error de bits (BER):
  0-3: Buena calidad de conexión.
  4-6: Conexión moderada.
  7-99: Conexión con errores significativos.
*/
void getSignalMetrics() {
  signalVar = -1;
  QoS = -1;
  String aux = sendATCommand(F("AT+CSQ"));    // +CSQ: 25,6
  if (aux.indexOf(F("+CSQ: ")) != -1) {
      signalVar = aux.substring(aux.indexOf(F("+CSQ: ")) + 6, aux.indexOf(F(","))).toInt();
      QoS = aux.substring(aux.indexOf(F(",")) + 1, aux.length()).toInt();
  }
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
    gprs.begin(9600);
    gprs.listen();
    const __FlashStringHelper* const AT_COMMANDS[] = {
      F("AT+SAPBR=0,1"),
      F("AT+CFUN=1"),
      // F("AT+CDNSCFG=\"8.8.8.8\",\"8.8.4.4\""),
      F("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\""),
      F("AT+SAPBR=3,1,\"APN\",\"internet.itelcel.com\""),
      F("AT+SAPBR=3,1,\"USER\",\"webgpr\""),
      F("AT+SAPBR=3,1,\"PWD\",\"webgprs2002\""),
      F("AT+SAPBR=1,1")
    };
    for (byte i = 0; i < sizeof(AT_COMMANDS) / sizeof(AT_COMMANDS[0]); i++) {
      sendATCommand(AT_COMMANDS[i]);
    }
    int i = 10;
    while (telefono == strEmpty && i > 0) {
      telefono = getTelefono();
      delay(1000);
      Serial.print(F("."));
      i--;
    }
    if (telefono != strEmpty) {
      DBG_PRINT(F(" correctamente ✔ ID: ")); DBG_PRINT(telefono);
      getSignalMetrics();
      DBG_PRINT(F(" RSSI: ")); DBG_PRINTLN(signalVar);
    } else {
      DBG_PRINTLN(F(" con error ✘"));
    }
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

String setURL(byte baseURL=true) {
  // String url = httpServer1; url += baseURL; url += httpServer2; url += (String)telefono; 
  // Serial.println(telefono);
  // Serial.println(url);
  // // String url = httpServer; url += telefono; 
  // url += F("&st="); url += statusVar;
  // url += F("&dt="); url += getSectorStatus();
  // url += F("&rx="); url += (String)(systemStart ? "ini" : commRx ? "Ok" : "Er");
  // url += F("&si="); url += (String)signalVar;
  // url += F("&qos="); url += (String)QoS + "\"";
  char url[140];
  strcpy_P(url, (PGM_P)httpServer1);
  strcat(url, baseURL ? domainName : domainIP);
  strcat_P(url, (PGM_P)httpServer2);
  strcat(url, telefono.c_str());
  strcat(url, "&st="); strcat(url, statusVar.c_str());
  String sector = getSectorStatus();
  strcat(url, "&dt="); strcat(url, sector.c_str());
  strcat(url, "&rx=");
  strcat(url, systemStart ? "ini" : commRx ? "Ok" : "Er");
  char temp[6];
  itoa(signalVar, temp, 10); strcat(url, "&si="); strcat(url, temp);
  itoa(QoS, temp, 10); strcat(url, "&qos="); strcat(url, temp);
  strcat(url, "\"");
  url[sizeof(url) - 1] = '\0'; // Seguridad extra
  // DBG_PRINTLN(url);
  sendATCommand(url, 15, true);
  String result = sendATCommand(F("AT+HTTPACTION=0"), 10000, true);
  return (result.indexOf("+HTTPACTION: 0,603,0") == -1) ? sendATCommand(F("AT+HTTPREAD=0,300"), 0, true) : "";
  // return result.indexOf("+HTTPACTION: 0,603,0") == -1;
}

String httpRequest() {
  if (testFunc) { return F("\"ON\"P\"7\"60000\"F\"0\"F\"0\"F\"0\"F\"45000\"F\"0\"F\"60000\"F\""); }
  String result = "";
  if (telefono != strEmpty /*&& signalVar > 0*/) {
    DBG_PRINTLN(F("Inicio de la comunicación..."));
    sendATCommand(F("AT+HTTPINIT"));
    sendATCommand(F("AT+HTTPPARA=\"CID\",1"));
    result = setURL();
    if (result == "") { result = setURL(false); } 
    int real = result.substring(result.indexOf('"'), result.lastIndexOf('"') + 1).length();
    int expected = result.substring(result.indexOf(F("+HTTPREAD: ")) + 11, result.indexOf(F("\n"), 21)).toInt();
    DBG_PRINTLN((String)real + " / " + (String)expected);
    // if (expected != real || expected == 0 || real == 0) while(1) delay(1000);
    sendATCommand(F("AT+HTTPTERM"), 30); 
    if (expected == real && expected != 0) {
      result = result.substring(result.indexOf('"'), result.lastIndexOf('"') + 1);
      // result.replace(F("\""), commaChar);
    } else { result = ""; }
    commWatchDogReset(result, expected != real);
  } else { 
    restartGSM = true;
    commError++;
    // DBG_PRINTLN("Teléfono: " + telefono + " Señal: " + String(signalVar)); 
  }
  return result;
}

void comunicaciones() {
  DBG_PRINTLN();
  String data = httpRequest();                                       // Get Settings from HTTP
  DBG_PRINT(F("data: ")); DBG_PRINTLN(data);
  commRx = checkData(data, 18);
  if (data != "" && commRx) {
    systemStart = false;
    String aux = strEmpty;
    aux = parse(data, '"', 1);                                        // status
    statusVar = (aux == F("ON") || aux == F("OFF")) ? aux : statusVar;
    aux = parse(data, '"', 2);                                        // status
    irrigationMode = (aux == F("P") || aux == F("S") || aux == F("C")) ? aux[0] : irrigationMode;
    aux = parse(data, '"', 3);                                        // Number of plots
    plots = (aux != strEmpty) ? aux.toInt() : plots;
    for (byte i = 0; i < plots; i++) {
      aux = parse(data, '"', (i * 2) + 4);                            // Plot value
      activationTime[i] = (aux != strEmpty) ? aux.toInt() : 0;
      aux = parse(data, '"', (i * 2) + 5);                            // Plot valve type
      systemType[i] = (aux != strEmpty) ? aux[0] : 'F';
    }
    guardarEstado();
  }
}

void gestionarComunicaciones() {
  if (commLoops == 0) {
    setupGSM();
    comunicaciones();
  }
  commLoops++;
  if (commLoops > 10) commLoops = 0;
}

void showVars() {
  DBG_PRINT(F("<")); DBG_PRINT(statusVar); DBG_PRINT(F("> "));
  DBG_PRINT(F("<")); DBG_PRINT(irrigationMode); DBG_PRINT(F("> "));
  for (byte i = 0; i < plots; i++) {
    if (activationTime[i] > 0) {
      DBG_PRINT(F("[[")); DBG_PRINT(i + 1); DBG_PRINT(F("]] "));
    } else {
      DBG_PRINT(F("[")); DBG_PRINT(i + 1); DBG_PRINT(F("] "));
    }
  }
  DBG_PRINTLN();
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
