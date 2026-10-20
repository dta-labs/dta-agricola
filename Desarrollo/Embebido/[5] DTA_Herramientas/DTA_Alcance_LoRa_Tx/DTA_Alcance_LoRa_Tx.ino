#include <LoRa.h>
#include <LowPower.h>

#define FREQUENCY 915E6       // 433E6 or 915E6*, the MHz frequency of module

#pragma region Programa Principal

void setup() {
  Serial.begin(19200);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nMedidor de alcance LoRa"));
  Serial.println(F("Módulo Transmisor v0.1.20250227"));
  initLoRa();
}

void loop() {
  txData(getData());
  lowPower();
}

#pragma endregion Programa Principal

#pragma region LoRaWAN

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(20);                    // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3);         // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);            // Factor de propagación de 12
  LoRa.setCodingRate4(5);                 // Tasa de codificación 4/5
  LoRa.idle();
  Serial.println(F("LoRa inicializado correctamente..."));
}

String getData() {
  String dataStr = F("DTA-LoRa-TxRx-Range-Meter,");
  dataStr += String(calculateSum(dataStr));
  return dataStr;
}

void txData(String dataStr) {
  Serial.println(dataStr);
  LoRa.beginPacket();
  LoRa.print(dataStr);
  LoRa.endPacket();
  delay(100);
  Serial.println(F("Dato enviado correctamente..."));
  LoRa.sleep();
}

#pragma endregion LoRaWAN

#pragma region Miscelaneas

int calculateSum(String str) {
  int sum = 0;
  for (int i = 0; i < str.length(); i++) sum += str[i];
  return sum;
}

void lowPower() {
  LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
  LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
  LowPower.powerDown(SLEEP_2S, ADC_OFF, BOD_OFF);
  LoRa.idle();
}

#pragma endregion Miscelaneas
