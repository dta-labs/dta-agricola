// Módem SIM800 y módulo WiFi ESP8266 simulados sobre SoftwareSerial.
// La instancia creada con Rx en A0 se comporta como el ESP8266 (firmware DTA_Gateway_WiFi_ESP8266);
// las demás como el SIM800. Como en la librería real, solo la instancia que escucha (listen) recibe datos.
// Cada línea que envía el sketch (terminada en '\n') se pasa a 'respond', que pone la respuesta
// en la entrada. Por defecto responde como un SIM800 sin problemas; las pruebas cambian el
// comportamiento con los campos públicos o reemplazando 'respond'.
#pragma once
#include "Arduino.h"

class SoftwareSerial : public Print {
 public:
  std::deque<char> in;
  std::string line;
  std::vector<std::string> commands;           // Comandos recibidos (sin \r\n)
  std::vector<std::string> urls;               // URLs configuradas con AT+HTTPPARA="URL"
  std::function<void(const std::string&)> onCommand;   // Gancho: se llama antes de responder

  // Comportamiento del módem simulado
  int rssi = 20, ber = 0, creg = 1;
  std::string imei = "861234567890123";
  bool dnsFails = false;                       // El dominio da 603 (falla de DNS)
  int httpStatus = 200;
  std::string body = "\"5\"0xA1\"0xB2\"0xC3\"";   // Respuesta del servidor: formato real de sensor_v6.php
  int lengthOverride = -1;                     // Longitud anunciada distinta a la real
  bool silent = false;                         // El módem no responde
  std::vector<std::pair<std::string, std::string>> overrides;   // Respuesta fija por prefijo de comando
  int bearerStatus = 3;                        // AT+SAPBR=2,1: 1 conectado, 3 cerrado (al encender)
  int httpInitErrors = 0;                      // Cuántas veces responde ERROR a AT+HTTPINIT
  int bearerOpenErrors = 0;                    // Cuántas veces AT+SAPBR=1,1 responde ERROR
  int cgatt = 1;                               // AT+CGATT?: 1 enganchado a GPRS, 0 no
  int httpActionStale = 0;                     // Cuántas veces HTTPACTION da OK pero nunca llega el resultado

  // ESP8266 simulado (protocolo #ST / #GET, spec/protocolo.md)
  bool esp = false;
  int wifiState = 0;                           // 0 sin red configurada, 1 configurada sin conexión, 2 conectada
  int wifiRssi = -60;                          // dBm
  std::string stImei;                          // IMEI recibido en #ST

  inline static SoftwareSerial* active = nullptr;   // Instancia que escucha

  SoftwareSerial(int rx, int) : esp(rx == 14) {}
  void begin(long) {}
  bool listen() {
    if (active == this) return false;
    active = this;
    in.clear();                                // La librería real descarta el buffer al cambiar
    return true;
  }
  bool isListening() const { return active == this; }
  // Las respuestas llegan con retardo, como en el módem real
  std::deque<std::pair<unsigned long, std::string>> pending;
  unsigned long latencyMs = 50;                // Retardo normal de respuesta
  unsigned long httpLatencyMs = 1500;          // Retardo de +HTTPACTION
  void deliver() {
    while (!pending.empty() && pending.front().first <= mock::now) {
      if (active == this) for (char c : pending.front().second) in.push_back(c);   // Sin escuchar se pierde
      pending.pop_front();
    }
  }
  int available() { deliver(); return (int) in.size(); }
  int read() {
    if (in.empty()) return -1;
    char c = in.front();
    in.pop_front();
    return (unsigned char) c;
  }
  void feed(const std::string& s, unsigned long delayMs = 0) {
    unsigned long at = mock::now + (delayMs ? delayMs : latencyMs);
    if (!pending.empty() && pending.back().first > at) at = pending.back().first;
    pending.push_back({at, s});
  }

  size_t write(uint8_t c) override {
    out.push_back((char) c);
    if (c == '\n') {
      std::string cmd = line;
      if (!cmd.empty() && cmd.back() == '\r') cmd.pop_back();
      line.clear();
      commands.push_back(cmd);
      if (onCommand) onCommand(cmd);
      if (!silent) respond(cmd);
    } else {
      line.push_back((char) c);
    }
    return 1;
  }

  static bool starts(const std::string& s, const char* p) { return s.rfind(p, 0) == 0; }

