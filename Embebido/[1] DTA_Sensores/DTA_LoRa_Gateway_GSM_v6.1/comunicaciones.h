#pragma region Comunicaciones

#ifndef Arduino_h
  #include "Arduino.h"
#endif

void systemWatchDog() {
  pinMode(watchDogPin, OUTPUT);         // Sink current to drain charge from C2
  digitalWrite(watchDogPin, HIGH);
  delay(50);                            // Give enough time for C2 to discharge (should discharge in 50 ms)     
  pinMode(watchDogPin, INPUT);          // Return to high impedance
}

String getResponse(int wait, bool response){
  String result = strEmpty;
  delay(wait);
  unsigned long iTimer = millis();
  while(!gprs.available() && (millis() - iTimer) <= 10000) {
    delay(5);    
  }
  while(gprs.available()) {
    result += (char)gprs.read();
    delay(1.5);
  }
  if (response) {
    DBG_PRINTLN(result);
  }
  return result;
}

void resetSIM() {
  DBG_PRINTLN(F("Resetting SIM module..."));
  gprs.println(F("AT+CFUN=0"));
  getResponse(15, testComm); 
  gprs.println(F("AT+CFUN=1"));
  getResponse(100, testComm); 
}

void commWatchDogReset(String result) {
  restartGSM = (result.indexOf(F("ERROR")) != -1  || result.indexOf(F("601")) != -1  || result.indexOf(F("604")) != -1 || signalVar < 6) ? true : false;
  commError = (signalVar < 6 || QoS > 6 || restartGSM) ? commError + 1 : 0;
  if (commError != 0) { DBG_PRINT(F("commError: ")); DBG_PRINTLN(commError); }
  if (commError == 4) { 
    commError = 0;
    resetSIM(); 
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
  gprs.println(F("AT+CSQ"));
  String aux = getResponse(15, false);
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
  gprs.println(F("AT+CSQ"));
  String aux = getResponse(15, false);// +CSQ: 25,6
  if (aux.indexOf(F("+CSQ: ")) != -1) {
    return aux.substring(aux.indexOf(F(",")) + 1, aux.length()).toInt();
  }
  return -1;
}

void testComunicaciones() {
  // gprs.println(F("AT+RST"));
  // getResponse(responseTime, testComm); 
  gprs.println(F("AT+IPR=9600"));      // Velocidad en baudios?
  getResponse(responseTime, testComm); 
  gprs.println(F("AT"));               // Tarjeta SIM Lista? OK
  getResponse(responseTime, testComm); 
  gprs.println(F("AT+CGMI"));          // Fabricante del dispositivo?
  getResponse(responseTime, testComm); 
  gprs.println(F("ATI"));              // Información del producto?
  getResponse(responseTime, testComm); 
  gprs.println(F("AT+CGSN"));          // Número de serie?
  getResponse(responseTime, testComm); 
  gprs.println(F("AT+IPR?"));          // Velocidad en baudios?
  getResponse(responseTime, testComm); 
  gprs.println(F("AT+CBC"));           // Estado de la bateriía
  getResponse(responseTime, testComm); 
  gprs.println(F("AT+CFUN?"));         // Funcionalidad 0 mínima 1 máxima
  getResponse(responseTime, testComm); 
  gprs.println(F("AT+CGATT=1"));       // Tarjeta SIM insetada? +CPIN: READY OK
  getResponse(responseTime, testComm); 
  gprs.println(F("AT+CPIN?"));         // Tarjeta SIM insetada? +CPIN: READY OK
  getResponse(responseTime, testComm); 
  gprs.println(F("AT+WIND=1"));        // Indicación de tarjeta SIM insetada? +CPIN: READY OK
  getResponse(responseTime, testComm); 
  gprs.println(F("AT+CREG?"));         // Tarjeta SIM registrada? +CREG: 0,1 OK 
  getResponse(responseTime, testComm); 
  gprs.println(F("AT+CGATT?"));        // Tiene GPRS? +CGATT: 1 OK
  getResponse(responseTime, testComm); 
  gprs.println(F("AT+CSQ"));           // Calidad de la señal -  debe ser 9 o superior: +CSQ: 14,0 OK
  getResponse(responseTime, testComm); 
  gprs.println(F("AT+CCLK?"));         // Fecha y Hora?
  getResponse(responseTime, testComm); 
  gprs.println(F("AT+COPS?"));         // Comañía telefónica?
  getResponse(responseTime, testComm); 
  systemWatchDog(); 
}

void setupGSM() {
  if (restartGSM) {
    DBG_PRINTLN(F("Setup GSM"));
    gprs.begin(9600);
    gprs.listen();
    if (testComm) { testComunicaciones(); }
    gprs.println(F("AT+CFUN=1"));
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=0,1"));
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\""));
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"APN\",\"internet.itelcel.com\""));
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"USER\",\"webgpr\""));
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"PWD\",\"webgprs2002\""));
    getResponse(15, testComm); 
    gprs.println(F("AT+SAPBR=1,1"));
    getResponse(15, testComm); 
  }
}

