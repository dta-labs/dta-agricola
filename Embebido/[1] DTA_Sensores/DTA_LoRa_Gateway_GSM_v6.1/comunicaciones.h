#include "Arduino.h"

#pragma region Comunicaciones

void systemWatchDog() {
  pinMode(watchDogPin, OUTPUT);         // Sink current to drain charge from C2
  digitalWrite(watchDogPin, HIGH);
  delay(50);                            // Give enough time for C2 to discharge (should discharge in 50 ms)     
  pinMode(watchDogPin, INPUT);          // Return to high impedance
}

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
  systemWatchDog(); 
}

void setupGSM() {
  // if (restartGSM) {
    Serial.println(F("Setup GSM"));
    gprs.begin(9600);
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
    systemWatchDog(); 
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
  // Serial.println(strData);
  gprs.println(strData); 
  getResponse(0, true);
  systemWatchDog(); 
  gprs.println(F("AT+HTTPACTION=0")); 
  getResponse(7000, testComm); 
  gprs.println(F("AT+HTTPREAD"));
  String result = getResponse(0, testComm);
  systemWatchDog(); 
  gprs.println(F("AT+HTTPTERM")); 
  getResponse(30, testComm); 
  commWatchDogReset();
  systemWatchDog(); 
  return getDataStream(result);
}

void setVariables(String data) {
  data.replace(F("\""), commaChar);
  data += ",";
  Serial.println(F("» Variables: "));
  // Serial.print(F("  ├─ GSM: ")); Serial.println(data);
  int startIndex = 0; 
  int endIndex = data.indexOf(commaChar); 
  int lastIndex = data.lastIndexOf(commaChar); 
  int auxMode = data.substring(startIndex, endIndex).toInt();
  if (operationMode == 0 && auxMode != 0) for (int i = 0; i < numSensors; i++) dataToSend[i] = strEmpty;
  operationMode = auxMode;
  Serial.print(F("  ├─ Frecuencia: ")); operationMode != 0 ? (Serial.println(String(operationMode) + " minutos")) : (Serial.println(F("Descubrimiento")));
  Serial.print(F("  └─ Sensores: ")); 
  for (int i = 0; i < numSensors; i++) { 
    if (endIndex + 1 <= lastIndex) {
      startIndex = endIndex + 1; 
      endIndex = data.indexOf(commaChar, startIndex); 
      String aux = startIndex == lastIndex ? data.substring(startIndex) : data.substring(startIndex, endIndex); 
      sensorList[i] = aux.indexOf(startAddress) == 0 && aux.length() > 2 ? aux : baseAddress;
    } else {
      sensorList[i] = baseAddress;
    }
    if (i > 0) Serial.print(commaChar); Serial.print(sensorList[i]);
  }
}

void comunicaciones(String strToSend) {
  String data = ""; 
  if (!testData) {
    Serial.println(F("\nComunicación con el servidor"));
    setupGSM();
    data = httpRequest(strToSend); 
  } else if (first) {
    Serial.println(F("Mockup data..."));
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
