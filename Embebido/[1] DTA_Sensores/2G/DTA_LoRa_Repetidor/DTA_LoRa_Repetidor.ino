#include <LoRa.h>

#define FREQUENCY 915E6   // Ajusta según tu región
#define NODE_ID "DTA"
#define LISTEN_WINDOW 500   // ms
#define SLEEP_WINDOW 50     // ms
#define DIO0_PIN 2          // Ajusta al pin conectado a DIO0 del FM95

// Activa solo en desarrollo
#define DEBUG 1  

#ifdef DEBUG
  #define DBG_BEGIN(x) Serial.begin(x)
  #define DBG_PRINT(x) Serial.print(x)
  #define DBG_PRINTLN(x) Serial.println(x)
#else
  #define DBG_BEGIN(x)
  #define DBG_PRINT(x)
  #define DBG_PRINTLN(x)
#endif

volatile bool packetReceived = false;

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(20);                            // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3);                 // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(9);                     // Factor de propagación de 12
  LoRa.setCodingRate4(5);                         // Tasa de codificación 4/5
  // LoRa.sleep();                                   // Arranca en modo bajo consumo
  DBG_PRINTLN(F("\n\nRepetidor LoRa inicializado correctamente..."));
}

void setup() {
  DBG_BEGIN(250000);
  while (!Serial) delay(10);
  initLoRa();
  pinMode(DIO0_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(DIO0_PIN), onReceiveISR, RISING);
}

void loop_old() {
  if (LoRa.parsePacket()) {
    String data = "";
    while (LoRa.available()) data += (char)LoRa.read();
    data = modifyData(data);
    if (data != "") {
      DBG_PRINT(F("Rx <- ")); DBG_PRINT(data);
      LoRa.beginPacket();
      LoRa.print(data);
      LoRa.endPacket();
      DBG_PRINTLN(F(" -> Tx")); 
    } 
  }
}

void loop() {
  // El micro puede dormir aquí si tu plataforma lo soporta
  // En Arduino clásico, simplemente espera interrupciones
  if (packetReceived) {
    DBG_BEGIN(".");
    packetReceived = false;
    processPacket();
    LoRa.sleep();  // vuelve a dormir el chip
  }
}

void onReceiveISR() {
  packetReceived = true;
}

void processPacket() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String data = "";
    while (LoRa.available()) data += (char)LoRa.read();
    data = modifyData(data);
    if (data != "") {
      LoRa.beginPacket();
      LoRa.print(data);
      LoRa.endPacket();
    }
  }
}

String modifyData(String data) {
  if (!data.startsWith(NODE_ID)) return "";
  String dataType = data.indexOf(",d,") != -1 ? ",d," : data.indexOf(",a,") != -1 ? ",a," : "";
  if (dataType == "") return "";
  int ttlStart = data.indexOf(dataType) + 3;
  int ttlEnd = data.indexOf(",", ttlStart);
  int TTL = data.substring(ttlStart, ttlEnd).toInt();
  if (TTL == 0) return "";
  TTL--;
  String newData = data.substring(0, ttlStart) + TTL + data.substring(ttlEnd, data.lastIndexOf(",") + 1);
  newData += calculateSum(newData);
  return newData;
}

int calculateSum(String str) {
  int sum = 0;
  for (int i = 0; i < str.length(); i++) sum += str[i];
  return sum;
}
