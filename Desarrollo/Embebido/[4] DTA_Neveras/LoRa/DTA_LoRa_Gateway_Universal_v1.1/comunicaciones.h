#pragma region Comunicaciones

const char P_OK[] PROGMEM = "OK";
const char P_HTTPACTION[] PROGMEM = "+HTTPACTION:";

unsigned long gsmTimeout() {
  return (signalVar < 10) ? 10000UL : 5000UL;          // 10 s si la señal es débil, 5 s si es aceptable
}

// Mensajes espontáneos del SIM800 que indican una desconexión y su causa (D-030)
void checkModemEvents(const char* text) {
  if (strstr_P(text, PSTR("RDY")) || strstr_P(text, PSTR("Call Ready")) || strstr_P(text, PSTR("NORMAL POWER DOWN"))) {
    DBG_PRINTLN(F("⚠ Módem reiniciado: se reconfigura el GSM"));
    restartGSM = true;
  }
  if (strstr_P(text, PSTR("UNDER-VOLTAGE"))) DBG_PRINTLN(F("⚠ Bajo voltaje en el módem: revisar la fuente (picos de hasta 2 A)"));
  if (strstr_P(text, PSTR("OVER-VOLTAGE"))) DBG_PRINTLN(F("⚠ Sobrevoltaje en el módem"));
  if (strstr_P(text, PSTR("+SAPBR 1: DEACT"))) DBG_PRINTLN(F("⚠ La red cerró la conexión GPRS"));
}

// Descarta lo pendiente antes de un comando, revisando si son mensajes espontáneos del módem
void gsmFlush() {
  char pending[64];
  uint8_t n = 0;
  while (gprs.available()) {
    char c = gprs.read();
    if (n < sizeof(pending) - 1) pending[n++] = c;
  }
  if (n == 0) return;
  pending[n] = '\0';
  if (TEST_COMM) { DBG_PRINT(F("[espontáneo] ")); DBG_PRINTLN(pending); }
  checkModemEvents(pending);
}

#define GSM_SILENCE_MS 200                             // Fin de respuesta: 200 ms sin datos (como en la v1)

// ¿La respuesta tiene alguna línea completa que no sea el eco del comando?
bool hasResultLine() {
  const char* line = resp;
  while (true) {
    const char* end = strchr(line, '\n');
    if (!end) return false;
    while (line < end && (*line == '\r' || *line == '\n')) line++;
    if (line < end && !(line[0] == 'A' && line[1] == 'T')) return true;
    line = end + 1;
  }
}

// Lee la respuesta del módem hasta encontrar 'expect' (línea completa), "ERROR", o agotar el tiempo.
// Si se espera "OK", también termina tras GSM_SILENCE_MS sin datos una vez recibida una línea de resultado
// (no se queda el tiempo límite completo si el módem respondió otra cosa). Mientras espera sigue
// recibiendo paquetes LoRa y alimentando el watchdog externo.
bool gsmWaitFor(PGM_P expect, unsigned long timeout) {
  respLen = 0;
  resp[0] = '\0';
  bool found = false;
  bool silenceEnds = (expect == P_OK);
  unsigned long t0 = millis();
  unsigned long lastByte = t0;
  while (millis() - t0 < timeout) {
    bool newData = false;
    while (gprs.available()) {
      char c = gprs.read();
      if (respLen < RESP_SIZE - 1) { resp[respLen++] = c; resp[respLen] = '\0'; }
      newData = true;
    }
    if (newData) {
      lastByte = millis();
      const char* p = strstr_P(resp, expect);
      if (p && strchr(p, '\n')) { found = true; break; }
      if (strstr_P(resp, PSTR("ERROR"))) break;
    } else if (silenceEnds && respLen > 0 && millis() - lastByte >= GSM_SILENCE_MS && hasResultLine()) {
      break;
    }
    idleTasks();
  }
  if (TEST_COMM) {
    DBG_PRINT(F("[")); DBG_PRINT(millis() - t0); DBG_PRINT(F(" ms] ")); DBG_PRINTLN(resp);
  }
  checkModemEvents(resp);
  return found;
}

