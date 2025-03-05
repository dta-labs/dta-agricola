#include <OneWire.h>
#include <DallasTemperature.h>

#define sensorPin A0    // Pin al que está conectado el sensor de humedad
#define valAire 630
#define valSat 242
#define humAire 33
#define humSat 242
byte humedad;

#define pinDS 4         // Pin al que está conectado el sensor de temperatura
OneWire owObject(pinDS);
DallasTemperature sensorDS(&owObject);
float temp;

void setup() {
  Serial.begin(19200); // Iniciar la comunicación serial a 9600 baudios
  sensorDS.begin();
  Serial.println(getAddress());
}

void loop() {
  humedad = getHumidity();
  temp = getTemperature();
  Serial.print(humedad); Serial.print("%\t "); Serial.print(temp); Serial.println("°C"); 
  delay(1000); // Esperar 1 segundo antes de la siguiente lectura
}

byte getHumidity() {
  int val = analogRead(sensorPin); // Leer el valor del sensor
  Serial.print(val); Serial.print("\t "); 
  // val = (val / 1024.0) * getVcc();
  // Serial.print(val); Serial.print("\t "); 
  return constrain(map(val, valAire, humSat, 33, 100), 0, 100);
}

float getTemperature() {
  sensorDS.requestTemperatures();
  return sensorDS.getTempCByIndex(0);
}

String getAddress(){
  String address = "DTA-SHT-0x";
  DeviceAddress sensorAddress;
  sensorDS.getAddress(sensorAddress, 0);
  for (byte i = 0; i < 8; i++) {
    address += sensorAddress[i] < 0x10 ? ("0" + String(sensorAddress[i], HEX)) : String(sensorAddress[i], HEX);
  }
  return address;
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
