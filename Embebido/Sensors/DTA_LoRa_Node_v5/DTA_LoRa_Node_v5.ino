#include <SPI.h>
#include <LoRa.h>

int counter = 0;
int fromNode = 1;
const int numNodes = 1;

void setup() {
  Serial.begin(115200);
  while (!Serial);
  Serial.println("\nLoRa Sender\n");
  initLoRa();
}

void loop() {
  txData();
  counter++;
  fromNode += 1;  
  fromNode = fromNode > numNodes ? 1 : fromNode;
  delay(2000);
}

void initLoRa() {
  if (!LoRa.begin(433E6)) {
    Serial.println("Starting LoRa failed!");
    while (1);
  }
  LoRa.setTxPower(20);            // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3); // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);    // Factor de propagación de 12
  LoRa.setCodingRate4(5);         // Tasa de codificación 4/5
}

void txData() {
  String dataStr = getLocalData();
  Serial.println("Sending packet: " + dataStr);
  LoRa.beginPacket();
  LoRa.print(dataStr);
  LoRa.endPacket();
}

String getLocalData() {
  String result = "Id:4454412D4C48542D00x0001,Temp:";
  result += String(counter) + ",Hum:";
  result += String(counter + 3) + ",Vcc:";
  result += String(readVcc()) + ",Chk:";
  int checkSum = calculateSum(result);
  result += String(checkSum);
  return result;
}

long readVcc() {
  ADMUX = _BV(REFS0) | _BV(MUX3) | _BV(MUX2) | _BV(MUX1);
  delay(2);
  ADCSRA |= _BV(ADSC);
  while (bit_is_set(ADCSRA, ADSC));
  
  long result = ADCL;
  result |= ADCH << 8;
  result = 1126400L / result; // Back-calculate AVcc in mV
  return result / 1000.0;
}

int calculateSum(String str) {
  int sum = 0;
  for (int i = 0; i < str.length(); i++) sum += str[i];
  return sum;
}