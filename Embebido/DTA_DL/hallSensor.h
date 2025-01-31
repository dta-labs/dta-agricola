#pragma region Hallsensor

void hallSensorISR() { 
  hallSensorCounter++; 
}

void initHall() {
  pinMode(hallSensorPin, INPUT); 
  attachInterrupt(digitalPinToInterrupt(hallSensorPin), hallSensorISR, CHANGE);
}

float readHallSensor() {
  float result = 0;
  static unsigned long hallTimer = millis();
  if (millis() - hallTimer > 60000) {
    result = hallSensorCounter / 60 * 60;
    hallSensorCounter = 0;
  }
  return result;
}

#pragma endregion Hallsensor

