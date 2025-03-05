#include <SPI.h>
#include <LoRa.h>
#include <LowPower.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#pragma region Variables

String NODE_ID = "DTA-SHT-0x";            // Identificador del nodo DTA-SHT-00x0001

#define FREQUENCY 915E6                   // 433E6 or 915E6*, the MHz frequency of module
#define TIMER 30                          // Tiempo de espera en minutos
#define LINK 3                            // Pin de enlace 1

#define sensorPin A0                      // Pin del sensor de humedad
#define valAire 575
#define valAgua 242
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

String createDataStr() {
  String dataStr = NODE_ID;
  dataStr += F(",");
  dataStr += String(temp, 1);
  dataStr += F(",");
  dataStr += String(humedad);
  dataStr += F(",");
  float vcc = getVcc();
  dataStr += String(vcc, 1);
  dataStr += F(",");
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

#pragma region Sensor SHTe

byte getHumidity() {
  float volt = getVcc();
  int val = analogRead(sensorPin); // Leer el valor del sensor
  // val = (val / 1024) * volt; 
  return constrain(map(val, valAire, valAgua, 0, 100), 0, 100);
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
