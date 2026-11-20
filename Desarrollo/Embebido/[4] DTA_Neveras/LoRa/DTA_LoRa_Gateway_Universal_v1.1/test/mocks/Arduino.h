// Simulación mínima del núcleo de Arduino para compilar el gateway en la PC.
#pragma once
#include <cstdint>
#include <cstring>
#include <strings.h>
#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <cctype>
#include <string>
#include <vector>
#include <deque>
#include <functional>

typedef uint8_t byte;

// ---------- Memoria de programa (en la PC es memoria normal) ----------
#define PROGMEM
#define PSTR(s) (s)
typedef const char* PGM_P;
class __FlashStringHelper;
#define F(s) (reinterpret_cast<const __FlashStringHelper*>(s))
#define strcpy_P strcpy
#define strstr_P strstr
#define strncmp_P strncmp
#define strlen_P strlen
#define snprintf_P snprintf

#define HIGH 1
#define LOW 0
#define INPUT 0
#define OUTPUT 1
#define A0 14
#define A1 15
#define DEC 10
#define HEX 16

// ---------- Estado simulado ----------
namespace mock {
inline unsigned long now = 0;                  // millis() simulado: avanza 1 ms en cada lectura
inline int pins[32];
inline int pinModes[32];
inline std::vector<std::string> events;
inline void log(const std::string& e) { events.push_back(e); }
inline int count(const std::string& e) {
  int n = 0;
  for (auto& x : events) if (x == e) n++;
  return n;
}
}  // namespace mock

inline unsigned long millis() { return mock::now++; }
inline void delay(unsigned long ms) { mock::now += ms; }
inline void pinMode(int pin, int mode) { mock::pinModes[pin] = mode; }
inline void digitalWrite(int pin, int v) { mock::pins[pin] = v; }
inline bool isDigit(char c) { return c >= '0' && c <= '9'; }

// freeRam() del sketch
inline int __heap_start;
inline int* __brkval;

// ---------- Puerto serie ----------
class Print {
 public:
  std::string out;
  virtual ~Print() {}
  virtual size_t write(uint8_t c) { out.push_back((char) c); return 1; }
  size_t print(const std::string& s) { for (char c : s) write((uint8_t) c); return s.size(); }
  size_t print(const char* s) { return print(std::string(s)); }
  size_t print(const __FlashStringHelper* s) { return print((const char*) s); }
  size_t print(char c) { return write((uint8_t) c); }
  size_t print(int v) { return print(std::to_string(v)); }
  size_t print(unsigned v) { return print(std::to_string(v)); }
  size_t print(long v) { return print(std::to_string(v)); }
  size_t print(unsigned long v) { return print(std::to_string(v)); }
  size_t print(unsigned char v) { return print(std::to_string((int) v)); }
  template <class T> size_t println(T v) { size_t n = print(v); return n + print("\r\n"); }
  size_t println() { return print("\r\n"); }
};

class HardwareSerial : public Print {
 public:
  void begin(long) {}
  void flush() {}
  explicit operator bool() const { return true; }
};
inline HardwareSerial Serial;
