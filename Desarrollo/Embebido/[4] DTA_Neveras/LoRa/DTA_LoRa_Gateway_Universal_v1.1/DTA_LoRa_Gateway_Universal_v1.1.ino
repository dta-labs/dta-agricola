#define DEBUG

#if defined DEBUG
  #define DBG_PRINT(x) Serial.print(x)
  #define DBG_PRINTLN(x) Serial.println(x)
#else
  #define DBG_PRINT(x)
  #define DBG_PRINTLN(x)
#endif

#include "configuracion.h"
#include "miscelaneas.h"
#include "memoria.h"
#include "loraComm.h"
#include "comunicaciones.h"
#include "wifi.h"

#pragma region Programa Principal

unsigned long txPeriod() {
  if (cfg.mode > 0) return 60000UL * cfg.mode;               // Modo normal: cada 'mode' minutos
  return 30000UL;                                            // Modo descubrimiento: cada 30 s
}

bool isTxTime() {
  return millis() - commTimer >= txPeriod();
}

// Tras un envío fallido el siguiente intento es en RETRY_AFTER_FAIL, no en el periodo completo (D-034)
void scheduleNextTx() {
  commTimer = millis();
  unsigned long period = txPeriod();
  if (!serverOk && period > RETRY_AFTER_FAIL) commTimer -= period - RETRY_AFTER_FAIL;
}

void txData() {
#if defined DEBUG
  Serial.println();
  printData(Serial);
  Serial.println();
#endif
  if (!loraOk) initLoRa();                                   // Reintenta el radio si no arrancó
  comunicaciones();
}

void setup() {
#if defined(__AVR__)
  paintFreeRam();
#endif
  Serial.begin(250000);
  while (!Serial) delay(10);                                 // Arduino Zero, Leonardo, etc.
  DBG_PRINT(F("\n\nLoRa Gateway Universal 2da Generación ")); DBG_PRINTLN(F(FW_VERSION));
  espSerial.begin(ESP_BAUD);                                 // Módulo WiFi (A0/A1)
  gprs.begin(9600);
  gprs.listen();                                             // Escucha el GSM; el ESP solo durante el envío
  if (loadConfig()) DBG_PRINTLN(F("-> Configuración recuperada de la EEPROM"));
  else DBG_PRINTLN(F("-> Sin configuración guardada, se usan valores por defecto"));
#if TEST_SYSTEM
  const char* testList = "0xF46A367,0xF46A2A5,0x10B9CD9C,0x42000001,0xF46A2F8,0x289585BD00000051";
  setSensorList(testList, testList + strlen(testList));
#endif
  clearAllData();
  initLoRa();
  comunicaciones();
  scheduleNextTx();
}

void loop() {
  idleTasks();
  serviceLoRa();
  if (isTxTime()) {
    txData();
    scheduleNextTx();
  }
}

#pragma endregion Programa Principal
