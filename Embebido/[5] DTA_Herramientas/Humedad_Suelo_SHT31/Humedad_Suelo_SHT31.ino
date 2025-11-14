#include <LowPower.h>
#include <Adafruit_SHT31.h>

#define enableHeater false        // SHT Sensor
#define timer .2                  // Tiempo de espera en minutos
Adafruit_SHT31 sht31 = Adafruit_SHT31();
float shtData[2] = {0, 0};

#define vMax 4.78                 // HW Sensor
#define offset 0

#define VCC_PIN 8

int counter = 0;

void setup() {
  Serial.begin(19200);
  while (!Serial) delay(10);     // will pause Zero, Leonardo, etc until serial console opens
  pinMode(VCC_PIN, OUTPUT);
  Serial.println(F("\nHumedad y temperatura del suelo...\n"));
}

void loop() {
  settupSHT(); 
  readSHT();
  showData(readHW(), readVcc());
  lowPower();
}

float readHW() {
  float read = analogRead(A0);
  // Serial.print(read); Serial.print("\t");
  float val = constrain(map(read, 559, 230, 0.0, 100.0), 0, 100);
  return val;
}

void settupSHT() {
  digitalWrite(VCC_PIN, HIGH);
  Wire.end();
  Wire.begin();
  delay(100);
  while (!sht31.begin(0x44)){ 
    delay(1);
  }
  sht31.heater(enableHeater);
}

void readSHT() {
  float t = sht31.readTemperature();
  float h = sht31.readHumidity();
  shtData[0] = !isnan(t) ? t : -99;
  shtData[1] = !isnan(h) ? h : -99;
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

void showData(float hwData, float vcc) {
  Serial.print(String(counter) + ": "); 
  Serial.print(F("SHT[Temp] = ")); Serial.print(String(shtData[0], 1)); Serial.print(F("°C\t"));
  Serial.print(F("SHT[Hum] = ")); Serial.print(String(shtData[1], 1)); Serial.print(F("%\t"));
  Serial.print(F("HW[Hum] = ")); Serial.print(String(hwData, 1)); Serial.print(F("%\t"));
  Serial.print(F("Vcc = ")); Serial.print(vcc); Serial.println(F("V"));
  counter++;
}

void lowPower() {
  digitalWrite(VCC_PIN, LOW);
  delay(100);
  int minutes = timer * 15;
  for (int i = 0; i < minutes; i++) { 
    LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
  }
}