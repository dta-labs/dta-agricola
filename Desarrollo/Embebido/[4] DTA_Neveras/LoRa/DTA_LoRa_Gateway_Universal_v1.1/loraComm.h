#pragma region LoRa

#include <SPI.h>
#include <LoRa.h>

// Cola de paquetes recibidos: se llena en loraPoll() (fuera de la sesión GSM; durante
// la sesión el radio duerme) y se procesa en serviceLoRa().
char rxQueue[RXQ_SIZE][PKT_LEN];
uint8_t rxTail = 0;
uint8_t rxCount = 0;
uint16_t rxDropped = 0;

bool initLoRa() {
  for (uint8_t i = 1; i <= LORA_INIT_RETRIES; i++) {
    if (LoRa.begin(FREQUENCY)) {
      LoRa.setTxPower(20);                            // Potencia de transmisión 20 dBm
      LoRa.setSignalBandwidth(125E3);                 // Ancho de banda 125 kHz
      LoRa.setSpreadingFactor(9);                     // Factor de propagación 9
      LoRa.setCodingRate4(5);                         // Tasa de codificación 4/5
      loraOk = true;
      DBG_PRINTLN(F("-> LoRa inicializado correctamente"));
      return true;
    }
    DBG_PRINT(F("-> LoRa: intento ")); DBG_PRINT(i); DBG_PRINTLN(F(" fallido"));
    waitMs(500);
  }
  loraOk = false;
  DBG_PRINTLN(F("-> LoRa no inicializado ✘"));
  return false;
}

// Debe llamarse con frecuencia: parsePacket() vuelve a armar la recepción del radio
void loraPoll() {
  if (!loraOk) return;
  if (LoRa.parsePacket() <= 0) return;
  if (rxCount >= RXQ_SIZE) { rxDropped++; return; }
  char* pkt = rxQueue[(rxTail + rxCount) % RXQ_SIZE];
  uint8_t n = 0;
  bool tooLong = false;
  while (LoRa.available()) {
    char c = (char) LoRa.read();
    if (n < PKT_LEN - 1) pkt[n++] = c; else tooLong = true;
  }
  pkt[n] = '\0';
  if (!tooLong && n > 0 && strlen(pkt) == n) rxCount++;
}

// ---------- Lista de sensores ----------

int getPossition(uint64_t id) {
  for (uint8_t i = 0; i < cfg.count; i++) if (cfg.ids[i] == id) return i;
  return -1;
}

int getPossition(const char* id) {                   // Id completo, sin importar mayúsculas
  uint64_t v;
  return parseId(id, strlen(id), v) ? getPossition(v) : -1;
}

int setPossition(uint64_t id) {                      // Máximo MAX_SENSORS elementos
  if (getPossition(id) != -1 || cfg.count >= MAX_SENSORS) return -1;
  cfg.ids[cfg.count] = id;
  return cfg.count++;
}

// Separadores de la lista: coma, espacio o comillas (sensor_v6.php responde "5"0xA"0xB")
bool isListSeparator(char c) {
  return c == ',' || c == ' ' || c == '"';
}

// Siguiente Id válido de la lista [p, end); los inválidos se omiten. Devuelve false al terminar.
bool nextListId(const char*& p, const char* end, uint64_t& id) {
  while (p < end) {
    while (p < end && isListSeparator(*p)) p++;
    const char* start = p;
    while (p < end && !isListSeparator(*p)) p++;
    if (p > start && parseId(start, p - start, id)) return true;
  }
  return false;
}

// Carga una lista de Ids delimitada por [p, end)
void setSensorList(const char* p, const char* end) {
  memset(cfg.ids, 0, sizeof(cfg.ids));
  cfg.count = 0;
  uint64_t id;
  while (cfg.count < MAX_SENSORS && nextListId(p, end, id)) cfg.ids[cfg.count++] = id;
}

// Antes de cargar una lista nueva [p, end): borra las lecturas de las posiciones cuyo Id cambia,
// para que una lectura pendiente no se atribuya al sensor que ahora ocupa esa posición
void clearChangedSlots(const char* p, const char* end) {
  for (uint8_t i = 0; i < MAX_SENSORS; i++) {
    uint64_t id;
    bool same = nextListId(p, end, id) && i < cfg.count && cfg.ids[i] == id;
    if (!same) {                                      // Sensor distinto: se borra su histórico
      dataToSend[i][0] = '\0';
      dataAge[i] = 1;                                 // Sin datos todavía
    }
  }
}

void clearAllData() {
  memset(dataToSend, 0, sizeof(dataToSend));
  for (uint8_t i = 0; i < MAX_SENSORS; i++) dataAge[i] = 1;   // Sin datos todavía
}

// ---------- Tramas: DTA-XXX-0xId,Tipo,TTL,Val1,Val2,Vcc,CS ----------

bool headerContains(const char* header, uint8_t len, PGM_P text) {
  uint8_t n = strlen_P(text);
  for (uint8_t i = 0; i + n <= len; i++) {
    if (strncmp_P(header + i, text, n) == 0) return true;
  }
  return false;
}

