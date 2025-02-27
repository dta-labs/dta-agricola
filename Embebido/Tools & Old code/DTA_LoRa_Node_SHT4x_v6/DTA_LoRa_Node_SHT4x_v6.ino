#include <SPI.h>
#include <LoRa.h>
#include <LowPower.h>
#include <Adafruit_SHT4x.h>

#pragma region Variables

Adafruit_SHT4x sht4 = Adafruit_SHT4x();
#define ENABLE_HEATER SHT4X_NO_HEATER     // Activar el calentador del sensor
String NODE_ID = "DTA-SHT-0x";            // Identificador del nodo DTA-SHT-00x0001
sensors_event_t humidity, temp;

#define FREQUENCY 915E6                   // 433E6 or 915E6*, the MHz frequency of module
#define TIMER 30                          // Tiempo de espera en minutos
#define LINK 3                            // Pin de enlace 1

#pragma endregion Variables

#pragma region Programa Principal

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(LINK, INPUT_PULLUP);
  Serial.begin(19200);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nLoRa Node v6.0130"));
  Serial.println(F("Sonda de humedad y temperatura del suelo SHT4"));
  initLoRa();
  settupSHT(); 
  String id = String(sht4.readSerial(), HEX);
  id.toUpperCase();
  NODE_ID += id;
  Serial.print(F("ID: ")); Serial.println(NODE_ID);Serial.println(); 
}

void loop() {
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
  LoRa.idle();
  Serial.println(F("LoRa inicializado correctamente..."));
}

String createDataStr() {
  String dataStr = NODE_ID;
  dataStr += F(",");
  dataStr += String(temp.temperature, 0);
  dataStr += F(",");
  dataStr += String(humidity.relative_humidity, 0);
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

#pragma region Sensor SHT

void settupSHT() {
  while (!sht4.begin()) delay(10);
  setSHTPrecision();
  // setSHTHeater(SHT4X_HIGH_HEATER_1S);
  setSHTHeater(SHT4X_NO_HEATER);
  Serial.println(F("Sensor inicializado correctamente..."));
}

void setSHTPrecision() {
  sht4.setPrecision(SHT4X_HIGH_PRECISION);
  switch (sht4.getPrecision()) {
     case SHT4X_HIGH_PRECISION: 
       Serial.println("High precision");
       break;
     case SHT4X_MED_PRECISION: 
       Serial.println("Med precision");
       break;
     case SHT4X_LOW_PRECISION: 
       Serial.println("Low precision");
       break;
  }
}

void setSHTHeater(sht4x_heater_t heater) {
  sht4.setHeater(heater);
  switch (sht4.getHeater()) {
    case SHT4X_NO_HEATER: 
      Serial.println("No heater");
      break;
    case SHT4X_HIGH_HEATER_1S: 
      Serial.println("High heat for 1 second");
      break;
    case SHT4X_HIGH_HEATER_100MS: 
      Serial.println("High heat for 0.1 second");
      break;
    case SHT4X_MED_HEATER_1S: 
      Serial.println("Medium heat for 1 second");
      break;
    case SHT4X_MED_HEATER_100MS: 
      Serial.println("Medium heat for 0.1 second");
      break;
    case SHT4X_LOW_HEATER_1S: 
      Serial.println("Low heat for 1 second");
      break;
    case SHT4X_LOW_HEATER_100MS: 
      Serial.println("Low heat for 0.1 second");
      break;
  }
}

void readSHT() {
  // setSHTHeater(SHT4X_NO_HEATER);
  sensors_event_t h, t;
  sht4.getEvent(&h, &temp);
  // Serial.print(temp.temperature); Serial.print(" "); 
  // Serial.print(humidity.relative_humidity); Serial.print(" "); 
  // setSHTHeater(SHT4X_HIGH_HEATER_1S);
  // delay(1000);
  // setSHTHeater(SHT4X_NO_HEATER);
   if (h.relative_humidity > 70 && temp.temperature < 25) {
    setSHTHeater(SHT4X_HIGH_HEATER_1S);
    Serial.println("Calentador activado.");
  } else {
    setSHTHeater(SHT4X_NO_HEATER);
    Serial.println("Calentador desactivado.");
  }
  delay(5000);
  sht4.getEvent(&humidity, &t);
  Serial.print(temp.temperature); Serial.print(" "); 
  Serial.print(humidity.relative_humidity); Serial.print(" "); 
}

#pragma endregion Sensor SHT

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
