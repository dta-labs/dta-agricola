#include <LoRa.h>

#pragma region Variables

#define strEmpty F("")                        // Variables generales
#define startAddress F("0x")
#define commaChar F(",")
#define FREQUENCY 915E6                       // 433E6 or 915E6*, the MHz frequency of module
#define TIME_SCAN 3                           // Tiempo de escaneo en minutos
#define isConfirmationNeeded true            // Enviar confirmación o no
#pragma endregion Variables

#pragma region Programa Principal

void setup() {
  Serial.begin(250000);
  while (!Serial) delay(10);  // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nLoRa Gateway Tester v6.2"));
  initLoRa();
}

void loop() {
  loraRxData();
  delay(50);
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
  LoRa.beginPacket();
  LoRa.print(dataStr);
  LoRa.endPacket();
  Serial.print("\t Tx: " + dataStr);
  Serial.print(F(" [ ✔ Ok ]"));
  delay(100);
  LoRa.sleep();
}

void sendConfirmation(String data) {
  int commaIdx = data.indexOf(commaChar);
  String sensorId = data.substring(0, commaIdx);
  String confirmation = sensorId + commaChar + TIME_SCAN + commaChar;
  confirmation += String(calculateSum(confirmation));
  delay(50);
  loraTxData(confirmation);
}

bool loraCheckData(String data) {
  int idx = data.lastIndexOf(commaChar);
  int dataCheckSum = (data.substring(idx + 1)).toInt();                   // Lee CheckSum
  data = data.substring(0, idx + 1);                                      // Elimina CheckSum
  int calculatedCheckSum = calculateSum(data);                            // Calcula CheckSum
  int commaIdx = data.indexOf(commaChar); 
  String dataInfo = data.substring(commaIdx + 1, data.length() - 1);      // Elimina IdSensor
  return data.startsWith(F("DTA")) && dataInfo.indexOf(commaChar) != -1 && dataCheckSum == calculatedCheckSum;  // Inicia con DTA, no es una confirmación y CheckSum correcta
}

void loraRxData() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String data = strEmpty;
    while (LoRa.available()) {
      data += (char)LoRa.read();
    }
    Serial.print(F("\n Rx: ")); 
    if (loraCheckData(data)) {
      Serial.print(data);
      if (isConfirmationNeeded) sendConfirmation(data);
    } else {
      Serial.print(data); Serial.print(F(" « ✘ Error de lectura... »"));
    }
  }
}

#pragma endregion LoRaWAN
