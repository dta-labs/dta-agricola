#define vMax 4.78

void setup() {
  Serial.begin(115200);
}

void loop() {
  float voltage = getVoltage();
  showData(voltage);
  delay(1000);
}

float getVoltage() {
  float voltage = 0.0;
  for (int i = 0; i < 100; i++) {
    int sensorValue = analogRead(A0);
    voltage += sensorValue * (vMax / 1023.0);
    delay(5);
  }
  return voltage / 100.0;
}

void showData(float voltage) {
  float bar = voltage * 16.0 / vMax;
  float psi = bar * 14.503773773;
  Serial.print("Voltage: "); Serial.print(voltage); Serial.print("V -> "); Serial.print(bar); Serial.print("bar -> "); Serial.print(psi); Serial.println("psi");
}