#include <LoRa.h>

#pragma region Variables

#define strEmpty F("")                        // Variables generales
#define startAddress F("0x")
#define commaChar F(",")
#define FREQUENCY 915E6                       // 433E6 or 915E6*, the MHz frequency of module

#pragma endregion Variables

#pragma region Programa Principal

void setup() {
  Serial.begin(19200);
  while (!Serial) delay(10);  // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nLoRa Gateway Tester v6.1"));
  initLoRa();
}

void loop() {
  loraRxData();
  delay(500);
}

#pragma endregion Programa Principal

#pragma region LoRaWAN

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(22);                            // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3);                 // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);                    // Factor de propagación de 12
  LoRa.setCodingRate4(5);                         // Tasa de codificación 4/5
  LoRa.sleep();
  Serial.println(F("LoRa inicializado correctamente..."));
}

int calculateSum(String str) {
  int sum = 0;
  for (int i = 0; i < str.length(); i++) sum += str[i];
  return sum;
}

void loraTxData(String dataStr) {
  Serial.print(F("\n   ~ Confirmación: ")); Serial.print(dataStr);
  LoRa.beginPacket();
  LoRa.print(dataStr);
  LoRa.endPacket();
  delay(100);
  Serial.print(F(" [Ok]"));
  LoRa.sleep();
}

void sendConfirmation(String data) {
  int addressIdx = data.indexOf(startAddress);
  int commaIdx = data.indexOf(commaChar);
  String sensorId = data.substring(addressIdx, commaIdx);
  String confirmation = sensorId + ",5,";
  confirmation += String(calculateSum(confirmation));
  delay(500);
  loraTxData(confirmation);
}

bool loraCheckData(String data) {
  int idx = data.lastIndexOf(F(",")) + 1;
  int dataCheckSum = (data.substring(idx)).toInt();
  data = data.substring(0, idx);
  int calculatedCheckSum = calculateSum(data);
  return dataCheckSum == calculatedCheckSum;
}

void loraRxData() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String data = strEmpty;
    while (LoRa.available()) {
      data += (char)LoRa.read();
    }
    if (data.indexOf(F("DTA")) == 0 && loraCheckData(data)) {
      Serial.print("\n └─ "); Serial.print(data);
      sendConfirmation(data);
    } else {
      Serial.print(F(" « Error de lectura... »"));
    }
  }
}

#pragma endregion LoRaWAN
