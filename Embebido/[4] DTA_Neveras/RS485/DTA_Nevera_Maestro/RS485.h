#ifndef RS485_H
#define RS485_H

#include <Arduino.h>

// Si no existe SoftwareSerial, lo incluimos
#if !defined(SoftwareSerial_h)
#include <SoftwareSerial.h>
#endif

class RS485 {
  private:
    int _tx;              // DI
    int _rx;              // RO
    int _de;              // DE
    int _re;              // RE
    SoftwareSerial* _ss;  // puntero a SoftwareSerial

  public:
    RS485(int tx, int rx, int de, int re) {
      _tx = tx;
      _rx = rx;
      _de = de;
      _re = re;
      pinMode(_tx, OUTPUT);   // DI
      pinMode(_rx, INPUT);    // RO
      pinMode(_de, OUTPUT);   // DE
      pinMode(_re, OUTPUT);   // RE
      _ss = new SoftwareSerial(_rx, _tx);
      _ss->begin(9600);
      digitalWrite(_de, LOW);
      digitalWrite(_re, LOW);
      delayMicroseconds(200);
    }

    void transmitir(String addTo, String addFrom, String modo, String msg) {
      digitalWrite(_de, HIGH);  // Modo transmisión
      digitalWrite(_re, HIGH);
      delayMicroseconds(200);
      _ss->print("<");
      _ss->print(addTo);
      _ss->print("-");
      _ss->print(addFrom);
      _ss->print(":");
      _ss->print(modo);
      _ss->print(",");
      _ss->print(msg);
      _ss->println(">");
      _ss->flush();
      delayMicroseconds(200);
      digitalWrite(_de, LOW);  // Modo recepción
      digitalWrite(_re, LOW);
      delayMicroseconds(200);
    }

    String recibir(unsigned long timeout = 200) {
      static String buffer = "";
      unsigned long start = millis();
      while (millis() - start < timeout) {
        while (_ss->available()) {
          char c = _ss->read();
          if (buffer.length() == 0 && c != '<') continue;  // Si el buffer está vacío y el primer carácter no es '<', ignoramos
          buffer += c;
          if (c == '>') {
            String trama = buffer;
            buffer = "";  // limpia para la siguiente
            if (trama.startsWith("<")) {
              return trama;
            }
          }
        }
      }
      return "";
    }
};

#endif
