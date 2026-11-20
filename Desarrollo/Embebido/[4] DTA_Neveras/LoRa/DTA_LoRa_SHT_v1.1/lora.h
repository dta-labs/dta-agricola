#pragma region LoRa

#include <LoRa.h>

#define FREQUENCY 915E6                         // 433E6 o 915E6, frecuencia del módulo
#define LORA_INIT_RETRIES 5

bool initLoRa() {
  for (uint8_t i = 0; i < LORA_INIT_RETRIES; i++) {
    if (LoRa.begin(FREQUENCY)) {
      LoRa.setTxPower(20);                      // Potencia de transmisión 20 dBm
      LoRa.setSignalBandwidth(125E3);           // Ancho de banda 125 kHz
      LoRa.setSpreadingFactor(9);               // Factor de propagación 9
      LoRa.setCodingRate4(5);                   // Tasa de codificación 4/5
      LoRa.sleep();
      Serial.println(F("  - LoRa inicializado correctamente"));
      return true;
    }
    delay(200);
  }
  Serial.println(F("  - LoRa no inicializado ✘"));
  return false;
}

void txData(const char* dataStr) {
  Serial.print(F(">> ")); Serial.println(dataStr);
  LoRa.beginPacket();
  LoRa.print(dataStr);
  LoRa.endPacket();                             // Al terminar se escucha con parsePacket()
}

bool checkDataIntegrity(const char* data) {
  const char* last = strrchr(data, ',');
  if (!last) return false;
  uint8_t len = last - data + 1;
  return calculateSum(data, len) == atoi(last + 1);
}

// Confirmación: DTA-SHT-0xId,a,TTL,Frec,CS
int getTxFrequency(const char* data) {
  const char* p = strstr_P(data, PSTR(",a,"));
  if (!p) return -1;
  p = strchr(p + 3, ',');                       // Saltar TTL
  return p ? atoi(p + 1) : -1;
}

void applyTxFrequency(const char* data) {
  if (!USE_GATEWAY_TIMER) return;
  int frec = getTxFrequency(data);
  if (frec < MIN_TIMER || frec > MAX_TIMER || frec == TIMER) return;
  TIMER = frec;
  nodeCfg.timer = frec;
  saveNodeConfig();
  Serial.print(F("   :: Nueva frecuencia: ")); Serial.print(TIMER); Serial.println(F(" min"));
}

bool receivedConfirmation(unsigned long timeout) {
  char header[32];
  snprintf_P(header, sizeof(header), PSTR("%s,a,"), NODE_ID);
  uint8_t headerLen = strlen(header);
  char data[PKT_LEN];
  unsigned long t0 = millis();
  while (millis() - t0 < timeout) {
    if (LoRa.parsePacket() > 0) {
      uint8_t n = 0;
      while (LoRa.available()) {
        char c = (char) LoRa.read();
        if (n < PKT_LEN - 1) data[n++] = c;
      }
      data[n] = '\0';
      if (strncmp(data, header, headerLen) == 0 && checkDataIntegrity(data)) {
        Serial.println(F("   :: Confirmación recibida"));
        applyTxFrequency(data);
        return true;
      }
      Serial.print(F("   :: Mensaje ignorado: ")); Serial.println(data);
    }
    LowPower.idle(SLEEP_30MS, ADC_OFF, TIMER2_ON, TIMER1_ON, TIMER0_ON, SPI_ON, USART0_ON, TWI_ON);
  }
  Serial.println(F("   :: Tiempo de espera agotado"));
  return false;
}

#pragma endregion LoRa
