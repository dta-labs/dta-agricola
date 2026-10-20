#include <avr/wdt.h>
#include "RS485.h"

#define MY_ADDR "3"
#define MASTER_ADDR "0"

RS485 rs485(3, 6, 4, 5);  // D2 - DI, D5 - RO, D3 - DE, D4 - RE

unsigned long lastReceived = 0;

void setup() {
  Serial.begin(250000);
  Serial.println(F("Nodo sensor de nevera v1.0\n"));
  delay(1000);
  registro();
  wdt_enable(WDTO_2S);
  lastReceived = millis();
}

void loop() {
  wdt_reset();
  recibirTrama();
  if (millis() - lastReceived > 60000) {
    Serial.println("No se recibió nada en 20s, reiniciando...");
    while (true);
  }
}

void registro() {
  Serial.println("Enviar registro <" + (String) MASTER_ADDR + ":a," + (String) MY_ADDR + ">");
  rs485.transmitir((String) MASTER_ADDR, (String) MY_ADDR, "a", (String) MY_ADDR); // Se envía "a" para indicar que es una dirección a registrarse
}

void recibirTrama() {
  String trama = rs485.recibir();

  if (trama.length() > 0) {
    int start = trama.indexOf('<');
    int from  = trama.indexOf('-');
    int mode  = trama.indexOf(':');
    int data  = trama.indexOf(',');
    int end   = trama.indexOf('>');
    if (start != -1 && from != -1 && mode != -1 && data != -1 && end != -1) {
      String addrTo = trama.substring(start + 1, from);
      String addrFrom = trama.substring(from + 1, mode);
      String modo  = trama.substring(mode + 1, data);
      String msg  = trama.substring(data + 1, end);
      if (addrTo == MY_ADDR) {
        lastReceived = millis();
        if (modo == "t") enviarTemperatura();
        if (modo == "h") enviarHumedad();
      }
    }
  }
}

void enviarTemperatura() {
  rs485.transmitir((String) MASTER_ADDR, (String) MY_ADDR, "t", "10.4"); 
}

void enviarHumedad() {
  rs485.transmitir((String) MASTER_ADDR, (String) MY_ADDR, "h", "33"); 
}
