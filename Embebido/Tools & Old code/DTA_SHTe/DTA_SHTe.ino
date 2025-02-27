#include <OneWire.h>
#include <DallasTemperature.h>

#define sensorPin A0    // Pin al que está conectado el sensor de humedad
#define valAire 505
#define valAgua 183
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
  return constrain(map(val, valAire, valAgua, 0, 100), 0, 100);
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
