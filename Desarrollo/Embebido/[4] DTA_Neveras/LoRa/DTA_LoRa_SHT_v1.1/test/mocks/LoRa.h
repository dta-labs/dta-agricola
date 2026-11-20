// Simulación de la librería LoRa (sandeepmistry).
// onTx permite simular al gateway: recibe cada trama transmitida y puede poner una respuesta en rx.
#pragma once
#include "Arduino.h"

class LoRaClass : public Print {
 public:
  bool beginOk = true;
  std::vector<std::string> sent;               // Tramas transmitidas
  std::deque<std::string> rx;                  // Paquetes por recibir
  std::function<void(const std::string&)> onTx;
  bool sleeping = false;
  std::string current;
  size_t pos = 0;

  int begin(long) { mock::log("lora.begin"); return beginOk ? 1 : 0; }
  void setTxPower(int) {}
  void setSignalBandwidth(long) {}
  void setSpreadingFactor(int) {}
  void setCodingRate4(int) {}
  void sleep() { sleeping = true; }
  void idle() { sleeping = false; }
  int beginPacket() { sleeping = false; out.clear(); return 1; }
  int endPacket() {
    sent.push_back(out);
    mock::log("lora.tx");
    if (onTx) onTx(out);
    return 1;
  }
  int parsePacket() {
    if (rx.empty()) return 0;
    current = rx.front();
    rx.pop_front();
    pos = 0;
    return (int) current.size();
  }
  int available() { return (int) (current.size() - pos); }
  int read() { return pos < current.size() ? (unsigned char) current[pos++] : -1; }

  void reset() {
    beginOk = true; sent.clear(); rx.clear(); onTx = nullptr;
    sleeping = false; current.clear(); pos = 0; out.clear();
  }
};
inline LoRaClass LoRa;
