#pragma region Comunicaciones

#ifndef SoftwareSerial_h
  #include <SoftwareSerial.h>
#endif

#define BAUDRATE 9600
SoftwareSerial espSerial(A0, A1);                                                 // RX=A0, TX=A1

bool wifiActiva = false;

bool detectarESP() {
  espSerial.println("AT");
  String respuesta = "";
  unsigned long start = millis();
  while (millis() - start < 3000) { // espera hasta 3 segundos
    while (espSerial.available()) {
      respuesta += char(espSerial.read());
    }
  }
  Serial.print(F("Respuesta cruda: ")); Serial.print(respuesta);
  if (respuesta.indexOf("OK") >= 0) {
    Serial.println(F(" ESP8266 detectado"));
    return true;
  } else {
    Serial.println(F(" ESP8266 no responde"));
    return false;
  }
}

void configurarWiFi() {
  espSerial.println("AT+CWJAP?");                                                 // Consultar estado de conexión
  delay(1000);
  if (espSerial.find("No AP")) {
    Serial.println(F("No hay WiFi configurada, abriendo AP..."));
    espSerial.println("AT+CWMODE=2");                                             // AP mode
    espSerial.println("AT+CWSAP=\"DTA_Gateway_Config\",\"\",5,0"); 
    Serial.println(F("AP activo en SSID: DTA_Gateway_Config (IP 192.168.4.1)"));  // SSID=Gateway_Config, sin password
    wifiActiva = false;
  } else {
    Serial.println(F("WiFi ya configurada"));
    wifiActiva = true;
  }
}

void initWifi() {
  pinMode(A0, OUTPUT);
  pinMode(A1, OUTPUT);
  espSerial.begin(BAUDRATE);
  if (detectarESP()) configurarWiFi();
}

String getMAC() {
  espSerial.println("AT+CIPSTAMAC?");
  delay(1000);
  String respuesta = "";
  while (espSerial.available()) respuesta += char(espSerial.read());
  int inicio = respuesta.indexOf("\"");
  int fin = respuesta.lastIndexOf("\"");
  String mac = respuesta.substring(inicio + 1, fin);
  mac.replace(":", "");
  Serial.print(F("MAC limpia: ")); Serial.println(mac);
  return mac;
}

int getWiFiRSSI() {
  espSerial.println("AT+CWJAP?");
  delay(1000);

  String respuesta = "";
  while (espSerial.available()) {
    respuesta += char(espSerial.read());
  }

  // Buscar coma después del SSID
  int coma = respuesta.indexOf("\",");
  if (coma > 0) {
    String rssiStr = respuesta.substring(coma + 2, respuesta.indexOf(",", coma + 2));
    int rssi = rssiStr.toInt();
    Serial.print(F("RSSI: "));
    Serial.println(rssi);
    return rssi;
  }

  Serial.println(F("No se pudo leer RSSI"));
  return 0;
}

// String getDataWiFi() {
//   bool empty = true;
//   String result = strEmpty;
//   for (int i = 0; i < numSensors; i++) { 
//     dataToSend[i] = dataToSend[i].indexOf("DTA") == -1 ? dataToSend[i] : strEmpty;
//     empty = dataToSend[i] != strEmpty ? false : empty;
//     result += dataToSend[i] + (i < numSensors - 1 ? commaChar : strEmpty);
//   }
//   return empty ? strEmpty : result;
// }

String setURL(String baseURL, String mac) {
  signalVar = getWiFiRSSI();
  String url = httpServer2; url += mac; 
  url += F("&data=["); url += getData() + F("]");
  url += F("&rx="); url += systemStart ? F("ini") : commRx ? F("Ok") : F("Er");
  url += F("&si="); url += (String)signalVar;
  url += F("&qos="); url += F("0\"");
  DBG_PRINTLN(url);
  return url;
}

String filterResponse(String result) {
  int cuerpoIndex = result.indexOf("\r\n\r\n");
  String cuerpo = "";
  if (cuerpoIndex > 0) {
    cuerpo = result.substring(cuerpoIndex + 4); // saltar cabeceras
  } else {
    cuerpo = result; // fallback si no hay cabeceras
  }
  return cuerpo;
}

String getResponse() {
  String result = "";
  unsigned long start = millis();
  while (millis() - start < 5000) { // esperar hasta 5s
    while (espSerial.available()) {
      char c = espSerial.read();
      result += c;
    }
  }
  return filterResponse(result);
}

String httpRequestWiFi(bool https = false) {
  if (!wifiActiva) {
    Serial.println(F("WiFi no activa, no se puede enviar GET"));
    return;
  }
  String host = true ? domainName : domainIP;
  String path = setURL(getMAC());
  if (https) {                                                                    // Abrir conexión
    espSerial.print("AT+CIPSTART=\"SSL\",\"");
  } else {
    espSerial.print("AT+CIPSTART=\"TCP\",\"");
  }
  espSerial.print(host);                                                          // Construir petición
  espSerial.print("\",80\r\n"); delay(2000);                                      // puerto 80 para HTTP, 443 para HTTPS
  String getReq = String("GET ") + path + " HTTP/1.1\r\nHost: " + host + "\r\nConnection: close\r\n\r\n";
  espSerial.print("AT+CIPSEND=");
  espSerial.println(getReq.length()); delay(1000);
  espSerial.print(getReq); delay(3000);
  return getResponse(); 
}

void processWiFiData(String data) {
  int numAuxMode = data.substring(1, data.indexOf(commaChar, 1)).toInt();
  if (operationMode == 0 && numAuxMode != 0) RESETDATA(dataToSend, numSensors);
  operationMode = numAuxMode;
  sensorList = data.substring(data.indexOf(commaChar, 1) + 1, data.length() - 1);
}

void comunicacionesWiFi() {
  espSerial.listen();
  systemWatchDog(); 
  if (wifiActiva) {
    DBG_PRINTLN(F("\nComunicación WiFi"));
    processWiFiData(httpRequestWiFi()); 
    showVariables();
    systemStart &= false;
  } else {
    DBG_PRINTLN(F("Esperando configuración WiFi..."));
  }
}

#pragma endregion Comunicaciones
