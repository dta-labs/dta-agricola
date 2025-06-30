#include <SPI.h>
#include <LoRa.h>
#include <LowPower.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_SHT4x.h>

#pragma region Variables

String NODE_ID = "DTA-SHT4-0x";        // Identificador del nodo DTA-SHT-0x0001
#define comma F(",")

Adafruit_SHT4x sht4 = Adafruit_SHT4x();   // SHT4x
#define ENABLE_HEATER SHT4X_NO_HEATER     // Activar el calentador del sensor
sensors_event_t humidity, temp;

#define DESV_EST_UMBRAL 0.3
#define NUM_MUESTRAS 10
#define NUM_LECTURAS 6
float hum_hist[NUM_LECTURAS] = {0};
float temp_hist[NUM_LECTURAS] = {0};
float t_actual;
float h_actual;
uint8_t index = 0;
bool calentado = false;

#define FREQUENCY 915E6                   // 433E6 or 915E6*, the MHz frequency of module
#define LINK 3                            // Pin de enlace 1
int TIMER = 0;                            // Tiempo de espera en minutos

#define sensorPin A0                      // Pin del sensor de humedad
#define VCC A1                            // Pin de alimentación del sensor de humedad
#define valAire 570
#define valAgua 230
byte moisture;

// #define pinDS 4                           // Pin del sensor de temperatura
// OneWire owObject(pinDS);
// DallasTemperature sensorDS(&owObject);
// float temp;

#pragma endregion Variables

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
    LoRa.idle();
    int minutes = TIMER * 15;
    for (int i = 0; i < minutes; i++) {
      LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
      if(digitalRead(LINK) == LOW) break;
    }
  } 
}

#pragma endregion Miscelaneas

#pragma region Estadísticas

void agregarALaMedia(float nueva_temp, float nueva_hum) {
  temp_hist[index] = nueva_temp;
  hum_hist[index] = nueva_hum;
  index = (index + 1) % NUM_LECTURAS;
}

float promedio(float *hist) {
  float suma = 0;
  for (int i = 0; i < NUM_LECTURAS; i++) suma += hist[i];
  return suma / NUM_LECTURAS;
}

float moda(float *valores, byte n) {
  float moda = valores[0];
  int maxCount = 0;
  for (int i = 0; i < n; i++) {
    int count = 0;
    for (int j = 0; j < n; j++) {
      if (abs(valores[j] - valores[i]) < 0.1) count++;  // tolerancia de 0.1
    }
    if (count > maxCount) {
      maxCount = count;
      moda = valores[i];
    }
  }
  return moda;
}

float mediana(float *valores, byte n) {
  float copia[n];
  memcpy(copia, valores, n * sizeof(float));
  for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
      if (copia[j] > copia[j + 1]) {
        float temp = copia[j];
        copia[j] = copia[j + 1];
        copia[j + 1] = temp;
      }
    }
  }
  if (n % 2 == 0)
    return (copia[n / 2 - 1] + copia[n / 2]) / 2.0;
  else
    return copia[n / 2];
}

float desviacionEstandar(float *valores, int n) {
  float suma = 0, media = 0, varianza = 0;
  for (int i = 0; i < n; i++) suma += valores[i];
  media = suma / n;
  for (int i = 0; i < n; i++) varianza += pow(valores[i] - media, 2);
  return sqrt(varianza / n);
}

float estimadorAdaptativo(float *valores, int n) {
  float desviacion = desviacionEstandar(valores, n);
  if (desviacion < DESV_EST_UMBRAL) {                 // Umbral ajustable según sensor
    return moda(valores, n);
  } else {
    return mediana(valores, n);
  }
}

#pragma endregion Estadísticas

#pragma region LoRaWAN

void initLoRa() {
  if (!LoRa.begin(FREQUENCY)) while (10);
  LoRa.setTxPower(20);                    // Ajusta la potencia de transmisión a 20 dBm
  LoRa.setSignalBandwidth(125E3);         // Ancho de banda de 125 kHz
  LoRa.setSpreadingFactor(12);            // Factor de propagación de 12
  LoRa.setCodingRate4(5);                 // Tasa de codificación 4/5
  LoRa.idle();
  Serial.println(F("  • LoRa inicializado correctamente..."));
}

String createDataStr() {
  String dataStr = NODE_ID;
  dataStr += comma;
  dataStr += String(moisture);
  dataStr += comma;
  dataStr += String(h_actual, 0);
  dataStr += comma;
  dataStr += String(t_actual, 1);
  dataStr += comma;
  dataStr += String(getVcc(), 1);
  dataStr += comma;
  dataStr += String(calculateSum(dataStr));
  return dataStr;
}

