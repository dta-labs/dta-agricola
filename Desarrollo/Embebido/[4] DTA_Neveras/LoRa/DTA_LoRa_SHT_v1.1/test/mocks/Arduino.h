// Simulación mínima del núcleo de Arduino para compilar el sketch en la PC.
#pragma once
#include <cstdint>
#include <cstring>
#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <cctype>
#include <string>
#include <vector>
#include <deque>
#include <functional>

typedef uint8_t byte;
using std::isnan;
using std::fabs;

// ---------- Memoria de programa (en la PC es memoria normal) ----------
#define PROGMEM
#define PSTR(s) (s)
typedef const char* PGM_P;
class __FlashStringHelper;
#define F(s) (reinterpret_cast<const __FlashStringHelper*>(s))
#define strcpy_P strcpy
#define strstr_P strstr
#define strncmp_P strncmp
#define snprintf_P snprintf

#define HIGH 1
#define LOW 0
#define INPUT 0
#define OUTPUT 1
#define A0 14
#define DEC 10

// ---------- Estado simulado ----------
namespace mock {
inline unsigned long now = 0;                  // millis() simulado
inline std::vector<std::string> events;        // Bitácora de eventos (orden de llamadas)
inline unsigned randomCounter = 0;
inline bool wdtEnabled = false;
inline int wdtArmCount = 0;
inline uint16_t adcValue = 341;                // 1126400 / 341 / 1000 = 3.30 V
inline void log(const std::string& e) { events.push_back(e); }
inline int indexOf(const std::string& e) {
  for (size_t i = 0; i < events.size(); i++) if (events[i] == e) return (int) i;
  return -1;
}
inline int count(const std::string& e) {
  int n = 0;
  for (auto& x : events) if (x == e) n++;
  return n;
}
}  // namespace mock

inline unsigned long millis() { return mock::now; }
inline unsigned long micros() { return mock::now * 1000UL; }
inline void delay(unsigned long ms) { mock::now += ms; }
inline void pinMode(int, int) {}
inline void digitalWrite(int, int) {}
inline int analogRead(int) { return 512; }
inline bool isDigit(char c) { return c >= '0' && c <= '9'; }

// random(a, b) determinista: recorre el intervalo [a, b)
inline long random(long a, long b) { return b > a ? a + (long) (mock::randomCounter++ % (unsigned long) (b - a)) : a; }
inline void randomSeed(unsigned long seed) { mock::randomCounter = (unsigned) seed; mock::log("randomSeed"); }

template <class T, class L, class H> T constrain(T x, L lo, H hi) { return x < lo ? (T) lo : (x > hi ? (T) hi : x); }

inline char* dtostrf(double v, signed char width, unsigned char prec, char* s) {
  std::sprintf(s, "%*.*f", width, prec, v);
  return s;
}

// ---------- Registros del ADC (getVcc) ----------
inline uint8_t ADMUX, ADCSRA, MCUSR = 0xFF;
#define ADCL ((uint8_t) (mock::adcValue & 0xFF))
#define ADCH ((uint8_t) (mock::adcValue >> 8))
#define _BV(b) (1 << (b))
#define REFS0 6
#define MUX3 3
#define MUX2 2
#define MUX1 1
#define ADSC 6
#define bit_is_set(reg, bit) (0)

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
  size_t print(double v) { char b[32]; std::snprintf(b, sizeof b, "%.2f", v); return print(b); }
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
