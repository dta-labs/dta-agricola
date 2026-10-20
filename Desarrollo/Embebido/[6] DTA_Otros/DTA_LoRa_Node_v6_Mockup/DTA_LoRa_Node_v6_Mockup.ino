#include <SPI.h>
#include <LoRa.h>
#include <LowPower.h>
#include <Adafruit_SHT31.h>

#pragma region Variables

#define NODE_ID "DTA-SHT-00x0002"         // Identificador del nodo DTA-SHT-00x0002
#define FREQUENCY 433E6                   // 433E6 or 915E6, the MHz frequency of module
#define ENABLE_HEATER false               // Activar el calentador del sensor
#define VCC_PIN 8                         // Alimentación del Sensor
#define TIMER 1                           // Tiempo de espera en minutos
Adafruit_SHT31 sht31 = Adafruit_SHT31();
float shtData[2] = {0, 0};

#pragma endregion Variables

#pragma region Programa Principal

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  pinMode(VCC_PIN, OUTPUT);
  Serial.println(F("\nLoRa Sender v6.0"));
  Serial.println(F("Sensor de humedad y temperatura del suelo...\n"));
  initLoRa();
}

void loop() {
  // settupSHT(); 
  readSHT();
  txData(createDataStr());
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
  Serial.println(F("LoRa inicializado correctamente..."));
}

String createDataStr() {
  String dataStr = NODE_ID;
  dataStr += F(",");
  dataStr += String(shtData[0], 0);
  dataStr += F(",");
  dataStr += String(shtData[1], 0);
  dataStr += F(",");
  float vcc = getVcc();
  dataStr += String(vcc, 1);
  dataStr += F(",");
  dataStr += String(calculateSum(dataStr));
  return dataStr;
}

void txData(String dataStr) {
  Serial.println(dataStr);
  resetSPI();
  LoRa.beginPacket();
  LoRa.print(dataStr);
  LoRa.endPacket();
  // delay(500);
  // LoRa.sleep();
  Serial.println(F("Dato enviado correctamente..."));
}

void resetSPI() { 
  SPI.end();                              // Desinicializar el módulo SPI 
  delay(10);                              // Pequeño retraso para asegurar que el hardware se reinicie 
  SPI.begin();                            // Inicializar el módulo SPI de nuevo 
}

#pragma endregion LoRaWAN

#pragma region Sensor SHT

void settupSHT() {
  digitalWrite(VCC_PIN, HIGH);
  Wire.end();
  Wire.begin();
  delay(100);
  while (!sht31.begin(0x44)) delay(10);
  sht31.heater(ENABLE_HEATER);
  Serial.println(F("Sensor inicializado correctamente..."));
}

void readSHT() {
  // float t = sht31.readTemperature();
  // float h = sht31.readHumidity();
  float t = 15.5f;
  float h = 45.0f;
  shtData[0] = !isnan(t) ? t : -99;
  shtData[1] = !isnan(h) ? h : -99;
}

#pragma endregion Sensor SHT

#pragma region Miscelaneas

int calculateSum(String str) {
  int sum = 0;
  for (int i = 0; i < str.length(); i++) sum += str[i];
  return sum;
}

long getVcc() {
  ADMUX = _BV(REFS0) | _BV(MUX3) | _BV(MUX2) | _BV(MUX1);
  delay(2);
  ADCSRA |= _BV(ADSC);
  while (bit_is_set(ADCSRA, ADSC));
  
  long result = ADCL;
  result |= ADCH << 8;
  result = 1126400L / result;             // Back-calculate AVcc in mV
  return result / 1000.0;
}

void lowPower() {
  digitalWrite(VCC_PIN, LOW);
  delay(100);
  int minutes = TIMER * 15;
  for (int i = 0; i < minutes; i++) LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
}

#pragma endregion Miscelaneas
