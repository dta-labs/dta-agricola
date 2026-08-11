#pragma region LoRaWAN

#include <LoRa.h>

#define FREQUENCY 915E6                   // 433E6 or 915E6*, the MHz frequency of module

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(20);                    // Ajusta la potencia de transmisión a 16 dBm
  LoRa.setSignalBandwidth(125E3);         // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(9);             // Factor de propagación de 9
  LoRa.setCodingRate4(5);                 // Tasa de codificación 4/5
  LoRa.sleep();
  Serial.println(F("  - LoRa inicializado correctamente..."));
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

bool checkDataIntegrity(String data) {
  int idx = data.lastIndexOf(comma) + 1;
  int dataCheckSum = (data.substring(idx)).toInt();
  data = data.substring(0, idx);
  int calculatedCheckSum = calculateSum(data);
  return dataCheckSum == calculatedCheckSum;
}

int getTxFrequency(String data) {
  int start = data.indexOf(F(",a,")) + 3;             // Quitar el header
  int inter = data.indexOf(comma, start) + 1;         // Buscar la siguiente coma "TTL"
  int end = data.indexOf(comma, inter);               // Buscar la siguiente coma "Frec"
  return data.substring(inter, end).toInt();          // Extraer y convertir la frecuencia
}

bool receivedConfirmation() {
  unsigned long startTime = millis();
  while (millis() - startTime < 15000) {              // Timeout 15 segundos
    int packetSize = LoRa.parsePacket();
    if (packetSize) {
      String data = "";
      while (LoRa.available()) {
        data += (char)LoRa.read();
        wdt_reset();
      }
      String header = NODE_ID; header += comma; header += F("a"); header += comma;
      if (data.startsWith(header) && checkDataIntegrity(data)) {
        TIMER = getTxFrequency(data);
        Serial.print(F("    -> Confirmación recibida [")); Serial.print(TIMER); Serial.println(F("min]"));
        return true;
      } else {
        Serial.print(F("    -> Mensaje ignorado: ")); Serial.println(data);
      }
    }
    LowPower.idle(SLEEP_30MS, ADC_OFF, TIMER2_ON, TIMER1_ON, TIMER0_ON, SPI_ON, USART0_ON, TWI_ON);
    wdt_reset();
  }
  Serial.println(F("    -> Tiempo de espera agotado"));
  return false; 
}

#pragma endregion LoRaWAN