  void respondEsp(const std::string& cmd) {
    if (starts(cmd, "#ST")) {
      stImei = cmd.size() > 4 ? cmd.substr(4) : "";
      feed("#ST," + std::to_string(wifiState) + "," + std::to_string(wifiState == 2 ? wifiRssi : 0) + "\r\n");
      return;
    }
    if (starts(cmd, "#GET,")) {
      urls.push_back(cmd);
      if (wifiState != 2) { feed("#R,-20,\r\n"); return; }
      bool byName = cmd.find("dtaamerica.com") != std::string::npos;
      int status = (dnsFails && byName) ? -1 : httpStatus;
      std::string b = status > 0 ? body : "";
      for (char& c : b) if (c == '\r' || c == '\n') c = ' ';
      if (b.size() > 250) b.resize(250);
      feed("#R," + std::to_string(status) + "," + b + "\r\n", httpLatencyMs);
    }
  }

  void respond(const std::string& cmd) {
    if (esp) { respondEsp(cmd); return; }
    const std::string ok = "\r\nOK\r\n";
    for (auto& o : overrides) if (starts(cmd, o.first.c_str())) { feed(o.second); return; }
    if (starts(cmd, "AT+SAPBR=2,1")) { feed("\r\n+SAPBR: 1," + std::to_string(bearerStatus) + ",\"10.0.0.1\"\r\n" + ok); return; }
    if (starts(cmd, "AT+SAPBR=1,1")) {
      if (bearerStatus == 1 || cgatt == 0 || bearerOpenErrors > 0) { if (bearerOpenErrors > 0) bearerOpenErrors--; feed("\r\nERROR\r\n"); return; }
      bearerStatus = 1; feed(ok, 2000); return;
    }
    if (starts(cmd, "AT+CGATT?")) { feed("\r\n+CGATT: " + std::to_string(cgatt) + "\r\n" + ok); return; }
    if (starts(cmd, "AT+CGATT=1")) { cgatt = 1; feed(ok, 1000); return; }
    if (starts(cmd, "AT+SAPBR=0,1")) { bearerStatus = 3; feed(ok); return; }
    if (starts(cmd, "AT+HTTPINIT") && httpInitErrors > 0) { httpInitErrors--; feed("\r\nERROR\r\n"); return; }
    if (starts(cmd, "AT+CSQ")) { feed("\r\n+CSQ: " + std::to_string(rssi) + "," + std::to_string(ber) + "\r\n" + ok); return; }
    if (starts(cmd, "AT+CREG?")) { feed("\r\n+CREG: 0," + std::to_string(creg) + "\r\n" + ok); return; }
    if (starts(cmd, "AT+GSN")) { feed("\r\n" + imei + "\r\n" + ok); return; }
    if (starts(cmd, "AT+HTTPPARA=\"URL\"")) { urls.push_back(cmd); feed(ok); return; }
    if (starts(cmd, "AT+HTTPACTION") && httpActionStale > 0) { httpActionStale--; feed(ok); return; }
    if (starts(cmd, "AT+HTTPACTION")) {
      bool byName = !urls.empty() && urls.back().find("dtaamerica.com") != std::string::npos;
      int status = (bearerStatus != 1) ? 601 : (dnsFails && byName) ? 603 : httpStatus;   // Sin conexión GPRS: 601
      feed(ok);
      feed("\r\n+HTTPACTION: 0," + std::to_string(status) + "," + std::to_string(body.size()) + "\r\n", httpLatencyMs);
      return;
    }
    if (starts(cmd, "AT+HTTPREAD")) {
      int len = lengthOverride >= 0 ? lengthOverride : (int) body.size();
      feed("\r\n+HTTPREAD: " + std::to_string(len) + "\r\n" + body + ok);
      return;
    }
    feed(ok);
  }

  int count(const char* prefix) const {
    int n = 0;
    for (auto& c : commands) if (starts(c, prefix)) n++;
    return n;
  }

  void reset() {
    in.clear(); pending.clear(); line.clear(); commands.clear(); urls.clear(); out.clear(); onCommand = nullptr;
    rssi = 20; ber = 0; creg = 1; imei = "861234567890123"; dnsFails = false; httpStatus = 200;
    body = "\"5\"0xA1\"0xB2\"0xC3\""; lengthOverride = -1; silent = false; overrides.clear(); bearerStatus = 3; httpInitErrors = 0; httpActionStale = 0; bearerOpenErrors = 0; cgatt = 1;
    wifiState = 0; wifiRssi = -60; stImei.clear();
  }
};