bool atCmd(const __FlashStringHelper* cmd, unsigned long timeout = 0, PGM_P expect = P_OK) {
  gsmFlush();
  gprs.println(cmd);
  return gsmWaitFor(expect, timeout ? timeout : gsmTimeout());
}

/*
  +CSQ: RSSI,BER
  RSSI: 0-9 muy débil, 10-14 baja, 15-19 aceptable, 20-24 buena, 25-31 excelente, 99 desconocida
  BER:  0-3 buena, 4-6 moderada, 7-99 errores significativos
*/
void readCSQ() {
  signalVar = 0;
  QoS = 99;
  if (!atCmd(F("AT+CSQ"))) return;
  const char* p = strstr_P(resp, PSTR("+CSQ:"));
  if (!p) return;
  signalVar = atoi(p + 5);
  const char* c = strchr(p, ',');
  if (c) QoS = atoi(c + 1);
}

bool checkRegistration() {                             // +CREG: n,1 (local) o n,5 (roaming)
  if (!atCmd(F("AT+CREG?"))) return false;
  const char* p = strstr_P(resp, PSTR("+CREG:"));
  const char* c = p ? strchr(p, ',') : NULL;
  if (!c) return false;
  int stat = atoi(c + 1);
  return stat == 1 || stat == 5;
}

bool readIMEI() {
  if (!atCmd(F("AT+GSN"))) return false;
  for (const char* p = resp; *p; p++) {
    if (!isDigit(*p)) continue;
    uint8_t n = 0;
    while (isDigit(p[n])) n++;
    if (n == 15) {
      memcpy(gatewayId, p, 15);
      gatewayId[15] = '\0';
      return true;
    }
    p += n - 1;
  }
  return false;
}

bool openBearer();

// Configuración completa (como la v1): cierra y vuelve a abrir la conexión GPRS. Es el único
// lugar donde se cierra; entre envíos la conexión queda abierta (D-035).
void setupGSM() {
  if (!restartGSM) return;
  DBG_PRINT(F("GSM inicializado"));
  gprs.listen();
  atCmd(F("ATE0"));                                    // Sin eco: respuestas más cortas
  atCmd(F("AT+CFUN=1"));
  atCmd(F("AT+SAPBR=0,1"));
  atCmd(F("AT+CDNSCFG=\"8.8.8.8\",\"8.8.4.4\""));
  atCmd(F("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\""));
  atCmd(F("AT+SAPBR=3,1,\"APN\",\"internet.itelcel.com\""));
  atCmd(F("AT+SAPBR=3,1,\"USER\",\"webgpr\""));
  atCmd(F("AT+SAPBR=3,1,\"PWD\",\"webgprs2002\""));
  for (uint8_t i = 0; gatewayId[0] == '\0' && i < 10; i++) {
    if (!readIMEI()) waitMs(1000);
    Serial.print('.');
  }
  if (gatewayId[0] != '\0') {
    DBG_PRINT(F(" correctamente ✔ IMEI: ")); DBG_PRINTLN(gatewayId);
  } else {
    DBG_PRINTLN(F(" con error ✘"));
  }
  restartGSM = !openBearer();                          // Si no abrió, se reconfigura en el siguiente intento
}

// Imprime la respuesta del módem en una línea (diagnóstico de fallas, siempre activo)
void printModemResp() {
  for (const char* p = resp; *p; p++) DBG_PRINT((*p == '\r' || *p == '\n') ? ' ' : *p);
  DBG_PRINTLN();
}

bool bearerIsOpen() {                                  // +SAPBR: 1,<estado>,"ip"  (1 = conectada)
  if (!atCmd(F("AT+SAPBR=2,1"))) return false;
  const char* p = strstr_P(resp, PSTR("+SAPBR:"));
  const char* c = p ? strchr(p, ',') : NULL;
  return c && atoi(c + 1) == 1;
}

bool gprsAttached() {                                  // +CGATT: 1
  if (!atCmd(F("AT+CGATT?"))) return false;
  const char* p = strstr_P(resp, PSTR("+CGATT:"));
  return p && atoi(p + 7) == 1;
}

