#pragma region WiFi

// Enlace con el ESP8266 (firmware DTA_Gateway_WiFi_ESP8266) por SoftwareSerial en A0/A1 (D-036, D-037).
// Protocolo por líneas con prefijo '#' (spec/protocolo.md); cualquier otra línea se ignora (D-040).

// RSSI (dBm) a la escala de AT+CSQ: -113 dBm → 0 … -51 dBm → 31 (D-039)
uint8_t rssiToCsq(int rssi) {
  int v = (rssi + 113) / 2;
  if (v < 0) v = 0;
  if (v > 31) v = 31;
  return v;
}

void espFlush() {
  while (espSerial.available()) espSerial.read();
}

// Espera una línea del ESP que contenga 'prefix' y la deja en resp (desde el prefijo, sin \r\n).
// Las líneas que no son del protocolo (mensajes de arranque del ESP) se descartan.
bool espWaitFor(PGM_P prefix, unsigned long timeout) {
  respLen = 0;
  resp[0] = '\0';
  unsigned long t0 = millis();
  while (millis() - t0 < timeout) {
    while (espSerial.available()) {
      char c = espSerial.read();
      if (c == '\n') {
        if (respLen > 0 && resp[respLen - 1] == '\r') resp[--respLen] = '\0';
        char* p = strstr_P(resp, prefix);
        if (p) {
          respLen -= p - resp;
          memmove(resp, p, respLen + 1);
          return true;
        }
        respLen = 0;                                   // Línea ajena al protocolo
        resp[0] = '\0';
      } else if (respLen < RESP_SIZE - 1) {
        resp[respLen++] = c;
        resp[respLen] = '\0';
      }
    }
    idleTasks();
  }
  if (TEST_COMM) { DBG_PRINT(F("[ESP] ")); DBG_PRINTLN(resp); }
  return false;
}

// #ST,<IMEI> → #ST,<estado>,<rssi>. Sin respuesta: wifiState = ESP_NO_REPLY
void espStatus() {
  wifiState = ESP_NO_REPLY;
  wifiRssi = 0;
  espFlush();
  espSerial.print(F("#ST,"));
  espSerial.println(gatewayId);
  if (!espWaitFor(PSTR("#ST,"), ESP_STATUS_MS)) return;
  const char* p = resp + 4;
  wifiState = atoi(p);
  const char* c = strchr(p, ',');
  if (c) wifiRssi = atoi(c + 1);
}

// #GET,<host>,<ruta> → #R,<código>,<cuerpo>. Devuelve el código (ESP_NO_RESULT si no hubo respuesta)
int wifiGet(const __FlashStringHelper* host) {
  espFlush();
#if defined DEBUG
  Serial.print(F("#GET,")); Serial.print(host); Serial.print(','); printQuery(Serial, 'w'); Serial.println();
#endif
  espSerial.print(F("#GET,"));
  espSerial.print(host);
  espSerial.print(',');
  printQuery(espSerial, 'w');
  espSerial.println();
  if (!espWaitFor(PSTR("#R,"), ESP_HTTP_MS)) return ESP_NO_RESULT;
  return atoi(resp + 3);
}

void printWifiStatus(int status) {
  DBG_PRINT(F("WiFi HTTP: ")); DBG_PRINT(status);
  if (status == ESP_CONN_FAILED) DBG_PRINT(F(" (sin conexión con el servidor o falla de DNS)"));
  else if (status == -11) DBG_PRINT(F(" (tiempo agotado)"));
  else if (status == -20) DBG_PRINT(F(" (sin WiFi)"));
  else if (status == ESP_NO_RESULT) DBG_PRINT(F(" (el ESP8266 no respondió)"));
  DBG_PRINTLN();
}

// 1ª opción de envío (D-038). true: el servidor respondió una configuración válida por WiFi.
// false: hay que enviar por GSM (sin IMEI, ESP sin respuesta, WiFi sin configurar o sin conexión, o falla).
bool wifiRequest() {
  if (gatewayId[0] == '\0') return false;              // Sin Id no se envía (se lee del GSM)
  espSerial.listen();
  espStatus();
  if (wifiState != WIFI_CONNECTED) {
    if (wifiState == ESP_NO_REPLY) DBG_PRINTLN(F("ESP8266 no responde: envío por GSM"));
    else if (wifiState == WIFI_NOT_SET) DBG_PRINTLN(F("WiFi sin configurar: envío por GSM"));
    else DBG_PRINTLN(F("WiFi sin conexión: envío por GSM"));
    return false;
  }
  DBG_PRINT(F("Envío por WiFi (")); DBG_PRINT(wifiRssi); DBG_PRINTLN(F(" dBm)"));
  signalVar = rssiToCsq(wifiRssi);
  QoS = 99;                                            // No aplica en WiFi
  int status = wifiGet(F(DOMAIN_NAME));
  if (status == ESP_CONN_FAILED) status = wifiGet(F(DOMAIN_IP));   // Falla de DNS: usar la IP
  printWifiStatus(status);
  bool formatError = false;
  bool ok = false;
  if (status == 200) {                               // Por WiFi solo se acepta 200 (P-010)
    const char* body = strchr(resp + 3, ',');          // #R,<código>,<cuerpo>
    if (body) ok = applyConfig(body + 1, formatError);
  }
  if (!ok) {
    DBG_PRINTLN(F("Falló el envío por WiFi: envío por GSM"));
    return false;
  }
  serverOk = true;
  commError = 0;
  return true;
}

#pragma endregion WiFi
