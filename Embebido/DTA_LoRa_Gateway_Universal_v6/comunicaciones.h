#include "Arduino.h"

#pragma region Comunicaciones

void commWatchDogReset() {
  commError += (restartGSM) ? 1 : commError = 0;
  if (commError > 0) {
    Serial.print(F("commError: ")); Serial.println(commError);
  }
  if (commError == 5) {
    resetSoftware();
  }
}

String getResponse(int wait, bool response){
  String result = strEmpty;
  delay(wait);
  unsigned long iTimer = millis();
  while(!gprs.available() && (millis() - iTimer) <= 1000) {
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

String getDataStream(String dataSetream) {
  dataSetream = dataSetream.substring(dataSetream.indexOf('"') + 1, dataSetream.lastIndexOf("\""));
  commRx = dataSetream != strEmpty ? true : false;
  restartGSM = !commRx;
  return dataSetream;
}

int getSignalValue() {
  gprs.println(F("AT+CSQ"));           // Calidad de la señal -  debe ser 9 o superior: +CSQ: 14,0 OK
  String aux1 = getResponse(responseTime, false);
  String aux2 = parse(aux1, ' ', 1);
  String aux3 = parse(aux2, ',', 0);
  int result = aux3.toInt(); 
  return result;
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
}

void setupGSM() {
  // if (restartGSM) {
    Serial.println(F("Setup GSM"));
    gprs.begin(19200);
    gprs.listen();
    // gprs.println(F("AT+CFUN=1,1"));             // Reinicia el módulo
    // getResponse(responseTime, testComm); 
    if (testComm) { testComunicaciones(); }
    // gprs.println(F("AT+CBAND=PCS_MODE"));    // PGSM_MODE, DCS_MODE, PCS_MODE, EGSM_DCS_MODE, GSM850_PCS_MODE, ALL_BAND
    // getResponse(responseTime, testComm); 
    // gprs.println(F("AT+CBAND=ALL_BAND"));
    // getResponse(responseTime, testComm); 
    // gprs.println(F("AT+SAPBR=0,1"));
    // getResponse(responseTime, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\""));
    getResponse(responseTime, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"APN\",\"internet.itelcel.com\""));
    getResponse(responseTime, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"USER\",\"webgpr\""));
    getResponse(responseTime, testComm); 
    gprs.println(F("AT+SAPBR=3,1,\"PWD\",\"webgprs2002\""));
    getResponse(responseTime, testComm); 
    gprs.println(F("AT+CFUN=1"));               // Funcionalidad 0 mínima 1 máxima
    getResponse(responseTime, testComm); 
    gprs.println(F("AT+SAPBR=1,1"));
    getResponse(responseTime, testComm); 
    gprs.println(F("AT+SAPBR=2,1"));
    getResponse(responseTime, testComm); 
  // }
}

String httpRequest(String strToSend) {
  signalVar = getSignalValue();
  gprs.println(F("AT+HTTPINIT"));
  getResponse(responseTime, testComm); 
  String strData = httpServer; strData += telefono;
  strData += F("&data=["); strData += strToSend; strData += F("]"); 
  strData += F("&rx="); strData += (String)(commRx ? F("Ok") : F("Er"));
  strData += F("&si="); strData += (String)signalVar + F("\"");
  Serial.println(strData);
  gprs.print(httpServer); gprs.print(telefono);
  gprs.print(F("&data=[")); gprs.print(strToSend); gprs.print(F("]"));
  gprs.print(F("&rx=")); gprs.print((String)(commRx ? F("Ok") : F("Er")));
  gprs.print(F("&si=")); gprs.println((String)signalVar + F("\""));
  // gprs.println(strData);
  getResponse(50, true); 
  gprs.println(F("AT+HTTPACTION=0"));
  getResponse(6000, testComm); 
  gprs.println(F("AT+HTTPREAD"));
  String result = getResponse(0, true);
  gprs.println(F("AT+HTTPTERM"));
  getResponse(30, testComm); 
  commWatchDogReset();
  return getDataStream(result);
}

void setVariables(String data) {
  data.replace(F("\""), commaChar);
  Serial.println(F("» Variables: "));
  Serial.print(F("  ├─ GSM: ")); Serial.println(data);
  int startIndex = 0; 
  int endIndex = data.indexOf(commaChar); 
  int auxMode = data.substring(startIndex, endIndex).toInt();
  if (operationMode == 0 && auxMode != 0) for (int i = 0; i < 5; i++) dataToSend[i] = strEmpty;
  operationMode = auxMode;
  Serial.print(F("  ├─ Modo: ")); Serial.println(operationMode != 0 ? String(operationMode) : F("Descubrimiento"));
  Serial.print(F("  └─ Sensores: ")); 
  for (int i = 0; i < 5; i++) { 
    startIndex = endIndex + 1; 
    endIndex = data.indexOf(commaChar, startIndex); 
    String aux = i < 4 ? data.substring(startIndex, endIndex) : data.substring(startIndex); 
    sensorList[i] = aux.indexOf(startAddress) == 0 && aux.length() > 2 ? aux : baseAddress;
    if (i > 0) Serial.print(commaChar); Serial.print(sensorList[i]);
  }
}

void comunicaciones(String strToSend) {
  Serial.println(F("\nComunicación con el servidor"));
  setupGSM();
  String data = httpRequest(strToSend); 
  if (testData) {
    Serial.println(F("Mockup data..."));
    data = F("\"D\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0\"");
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
