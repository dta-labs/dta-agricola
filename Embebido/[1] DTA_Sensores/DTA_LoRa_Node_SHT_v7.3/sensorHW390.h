#pragma region Sensor HW390

// byte getMoisture_old() {
//   static float muestras[NUM_MUESTRAS];
//   digitalWrite(A1, HIGH);
//   delay(50);
//   for (byte i = 0; i < NUM_MUESTRAS; i++) {
//     muestras[i] = analogRead(sensorPin); // Leer el valor del sensor
//     delay(250);
//   }
//   digitalWrite(A1, LOW);
//   float val = estimadorAdaptativo(muestras, NUM_MUESTRAS);
//   float volt = getVcc();
//   float value = (val / 1023.0) * volt * 1000; 
//   byte result = constrain(map(value, valAire, valAgua, 0.0, 100.0), 0, 100);
//   return result;
// }

byte getMoisture() {
  static float muestras[NUM_MUESTRAS];
  digitalWrite(A1, HIGH);
  delay(50);
  for (byte i = 0; i < NUM_MUESTRAS; i++) {
    muestras[i] = analogRead(sensorPin);
    delay(150);
  }
  digitalWrite(A1, LOW);
  int val = estimadorAdaptativo(muestras, NUM_MUESTRAS);
  float volt = getVcc(); // mide referencia real
  float lectura = (val / 1023.0) * volt; // convierte a voltios
  byte vwc = (byte) constrain(map(lectura * 1000, suelo.vSeco * 1000, suelo.vSat * 1000, suelo.pSeco, suelo.pSat), 0, 100);
  return vwc;
}


#pragma endregion Sensor HW390

