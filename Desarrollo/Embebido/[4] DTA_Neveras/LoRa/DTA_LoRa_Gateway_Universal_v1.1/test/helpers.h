// Utilidades comunes de las pruebas del gateway.
// IMPORTANTE: si se agrega una variable global al sketch, agregarla también en resetGateway().
#pragma once

struct ResetCalled {};

char testResp[RESP_SIZE];                     // Buffer de respuesta para pruebas fuera de comunicaciones()

// Id de la posición i como texto ("0xA1")
inline std::string idOf(int i) {
  char b[24];
  formatId(cfg.ids[i], b);
  return b;
}                         // Lanzada en lugar de reiniciar el MCU
inline void throwReset() { throw ResetCalled{}; }

// Deja el sketch y las simulaciones como recién encendidos (EEPROM borrada)
inline void resetGateway() {
  mock::now = 0;
  mock::events.clear();
  std::memset(mock::pins, 0, sizeof mock::pins);
  std::memset(mock::pinModes, 0, sizeof mock::pinModes);
  Serial.out.clear();
  LoRa.reset();
  EEPROM.erase();
  gprs.reset();
  espSerial.reset();
  SoftwareSerial::active = nullptr;
  gprs.listen();

  std::memset(&cfg, 0, sizeof cfg);
  cfg.mode = DEFAULT_MODE;
  std::memset(dataToSend, 0, sizeof dataToSend);
  for (int i = 0; i < MAX_SENSORS; i++) dataAge[i] = 1;
  gatewayId[0] = '\0';
  resp = testResp;
  resp[0] = '\0';
  respLen = 0;
  loraOk = false;
  netRegistered = false;
  serverOk = false;
  restartGSM = true;
  gsmSession = false;
  systemStart = true;
  signalVar = 0;
  QoS = 99;
  commError = 0;
  commTimer = 0;
  wifiState = ESP_NO_REPLY;
  wifiRssi = 0;
  lastChannel = '-';
  rxTail = 0;
  rxCount = 0;
  rxDropped = 0;
  resetSoftware = throwReset;
}

inline int checksumOf(const std::string& s) {
  int sum = 0;
  for (char c : s) sum += c;
  return sum;
}

// Trama de un nodo: <encabezado>,<tipo>,<ttl>,<v1>,<v2>,<vcc>,<CS>
inline std::string nodeFrame(const std::string& header, const std::string& v1 = "60", const std::string& v2 = "4.0",
                             const std::string& vcc = "3.30", const std::string& type = "d", const std::string& ttl = "5") {
  std::string s = header + "," + type + "," + ttl + "," + v1 + "," + v2 + "," + vcc + ",";
  return s + std::to_string(checksumOf(s));
}

// Confirmación esperada del gateway
inline std::string expectedAck(const std::string& header, int frec, int ttl = TTL) {
  std::string s = header + ",a," + std::to_string(ttl) + "," + std::to_string(frec) + ",";
  return s + std::to_string(checksumOf(s));
}

// Gateway con LoRa listo, lista "0xA1,0xB2,0xC3" y modo 5
inline void readyGateway() {
  resetGateway();
  loraOk = true;
  const char* l = "0xA1,0xB2,0xC3";
  setSensorList(l, l + strlen(l));
  cfg.mode = 5;
}

// Recibe un paquete LoRa y lo procesa
inline void receive(const std::string& frame) {
  LoRa.rx.push_back(frame);
  loraPoll();
  serviceLoRa();
}

// Pone en resp una respuesta HTTPREAD con el contenido indicado (sin comillas)
inline bool applyBody(const std::string& content, bool* lengthError = nullptr) {
  std::string b = "\r\n+HTTPREAD: " + std::to_string(content.size() + 2) + "\r\n\"" + content + "\"\r\nOK\r\n";
  std::strcpy(resp, b.c_str());
  bool fe = false;
  bool ok = applyServerResponse(fe);
  if (lengthError) *lengthError = fe;
  return ok;
}

inline bool contains(const std::string& s, const std::string& part) { return s.find(part) != std::string::npos; }
