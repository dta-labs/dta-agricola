#include "RS485.h"

#define MASTER_ADDR "0"

RS485 rs485(3, 6, 4, 5);                                // D2 - DI, D5 - RO, D3 - DE, D4 - RE
String nodos[10];                                       // Lista de nodos registrados (máx 10 por ejemplo)
unsigned long lastQuery = 0;                            // Tiempo de última consulta
const unsigned long queryInterval = 6000;              // Muestrea cada 1 minuto
const int maxNodos = 10;
int numNodos = 0;

void setup() {
  Serial.begin(250000);
  Serial.println(F("Monitor de Neveras y Cuartos fríos v1.0\n"));
}

void loop() {
  descubirNodos();
  consultarNodos();
  delay(500);
}

void descubirNodos() {
  esperarRespuesta(500);
}

void procesarTrama(String trama) {
  int start = trama.indexOf('<');
  int from  = trama.indexOf('-');
  int mode  = trama.indexOf(':');
  int data  = trama.indexOf(',');
  int end   = trama.indexOf('>');
  if (start != -1 && from != -1 && mode != -1 && data != -1 && end != -1) {
    String addrTo = trama.substring(start + 1, from);
    String addrFrom = trama.substring(from + 1, mode);
    String modo = trama.substring(mode + 1, data);
    String msg  = trama.substring(data + 1, end);
    if (addrTo == MASTER_ADDR) {
      switch (modo[0]) {
        case 'a':
          registrarNuevoNodo(msg);
          break;
        case 't':
          enviarTemp(addrFrom, modo, msg);
          break;
        case 'h':
          enviarHum(addrFrom, modo, msg);
          break;
      }
    }
  }
}

void registrarNuevoNodo(String addr) {
  if (!estaRegistrado(addr) && numNodos < maxNodos) {
    nodos[numNodos] = addr;
    numNodos++;
    Serial.print("Nodo registrado: ");
    Serial.println(addr);
  }
}

bool estaRegistrado(String addr) {
  for (int i = 0; i < numNodos; i++) {
    if (nodos[i] == addr) return true;
  }
  return false;
}

void enviarTemp(String addrFrom, String modo, String msg) {
  // Leer temperatura
  mostrarRespuesta(addrFrom, modo, msg);
}

void enviarHum(String addrFrom, String modo, String msg) {
  // Leer Humedad
  mostrarRespuesta(addrFrom, modo, msg);
}

void mostrarRespuesta(String addr, String modo, String msg) {
  String txt = modo == "t" ? "Temperatura_" : "Humedad_";
  String unidad = modo == "t" ? "°C" : "%";
  Serial.print(txt + addr);
  Serial.println(": " + msg + unidad);
}

void consultarNodos() {
  if (millis() - lastQuery > queryInterval && numNodos > 0) {
    lastQuery = millis();
    for (int i = 0; i < numNodos; i++) {
      String nodo = nodos[i];
      rs485.transmitir(nodo, MASTER_ADDR, "t", "Temperatura");
      esperarRespuesta(500);
      rs485.transmitir(nodo, MASTER_ADDR, "h", "Humedad");
      esperarRespuesta(500);
    }
  }
}

void esperarRespuesta(unsigned long timeout) {
  unsigned long start = millis();
  while (millis() - start < timeout) {
    String trama = rs485.recibir();
    if (trama.length() > 0) {
      procesarTrama(trama);
      break;
    }
  }
}