// Valida la trama y devuelve la posición de sus 6 primeras comas
bool loraCheckData(const char* t, uint8_t* comma) {
  if (strncmp_P(t, PSTR("DTA-"), 4) != 0 || strstr_P(t, PSTR("0x0")) != NULL) return false;
  uint8_t n = 0;
  for (uint8_t i = 0; t[i] && n < 6; i++) if (t[i] == ',') comma[n++] = i;
  if (n < 6) return false;
  const char* type = t + comma[0] + 1;
  if (!((type[0] == 'a' || type[0] == 'd') && type[1] == ',')) return false;    // Validar DataType
  int ttl = atoi(t + comma[1] + 1);
  if (ttl < 0 || ttl > 5) return false;                                         // Validar TTL
  int val1 = atoi(t + comma[2] + 1);
  if (val1 < -1 || val1 > 100) return false;                                    // Validar Hr / Irms1
  const char* val2 = t + comma[3] + 1;
  if (headerContains(t, comma[0], PSTR("SHT"))) {
    float tVal = atof(val2);
    if (tVal < -25.0 || tVal > 75.0) return false;                              // Validar T
  }
  if (headerContains(t, comma[0], PSTR("SCT"))) {
    int i2Val = atoi(val2);
    if (i2Val < -1 || i2Val > 100) return false;                                // Validar Irms2
  }
  float vcc = atof(t + comma[4] + 1);
  if (vcc < 2.0 || vcc > 6.0) return false;                                     // Validar Vcc
  if (calculateSum(t, comma[5] + 1) != atoi(t + comma[5] + 1)) return false;    // Validar checksum
  return true;
}

// Lee el Id ("0x...") del encabezado de la trama
bool extractId(const char* t, uint8_t headerLen, uint64_t& id) {
  for (uint8_t i = 0; i + 1 < headerLen; i++) {
    if (t[i] == '0' && (t[i + 1] == 'x' || t[i + 1] == 'X')) return parseId(t + i, headerLen - i, id);
  }
  return false;
}

void loraTxData(const char* dataStr) {
  LoRa.idle();
  Serial.print(F("\n        ~ Confirmación: ")); Serial.print(dataStr);
  LoRa.beginPacket();
  LoRa.print(dataStr);
  LoRa.endPacket();
  DBG_PRINT(F(" [Ok]"));
}

void sendConfirmation(const char* header, uint8_t headerLen) {
  char ack[PKT_LEN];
  int frec = cfg.mode / 2;
  if (frec < 1) frec = 1;
  memcpy(ack, header, headerLen);
  uint8_t n = headerLen;
  n += snprintf_P(ack + n, sizeof(ack) - n, PSTR(",a,%d,%d,"), TTL, frec);
  snprintf_P(ack + n, sizeof(ack) - n, PSTR("%d"), calculateSum(ack, n));
  waitMs(500);                                        // Da tiempo al sensor de pasar a recepción
  loraTxData(ack);
}

void discoverNewSensor(uint64_t id) {
  int index = setPossition(id);
  if (index != -1) {
    char txt[ID_LEN];
    formatId(id, txt);
    Serial.print(F("\n     [")); Serial.print(index); Serial.print(F("] <- ")); Serial.print(txt);
  }
}

void processData(const char* t, const uint8_t* comma, uint64_t id) {
  int index = getPossition(id);
  if (index == -1) { DBG_PRINT(F(" (sensor no registrado)")); return; }
  if (t[comma[0] + 1] != 'd') return;
  uint8_t start = comma[2] + 1;                       // Val1,Val2,Vcc (sin TTL ni checksum)
  uint8_t len = comma[5] - start;
  if (len >= DATA_LEN) return;
  memcpy(dataToSend[index], t + start, len);
  dataToSend[index][len] = '\0';
  dataAge[index] = 0;                                 // Lectura nueva: &lo = 1 hasta que el servidor la confirme
  sendConfirmation(t, comma[0]);
}

void handlePacket(const char* t) {
  uint8_t comma[6];
  if (!loraCheckData(t, comma)) {
    DBG_PRINT(F("\n     -> ")); DBG_PRINT(t);
    DBG_PRINT(F(" Error de lectura / Dispositivo no reconocido"));
    return;
  }
  uint64_t id;
  if (!extractId(t, comma[0], id)) return;
  DBG_PRINT(F("\n     -> ")); DBG_PRINT(t);
  if (cfg.mode == 0) {
    DBG_PRINT(F(" [descubrimiento: sin confirmacion]"));
    discoverNewSensor(id);
  } else {
    processData(t, comma, id);
  }
}

// Procesa los paquetes en cola (no reentrante)
void serviceLoRa() {
  static bool busy = false;
  if (busy) return;
  busy = true;
  while (rxCount > 0) {
    handlePacket(rxQueue[rxTail]);
    rxTail = (rxTail + 1) % RXQ_SIZE;
    rxCount--;
  }
  busy = false;
}

#pragma endregion LoRa