void txData(String dataStr) {
  Serial.print(F("→ ")); Serial.println(dataStr);
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

int getTxFrecuence(String data) {
  int commaIdx = data.indexOf(comma);
  String sensorId = data.substring(data.indexOf(NODE_ID), commaIdx);
  return data.substring(commaIdx + 1, data.lastIndexOf(comma)).toInt();
}

bool waitConfirmation() {
  unsigned long startTime = millis();
  unsigned long randomTimeout = 5000 + random(0, 5000); // Timeout aleatorio
  while (millis() - startTime < randomTimeout) {
    int packetSize = LoRa.parsePacket();
    if (packetSize) {
      String data = "";
      while (LoRa.available()) {
        data += (char)LoRa.read();
      }
      if (data.startsWith(NODE_ID) && loraCheckData(data)) {
        TIMER = getTxFrecuence(data);
        Serial.println(F("  ✓ Confirmación recibida"));
        return true;
      } else {
        Serial.print(F("  → Mensaje ignorado: "));
        Serial.println(data);
      }
    }
    delay(10); // Pequeña pausa para no saturar CPU
  }
  Serial.println(F("  ✗ Tiempo de espera agotado"));
  return false;
}

#pragma endregion LoRaWAN

#pragma region Sensor HW390

byte getMoisture() {
  static float muestras[NUM_MUESTRAS];
  digitalWrite(A1, HIGH);
  delay(50);
  for (byte i = 0; i < NUM_MUESTRAS; i++) {
    muestras[i] = analogRead(sensorPin); // Leer el valor del sensor
    delay(250);
  }
  digitalWrite(A1, LOW);
  float val = estimadorAdaptativo(muestras, NUM_MUESTRAS);
  // float volt = getVcc();
  // val = (val / 1024) * volt; 
  byte result = constrain(map(val, valAire, valAgua, 0, 100), 0, 100);
  // Serial.print("val: "); Serial.print(val); Serial.print(" -> "); Serial.print(result); Serial.print(F(" ")); 
  return result;
}

#pragma endregion Sensor HW390

#pragma region DallasSensor 
/*

float getTemperature() {
  sensorDS.requestTemperatures();
  return sensorDS.getTempCByIndex(0);
}

String getDSAddress(){
  String address = "";
  DeviceAddress sensorAddress;
  sensorDS.getAddress(sensorAddress, 0);
  for (byte i = 0; i < 8; i++) {
    address += sensorAddress[i] < 0x10 ? ("0" + String(sensorAddress[i], HEX)) : String(sensorAddress[i], HEX);
  }
  return address;
}

*/
#pragma endregion DallasSensor

#pragma region Sensor SHT4x

void setupSHT() {
  while (!sht4.begin()) delay(10);
  sht4.setPrecision(SHT4X_HIGH_PRECISION);
  sht4.setHeater(SHT4X_NO_HEATER);
  Serial.println(F("  • Sensor SHT4x inicializado correctamente..."));
}

void readSHT() {
  sht4.getEvent(&humidity, &temp);
  t_actual = temp.temperature;
  h_actual = humidity.relative_humidity;
  agregarALaMedia(t_actual, h_actual);
  float t_prom = promedio(temp_hist);
  float h_prom = promedio(hum_hist);
  if (h_prom > 94.0 && t_prom < 10.0) {  // Evaluar si hay condiciones para calentamiento
    Serial.println(F("⚠️ Posible condensación detectada, activando calentador."));
    sht4.setHeater(SHT4X_LOW_HEATER_100MS);
    delay(200); // calentamiento suave
    sht4.setHeater(SHT4X_NO_HEATER);
    delay(5000); // esperar disipación
    sht4.getEvent(&humidity, &temp);
    t_actual = temp.temperature;
    h_actual = humidity.relative_humidity;
    calentado = true;
  } else {
    calentado = false;
  }
}

#pragma endregion Sensor SHT4x

#pragma region Programa Principal

void setup() {
  pinMode(LINK, INPUT_PULLUP);
  pinMode(VCC, OUTPUT);
  digitalWrite(A1, LOW);
  Serial.begin(19200);
  while (!Serial) delay(10);               // Pausar Arduino Zero, Leonardo, etc. hasta que se active el puerto serie
  Serial.println(F("\n\nMicroestación agrícola STH v7.0610L"));
  Serial.println(F("~ Sonda de humedad del suelo"));
  Serial.println(F("~ Humedad y temperatura ambiente"));
  Serial.println(F("  • Protocolo: DTA-SHT4-0xId,Ms,Hr,T°C,Vcc,CS"));
  Serial.println(F("  • Sensor de humedad del suelo inicializado correctamente..."));
  initLoRa();
  setupSHT();
  // sensorDS.begin();
  String id = String(sht4.readSerial(), HEX);
  id.toUpperCase();
  NODE_ID += id;
  Serial.println(F("~ Configuración:"));
  Serial.print(F("  • ID: ")); Serial.println(NODE_ID);
  Serial.print(F("  • valAire: ")); Serial.println(valAire);
  Serial.print(F("  • valAgua: ")); Serial.println(valAgua);Serial.println(); 
}

void loop() {
  readSHT();
  moisture = getMoisture();
  // temp = getTemperature();
  txData(createDataStr());
  if (waitConfirmation()) lowPower();
}

#pragma endregion Programa Principal
