// Utilidades comunes de las pruebas.
// IMPORTANTE: si se agrega una variable global al sketch, agregarla también en resetNode().
#pragma once

// Deja el sketch y todas las simulaciones como recién encendidos (EEPROM borrada).
inline void resetNode() {
  mock::now = 0;
  mock::events.clear();
  mock::randomCounter = 0;
  mock::wdtEnabled = false;
  mock::wdtArmCount = 0;
  mock::adcValue = 341;
  MCUSR = 0xFF;
  Serial.out.clear();
  LoRa.reset();
  LowPower.reset();
  EEPROM.erase();
  sht4.reset();

  NODE_ID[0] = '\0';
  TIMER = DEFAULT_TIMER;
  t_actual = 0;
  h_actual = 0;
  sensorOk = false;
  loraOk = false;
  hasSent = false;
  t_sent = 0;
  h_sent = 0;
  errorSent = false;
  cyclesSinceTx = 0;
  lastTxFailed = false;
  nodeCfg.serial = 0;
  nodeCfg.timer = DEFAULT_TIMER;
}

// Suma de caracteres hasta la última coma (mismo algoritmo que el protocolo)
inline int checksumOf(const std::string& s) {
  int sum = 0;
  for (char c : s) sum += c;
  return sum;
}

// Construye la confirmación que enviaría el gateway: <encabezado>,a,<TTL>,<frec>,<CS>
inline std::string gatewayAck(const std::string& header, int frec, int ttl = 5) {
  std::string s = header + ",a," + std::to_string(ttl) + "," + std::to_string(frec) + ",";
  return s + std::to_string(checksumOf(s));
}

// Gateway simulado: confirma cada trama recibida con la frecuencia indicada
inline void gatewayResponds(int frec = DEFAULT_TIMER) {
  LoRa.onTx = [frec](const std::string& frame) {
    LoRa.rx.push_back(gatewayAck(frame.substr(0, frame.find(',')), frec));
  };
}

// Gateway apagado: nadie confirma
inline void gatewaySilent() { LoRa.onTx = nullptr; }

// Separa una trama en campos
inline std::vector<std::string> fields(const std::string& frame) {
  std::vector<std::string> f;
  size_t start = 0, pos;
  while ((pos = frame.find(',', start)) != std::string::npos) { f.push_back(frame.substr(start, pos - start)); start = pos + 1; }
  f.push_back(frame.substr(start));
  return f;
}

// Arranca el nodo con el gateway respondiendo y lo deja listo para probar loop()
inline void startNode(int frec = DEFAULT_TIMER) {
  resetNode();
  gatewayResponds(frec);
  setup();
}
