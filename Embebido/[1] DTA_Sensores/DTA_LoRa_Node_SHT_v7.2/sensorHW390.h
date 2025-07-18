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
  // byte result = constrain(map(val, valAire, valAgua, 0, 100), 0, 100);

  float volt = getVcc();
  float value = (val / 1023.0) * volt * 1000; 
  byte result = constrain(map(value, valAire, valAgua, 0.0, 100.0), 0, 100);
  // Serial.print("val: "); Serial.print(val); Serial.print(" -> "); Serial.print(result); Serial.print(F(" ")); 
  return result;
}

#pragma endregion Sensor HW390

