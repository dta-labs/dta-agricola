void setup() {
  // initialize serial communication at 9600 bits per second:
  Serial.begin(115200);
}

void loop() {
  float voltage = getVoltage();
  Serial.println(voltage);
  delay(1000);
}

float getVoltage() {
  float voltage = 0.0;
  for (int i = 0; i < 100; i++) {
    int sensorValue = analogRead(A0);
    voltage += sensorValue * (5.0 / 1023.0);
    delay(5);
  }
  return voltage / 100.0;
}