// Abre la conexión y verifica que quedó abierta (D-034). Si falla, revisa el enganche a GPRS y reintenta una vez.
bool openBearer() {
  if (bearerIsOpen()) return true;
  for (uint8_t attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0 && !gprsAttached()) {
      DBG_PRINTLN(F("Sin enganche GPRS: AT+CGATT=1"));
      atCmd(F("AT+CGATT=1"), 10000);
    }
    if (!atCmd(F("AT+SAPBR=1,1"), 20000)) {
      DBG_PRINT(F("⚠ AT+SAPBR=1,1 → ")); printModemResp();
    }
    if (bearerIsOpen()) return true;
  }
  DBG_PRINTLN(F("⚠ No se pudo abrir la conexión GPRS"));
  return false;
}

// Si commError llega a 5 se reinicia el equipo por software (D-036: sin watchdog externo).
void checkCommErrors() {
  if (commError == 0) return;
  DBG_PRINT(F("commError: ")); DBG_PRINTLN(commError);
  if (commError < 5) return;
  DBG_PRINTLN(F("Reiniciando el sistema..."));
  Serial.flush();
  resetSoftware();
}

// Imprime la última lectura conocida de cada sensor "v1,v2,Vcc,v1,v2,Vcc,..." (nuevas e históricas)
void printData(Print& out) {
  bool empty = true;
  for (uint8_t i = 0; i < MAX_SENSORS; i++) if (dataToSend[i][0]) empty = false;
  if (empty) return;
  for (uint8_t i = 0; i < MAX_SENSORS; i++) {
    out.print(dataToSend[i]);
    if (i < MAX_SENSORS - 1) out.print(',');
  }
}

// &lo=[...] por posición (D-032): 1 dato nuevo, 0 mismo dato que la vez anterior, -1, -2... ciclos sin
// datos (lo = 1 - edad); 0 también si la posición no tiene sensor asociado
void printNewFlags(Print& out) {
  out.print('[');
  for (uint8_t i = 0; i < MAX_SENSORS; i++) {
    out.print(i < cfg.count ? 1 - (int) dataAge[i] : 0);
    if (i < MAX_SENSORS - 1) out.print(',');
  }
  out.print(']');
}

// El servidor confirmó el envío: cada posición suma una transmisión desde su último dato nuevo
void markTransmitted() {
  for (uint8_t i = 0; i < MAX_SENSORS; i++) if (dataAge[i] < MAX_DATA_AGE) dataAge[i]++;
}

// Ruta y parámetros de la petición (comunes a GSM y WiFi). channel: 'g' GSM, 'w' WiFi (D-039)
void printQuery(Print& out, char channel) {
  out.print(F(SERVER_PATH));
  out.print(gatewayId);
  out.print(F("&data=["));
  printData(out);
  out.print(F("]&rx="));  out.print(systemStart ? F("ini") : F("Ok"));
  out.print(F("&si="));   out.print(signalVar);
  out.print(F("&qos="));  out.print(QoS);
  out.print(F("&lo="));   printNewFlags(out);
  out.print(F("&lr="));   out.print(loraOk ? 1 : 0);
  out.print(F("&cn="));   out.print(channel);
}

void printURL(Print& out, const __FlashStringHelper* host) {
  out.print(F("AT+HTTPPARA=\"URL\",\"http://"));
  out.print(host);
  printQuery(out, 'g');
  out.println('"');
}

#define HTTP_URL_REJECTED -1                           // El módem no aceptó la URL
#define HTTP_NO_RESULT    -2                           // No llegó +HTTPACTION en el tiempo límite
#define HTTP_NO_BEARER    -3                           // No se pudo abrir la conexión GPRS

