#include <SPI.h>
#include <LoRa.h>
#include <LowPower.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#pragma region Variables

String NODE_ID = "DTA-SHT-0x";            // Identificador del nodo DTA-SHT-00x0001
#define comma F(",")

#define FREQUENCY 915E6                   // 433E6 or 915E6*, the MHz frequency of module
#define LINK 3                            // Pin de enlace 1
int TIMER = 0;                            // Tiempo de espera en minutos

#define sensorPin A0                      // Pin del sensor de humedad
#define VCC A1                            // Pin de alimentación del sensor de humedad
#define valAire 519
#define valAgua 197
// #define valAire 575
// #define valAgua 242
byte humedad;

#define pinDS 4                           // Pin del sensor de temperatura
OneWire owObject(pinDS);
DallasTemperature sensorDS(&owObject);
float temp;

#pragma endregion Variables

#pragma region Programa Principal

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(LINK, INPUT_PULLUP);
  pinMode(VCC, OUTPUT);
  digitalWrite(A1, LOW);
  Serial.begin(19200);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nLoRa Node v6.0130"));
  Serial.println(F("Sonda de humedad y temperatura del suelo SHTe"));
  initLoRa();
  sensorDS.begin();
  String id = getAddress();
  id.toUpperCase();
  NODE_ID += id;
  Serial.print(F("ID: ")); Serial.println(NODE_ID);Serial.println(); 
}

void loop() {
  humedad = getHumidity();
  temp = getTemperature();
  txData(createDataStr());
  if (loraRxData()) lowPower();
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

String createDataStr() {
  String dataStr = NODE_ID;
  dataStr += comma;
  dataStr += String(temp, 1);
  dataStr += comma;
  dataStr += String(humedad);
  dataStr += comma;
  float vcc = getVcc();
  dataStr += String(vcc, 1);
  dataStr += comma;
  dataStr += String(calculateSum(dataStr));
  return dataStr;
}

void txData(String dataStr) {
  Serial.println(dataStr);
  LoRa.beginPacket();
  LoRa.print(dataStr);
  LoRa.endPacket();
  delay(100);
  Serial.print(F("Dato enviado "));
  LoRa.sleep();
}

bool loraCheckData(String data) {
  int idx = data.lastIndexOf(comma) + 1;
  int dataCheckSum = (data.substring(idx)).toInt();
  data = data.substring(0, idx);
  int calculatedCheckSum = calculateSum(data);
  return dataCheckSum == calculatedCheckSum;
}

int getTxFrecuence(String data) {      // DTA-GTW-0x0000,t°C,%Hs,Vcc,rssi
  int commaIdx = data.indexOf(comma);
  String sensorId = data.substring(data.indexOf(NODE_ID), commaIdx);
  return data.substring(commaIdx + 1, data.lastIndexOf(comma)).toInt();
}

bool loraRxData() {
  if (waitForLoraRx()) {
    String data = F("");
    while (LoRa.available()) {
      data += (char)LoRa.read();
    }
    if (data.indexOf(NODE_ID) == 0 && loraCheckData(data)) {
      TIMER = getTxFrecuence(data);
      Serial.println(F("correctamente..."));
      return true;
    } else {
      Serial.println(F("con error..."));
    }
  } else {
    Serial.println(F("No confirmado..."));
  }
  delay(30000);
  return false;
}

int waitForLoraRx() {
  int iter = 0;
  int packetSize = 0;
  while (!packetSize && iter < 10) {
    delay(250);
    packetSize = LoRa.parsePacket();
    iter++;
  }  
  return packetSize;
}

#pragma endregion LoRaWAN

#pragma region Sensor SHTe

byte getHumidity() {
  digitalWrite(A1, HIGH);
  delay(250);
  float volt = getVcc();
  int val = analogRead(sensorPin); // Leer el valor del sensor
  digitalWrite(A1, LOW);
  // val = (val / 1024) * volt; 
  byte result = constrain(map(val, valAire, valAgua, 0, 100), 0, 100);
  // Serial.print("val: "); Serial.print(val); Serial.print(" -> "); Serial.print(result); Serial.print(" "); 
  return result;
}

float getTemperature() {
  sensorDS.requestTemperatures();
  return sensorDS.getTempCByIndex(0);
}

String getAddress(){
  String address = "";
  DeviceAddress sensorAddress;
  sensorDS.getAddress(sensorAddress, 0);
  for (byte i = 0; i < 8; i++) {
    address += sensorAddress[i] < 0x10 ? ("0" + String(sensorAddress[i], HEX)) : String(sensorAddress[i], HEX);
  }
  return address;
}

#pragma endregion Sensor SHTe

#pragma region Miscelaneas

int calculateSum(String str) {
  int sum = 0;
  for (int i = 0; i < str.length(); i++) sum += str[i];
  return sum;
}

float getVcc() {
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
  int estado = digitalRead(LINK); // Leer el estado del pin
  delay(5000);
  if (estado == HIGH) {
    int minutes = TIMER * 15;
    for (int i = 0; i < minutes; i++) {
      LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
      if(digitalRead(LINK) == LOW) break;
    }
  } 
  LoRa.idle();
}

#pragma endregion Miscelaneas