String getTelefono() {
  gprs.println(F("AT+CCID"));
  String result = getResponse(responseTime, true); 
  result.replace(F("\r"), strEmpty);
  result.replace(F("\n"), strEmpty);
  result.replace(F("AT+CCID"), strEmpty);
  result.replace(F(" "), strEmpty);
  result.replace(F("OK"), strEmpty);
  result.trim();
  return result;
}

String getData(String result) {
  result.replace(F("\r"), strEmpty);
  result.replace(F("\n"), strEmpty);
  result.replace(F("AT"), strEmpty);
  result.replace(F("+HTTPREAD"), strEmpty);
  result.replace(F(": "), strEmpty);
  result.replace(F(" "), strEmpty);
  result.replace(F("OK"), strEmpty);
  result.trim();
  return result.substring(result.indexOf('"'));
}

String httpRequest(String strToSend) {
  signalVar = getRSSI();
  QoS = getBER();
  gprs.println(F("AT+HTTPINIT"));
  getResponse(responseTime, testComm); 
  gprs.println(F("AT+HTTPPARA=\"CID\",1"));
  getResponse(responseTime, testComm); 
  gprs.print(httpServer); gprs.print(telefono);
  gprs.print(F("&data=[")); gprs.print(strToSend); gprs.print(F("]")); 
  gprs.print(F("&rx=")); gprs.print(commRx ? F("Ok") : F("Er"));
  gprs.print(F("&si=")); gprs.print((String)signalVar);
  gprs.print(F("&qos=")); gprs.println((String)QoS + F("\""));
  getResponse(25, true);
  systemWatchDog(); 
  gprs.println(F("AT+HTTPACTION=0")); 
  getResponse(6000, testComm); 
  gprs.println(F("AT+HTTPREAD"));
  String result = getResponse(30, true);
  systemWatchDog(); 
  byte counter = 5;
  while (result.indexOf('"') == -1 && counter > 0) {
    delay(1000);
    gprs.println(F("AT+HTTPREAD"));
    result = getResponse(30, true);
    counter--;
  }
  gprs.println(F("AT+HTTPTERM")); 
  getResponse(30, testComm); 
  commWatchDogReset(result);
  systemWatchDog(); 
  return getData(result);
}

void setVariables(String data) {
  data.replace(F("\""), commaChar);
  DBG_PRINTLN(F("» Variables: "));
  // DBG_PRINT(F("  ├─ GSM: ")); DBG_PRINTLN(data);
  int startIndex = 1; 
  int endIndex = data.indexOf(commaChar, startIndex); 
  int lastIndex = data.lastIndexOf(commaChar); 
  int auxMode = data.substring(startIndex, endIndex).toInt();
  if (operationMode == 0 && auxMode != 0) for (int i = 0; i < numSensors; i++) dataToSend[i] = strEmpty;
  operationMode = auxMode;
  DBG_PRINT(F("  ├─ Frecuencia: ")); operationMode != 0 ? (DBG_PRINTLN(String(operationMode) + " minutos")) : (DBG_PRINTLN(F("Descubrimiento")));
  DBG_PRINT(F("  └─ Sensores: ")); 
  for (int i = 0; i < numSensors; i++) { 
    if (endIndex + 1 <= lastIndex) {
      startIndex = endIndex + 1; 
      endIndex = data.indexOf(commaChar, startIndex); 
      String aux = startIndex == lastIndex ? data.substring(startIndex) : data.substring(startIndex, endIndex); 
      sensorList[i] = aux.indexOf(startAddress) == 0 && aux.length() > 2 ? aux : baseAddress;
    } else {
      sensorList[i] = baseAddress;
    }
    if (i > 0) DBG_PRINT(commaChar); DBG_PRINT(sensorList[i]);
  }
}

void comunicaciones(String strToSend) {
  String data = ""; 
  if (!testData) {
    DBG_PRINTLN(F("\nComunicación con el servidor"));
    setupGSM();
    // telefono = "333333333333";
    telefono = getTelefono();
    data = telefono.length() >= 19 ? httpRequest(strToSend) : ""; 
  } else if (first) {
    DBG_PRINTLN(F("Mockup data..."));
    data = F("0\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0");
    data = F("2\"0x10B9CE4A\"0x10B9CE37\"0xF46A38F\"0xF46A405\"0x10B9CEAC\"0xF46A392\"0xF46A38E\"0x10B9CE79\"0x28F94949F6853C02\"0x28730549F6A53C2E");
    first = false;
  }
  if (data != strEmpty) {
    setVariables(data);
  }
}

#pragma endregion Comunicaciones


// 600 Not HTTP PDU
// 601 Network Error
// 602 No memory
// 603 DNS Error
// 604 Stack Busy