// Envía la petición GET y devuelve el código HTTP, o HTTP_URL_REJECTED / HTTP_NO_RESULT
int httpGet(const __FlashStringHelper* host) {
  gsmFlush();
#if defined DEBUG
  printURL(Serial, host);
#endif
  printURL(gprs, host);
  if (!gsmWaitFor(P_OK, gsmTimeout())) return HTTP_URL_REJECTED;
  if (!atCmd(F("AT+HTTPACTION=0"), 30000, P_HTTPACTION)) return HTTP_NO_RESULT;
  const char* p = strstr_P(resp, P_HTTPACTION);       // +HTTPACTION: 0,200,45
  const char* c = strchr(p, ',');
  return c ? atoi(c + 1) : HTTP_NO_RESULT;
}

void printHttpStatus(int status) {
  DBG_PRINT(F("HTTP: ")); DBG_PRINT(status);
  if (status == HTTP_URL_REJECTED) DBG_PRINT(F(" (URL rechazada por el módem)"));
  else if (status == HTTP_NO_RESULT) DBG_PRINT(F(" (sin resultado de HTTPACTION en 30 s)"));
  else if (status == HTTP_NO_BEARER) DBG_PRINT(F(" (sin conexión GPRS)"));
  else if (status >= 600) DBG_PRINT(F(" (error de red)"));
  DBG_PRINTLN();
}

// Inicia el servicio HTTP y hace el GET (con respaldo por IP si falla el DNS)
int httpSession() {
  if (!atCmd(F("AT+HTTPINIT"))) {                      // Servicio HTTP abierto de un ciclo anterior
    atCmd(F("AT+HTTPTERM"));
    atCmd(F("AT+HTTPINIT"));
  }
  atCmd(F("AT+HTTPPARA=\"CID\",1"));
  int status = httpGet(F(DOMAIN_NAME));
  if (status == 603) status = httpGet(F(DOMAIN_IP));    // Falla de DNS: usar la IP
  return status;
}

// Configuración del servidor: "modo"0xId1"0xId2"..." (también acepta comas como separador).
// Se toma el texto entre comillas y se ignora lo que el servidor agregue antes o después
// (BOM, saltos de línea, avisos de PHP). formatError: no se encontró una configuración completa.
// h: texto de la respuesta (GSM: desde +HTTPREAD; WiFi: cuerpo de #R)
bool applyConfig(const char* h, bool& formatError) {
  formatError = false;
  const char* q1 = strchr(h, '"');                              // Comilla de apertura
  const char* q2 = NULL;                                        // Comilla de cierre: no va seguida de un Id
  if (q1 && isDigit(q1[1])) {
    for (const char* p = q1 + 1; *p; p++) {
      if (*p == '"' && !isalnum(p[1])) { q2 = p; break; }
    }
  }
  if (!q2) {
    formatError = true;
    DBG_PRINT(F("Respuesta sin configuración: ")); DBG_PRINTLN(h);
    return false;
  }
  markTransmitted();                                   // Respuesta válida: el envío quedó confirmado
  int newMode = atoi(q1 + 1);
  if (cfg.mode == 0 && newMode != 0) clearAllData();
  cfg.mode = newMode;
  const char* start = q1 + 1;
  while (start < q2 && !isListSeparator(*start)) start++;     // Saltar el modo
  clearChangedSlots(start, q2);
  setSensorList(start, q2);
  saveConfig();
  DBG_PRINT(F("Configuración recibida: modo ")); DBG_PRINT(cfg.mode);
  DBG_PRINT(F(", sensores ")); DBG_PRINTLN(cfg.count);
  return true;
}

// Respuesta del módem: +HTTPREAD: <n>\r\n"modo"0xId1"0xId2"..."\r\nOK
bool applyServerResponse(bool& formatError) {
  formatError = false;
  const char* h = strstr_P(resp, PSTR("+HTTPREAD:"));
  if (!h) return false;
  return applyConfig(h, formatError);
}

