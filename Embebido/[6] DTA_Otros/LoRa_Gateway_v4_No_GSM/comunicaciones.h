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
  restartGSM = !commRx ? true : false;
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
    gprs.begin(9600);
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

String httpRequest(String strMeasurements, String strVoltages, bool setup) {
  signalVar = getSignalValue();
  gprs.println(F("AT+HTTPINIT"));
  getResponse(15, testComm); 
  gprs.print(httpServer);
  gprs.print(telefono);
  gprs.print(F("&no=")); gprs.print((String)numSensors);
  gprs.print(F("&data=[")); gprs.print(strMeasurements); gprs.print(F("]"));
  gprs.print(F("&vi=[")); gprs.print(strVoltages); gprs.print(F("]"));
  gprs.print(F("&rx=")); gprs.print((String)(commRx ? "Ok" : "Er"));
  gprs.print(F("&si=")); gprs.println((String)signalVar + "\"");
  getResponse(25, true); 
  gprs.println(F("AT+HTTPACTION=0"));
  getResponse(6000, testComm); 
  gprs.println(F("AT+HTTPREAD"));
  String result = getResponse(0, testComm);
  // Serial.println(result);
  gprs.println(F("AT+HTTPTERM"));
  getResponse(30, testComm); 
  wdt_reset();                                // Reset the watchdog
  commWatchDogReset();
  return getDataStream(result);
}

void setVariables(String data) {
  Serial.print(F("data: ")); Serial.println(data);
  sleepingTime = parse(data, '"', 1).toInt();
  numSensors = parse(data, '"', 2).toInt();
  for (int i = 0; i < numSensors; i++) nodes[i] = parse(data, '"', i + 3).substring(0, 6);
}

void showVariables() {
  Serial.println(F("\nMain variables: \n================")); 
  Serial.print(F("  :: Sleeping Time: ")); Serial.print(sleepingTime); Serial.println(" min"); 
  Serial.print(F("  :: Num. Sensors: ")); Serial.println(numSensors); 
  Serial.print(F("  :: Sensors IDs: ")); 
  for (int i = 0; i < numSensors; i++) Serial.print(i > 0 ? "," + nodes[i] : nodes[i]);
  Serial.println();
}

void comunicaciones(String strMeasurements, String strVoltages, bool setup) {
  Serial.println(F("\nComunicación con el servidor"));
// 4                                                                                                                                        N                                                                                                                                                                                                               setupGSM();
  // String data = httpRequest(strMeasurements, strVoltages, setup); 
  Serial.println("Mockup data...");
  String data = "\"0\"3\"DTA_00\"DTA_01\"DTA_02\"DTA_03\"DTA_04\"DTA_05\"DTA_06\"DTA_07\"DTA_08\"DTA_09\"";
  if (data != "") {
    setVariables(data);
    showVariables();
  }
}

#pragma endregion Comunicaciones
