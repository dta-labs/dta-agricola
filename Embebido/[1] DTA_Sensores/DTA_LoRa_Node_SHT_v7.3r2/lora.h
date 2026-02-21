#pragma region LoRaWAN

#include <LoRa.h>

#define FREQUENCY 915E6                   // 433E6 or 915E6*, the MHz frequency of module
#define LINK 3                            // Pin de enlace 1

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(20);                    // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3);         // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);            // Factor de propagación de 12
  LoRa.setCodingRate4(5);                 // Tasa de codificación 4/5
  LoRa.idle();
  Serial.println(F("  • LoRa inicializado correctamente..."));
}

void txData(String dataStr) {
  LoRa.idle();
  Serial.print(F("Tx: ")); Serial.println(dataStr);
  LoRa.beginPacket();
  LoRa.print(dataStr);
  LoRa.endPacket();
  delay(100);
  LoRa.sleep();
}

bool loraCheckData(String data) {
  int idx = data.lastIndexOf(comma) + 1;
  int dataCheckSum = (data.substring(idx)).toInt();
  data = data.substring(0, idx);
  int calculatedCheckSum = calculateSum(data);
  return dataCheckSum == calculatedCheckSum;
}

int getTxFrequency(String data) {
  int commaIdx = data.indexOf(comma);
  data = data.substring(commaIdx + 1, data.lastIndexOf(comma)); // Elimina IdSensor y CheckSum
  return data.toInt();
}

void getSoilPerfil(String data) {
  data = data.substring(data.indexOf(comma) + 1, data.lastIndexOf(comma));                // Elimina IdSensor y CheckSum
  data = data.substring(0, data.lastIndexOf(comma));                                      // Elimina TxFrequency
  if (data.length() == 0) return;
  float wA = data.substring(0, data.indexOf(comma)).toFloat();                            // Porciento de arena
  float wB = data.substring(data.indexOf(comma) + 1, data.lastIndexOf(comma)).toFloat();  // Porciento de franco
  suelo = mezcla(arenoso, franco, arcilloso, wA, wB);
}

bool waitConfirmation() {
  unsigned long startTime = millis();
  unsigned long randomTimeout = 5000 + random(0, 5000);                                   // Timeout aleatorio
  while (millis() - startTime < randomTimeout) {
    int packetSize = LoRa.parsePacket();
    if (packetSize) {
      String data = "";
      while (LoRa.available()) {
        data += (char)LoRa.read();
        wdt_reset();
      }
      if (data.startsWith(NODE_ID) && loraCheckData(data)) {
        TIMER = getTxFrequency(data);
        Serial.print(F("  ✓ Confirmación recibida - TIMER: "));
        Serial.print(TIMER);
        Serial.println(F("min"));
        return true;
      } else {
        Serial.print(F("  → Mensaje ignorado: "));
        Serial.println(data);
      }
    }
    delay(10); // Pequeña pausa para no saturar CPU
    wdt_reset();
  }
  Serial.println(F("    ✗ Tiempo de espera agotado"));
  return false;
}

#pragma endregion LoRaWAN