void httpRequest() {
  if (gatewayId[0] == '\0') {
    restartGSM = true;
    serverOk = false;
    commError++;
    DBG_PRINT(F("IMEI no disponible. Señal: ")); DBG_PRINTLN(signalVar);
    checkCommErrors();
    return;
  }
  DBG_PRINTLN(F("Inicio de la comunicación..."));
  int status = httpSession();
  if (status < 0 || status >= 600) {                   // Falla de red: reconfigurar (como la v1) y reintentar ya
    printHttpStatus(status);
    DBG_PRINTLN(F("Reconectando el GSM y reintentando"));
    // atCmd(F("AT+HTTPTERM"));
    restartGSM = true;
    setupGSM();
    status = restartGSM ? HTTP_NO_BEARER : httpSession();
  }
  printHttpStatus(status);
  bool formatError = false;
  serverOk = false;
  if (status > 0 && status != 603 && atCmd(F(HTTPREAD_CMD))) {
    serverOk = applyServerResponse(formatError);
  }
  // atCmd(F("AT+HTTPTERM"));                             // La conexión GPRS queda abierta (D-035)
  bool networkFail = status < 0 || status >= 600;
  commError = serverOk ? 0 : commError + 1;
  if (networkFail || commError >= GSM_FULL_SETUP_AFTER) restartGSM = true;
  checkCommErrors();
}

void showVariables() {
  DBG_PRINT(F("Memoria disponible: ")); DBG_PRINT(freeRam());
#if defined(__AVR__)
  uint16_t minFree = minFreeRam();
  DBG_PRINT(F(" (mínima desde el arranque: ")); DBG_PRINT(minFree); DBG_PRINT(F(")"));
  if (minFree < RAM_WARNING) DBG_PRINT(F(" ⚠ MEMORIA BAJA"));
#endif
  DBG_PRINTLN();
  DBG_PRINTLN(F("» Variables: "));
  DBG_PRINT(F("  ├─ Enlace: "));
  if (lastChannel == 'w') { DBG_PRINT(F("WiFi (")); DBG_PRINT(wifiRssi); DBG_PRINTLN(F(" dBm)")); }
  else { DBG_PRINT(F("GSM (señal ")); DBG_PRINT(signalVar); DBG_PRINTLN(F(")")); }
  DBG_PRINT(F("  ├─ Frecuencia: "));
  if (cfg.mode != 0) { DBG_PRINT(cfg.mode); DBG_PRINTLN(F(" minutos")); }
  else DBG_PRINTLN(F("Descubrimiento"));
  DBG_PRINT(F("  ├─ LoRa: ")); DBG_PRINT(loraOk ? F("Ok") : F("Error"));
  DBG_PRINT(F(" (paquetes perdidos: ")); DBG_PRINT(rxDropped); DBG_PRINTLN(F(")"));
  DBG_PRINT(F("  └─ Sensores: "));
  for (uint8_t i = 0; i < cfg.count; i++) {
    char txt[ID_LEN];
    formatId(cfg.ids[i], txt);
    if (i) DBG_PRINT(',');
    DBG_PRINT(txt);
  }
  DBG_PRINTLN();
}

void comunicaciones() {
  char buffer[RESP_SIZE];                              // Respuesta del módem: solo existe durante la comunicación
  char* previous = resp;
  resp = buffer;
  respLen = 0;
  buffer[0] = '\0';
  DBG_PRINTLN(F("\nComunicación con el servidor"));
  gsmSession = true;                                   // Sin LoRa durante la sesión de envío (consumo y picos de corriente)
  if (loraOk) LoRa.sleep();
#if !TEST_SYSTEM
  gprs.listen();
  gsmFlush();                                          // ¿El módem se reinició o la red cerró la conexión?
  if (gatewayId[0] == '\0') setupGSM();                // El IMEI es el Id del gateway, también por WiFi (D-038)
  if (wifiRequest()) {                                 // 1ª opción: WiFi
    lastChannel = 'w';
  } else {                                             // 2ª opción: GSM, en el mismo ciclo
    gprs.listen();
    setupGSM();
    readCSQ();
    netRegistered = checkRegistration();
    httpRequest();
    lastChannel = 'g';
  }
  gprs.listen();                                       // Entre envíos se escucha el módem
#endif
  if (loraOk) LoRa.idle();                             // Vuelve a escuchar en el siguiente loraPoll()
  gsmSession = false;
  showVariables();
  systemStart = false;
  resp = previous;
}

#pragma endregion Comunicaciones
