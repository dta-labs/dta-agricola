#include "Arduino.h"

#pragma region Comunicaciones

void commWatchDogReset() {
  commError += (restartGSM) ? 1 : commError = 0;
  if (commError > 0) {
    Serial.print(F("commError: ")); Serial.println(commError);
  }
  if (commError == 10) {
    resetSoftware();
  }
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
  if (response) {
    Serial.println(result);
  }
  return result;
}

String getDataStream(String dataSetream) {
  dataSetream = dataSetream.substring(dataSetream.indexOf('"'), dataSetream.indexOf("OK"));
  commRx = dataSetream != "" ? true : false;
  restartGSM = !commRx;
  return dataSetream;
}

int getSignalValue() {
  gprs.println(F("AT+CSQ"));           // Calidad de la señal -  debe ser 9 o superior: +CSQ: 14,0 OK
  String aux1 = getResponse(15, false);
  String aux2 = parse(aux1, ' ', 1);
  String aux3 = parse(aux2, ',', 0);
  int result = aux3.toInt(); 
  return result;
}

void testComunicaciones() {
  wdt_reset();                         // Reset the watchdog
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
  wdt_reset();                         // Reset the watchdog
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
  // if (restartGSM) {
    Serial.println(F("Setup GSM"));
    gprs.begin(19200);
    gprs.listen();
    if (testComm) { testComunicaciones(); }
    // gprs.println(F("AT+CBAND=PCS_MODE"));    // PGSM_MODE, DCS_MODE, PCS_MODE, EGSM_DCS_MODE, GSM850_PCS_MODE, ALL_BAND
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
    wdt_reset();                                // Reset the watchdog
  // }
}

String httpRequest(String strToSend, bool setup) {
  signalVar = getSignalValue();
  gprs.println(F("AT+HTTPINIT"));
  getResponse(15, testComm); 
  gprs.print(httpServer);
  gprs.print(telefono);
  gprs.print(F("&data=[")); gprs.print(strToSend); gprs.print(F("]"));
  gprs.print(F("&rx=")); gprs.print((String)(commRx ? "Ok" : "Er"));
  gprs.print(F("&si=")); gprs.println((String)signalVar + "\"");
  getResponse(25, true); 
  gprs.println(F("AT+HTTPACTION=0"));
  getResponse(6000, testComm); 
  gprs.println(F("AT+HTTPREAD"));
  String result = getResponse(0, testComm);
  gprs.println(F("AT+HTTPTERM"));
  getResponse(300, testComm); 
  wdt_reset();                                // Reset the watchdog
  commWatchDogReset();
  return getDataStream(result);
}

void setVariables(String data) {
  Serial.print(F("Datos: ")); Serial.println(data);
  int indice = 0; 
  int startIndex = 0; 
  int endIndex = data.indexOf(','); 
  operationMode = data.substring(startIndex, endIndex);
  Serial.print(F("Modo: ")); Serial.println(operationMode == "N" ? "Normal" : "Descubrimiento");
  startIndex = endIndex + 1; 
  endIndex = data.indexOf(',', startIndex); 
  Serial.print(F("Sensores: ")); 
  while (endIndex != -1) { 
    sensorList[indice++] = data.substring(startIndex, endIndex); 
    Serial.print(sensorList[indice]); Serial.print(",");
    startIndex = endIndex + 1; 
    endIndex = data.indexOf(',', startIndex); 
  }
  sensorList[indice] = data.substring(startIndex); 
  Serial.print(sensorList[indice]);
}

void comunicaciones(String strToSend, bool setup) {
  Serial.println(F("\nComunicación con el servidor"));
  setupGSM();
  String data = httpRequest(strToSend, setup); 
  if (testData) {
    Serial.println(F("Mockup data..."));
    data = F("\"D\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0\"0x0\"");
  }
  if (data != "") {
    data = data.substring(1, data.length() - 1);
    data.replace("\"", ",");
    setVariables(data);
  }
}

#pragma endregion Comunicaciones
