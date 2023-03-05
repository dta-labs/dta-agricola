#pragma region Acciones

void systemWatchDog() {
  wdt_reset();
  pinMode(watchDogPin, OUTPUT);         // Sink current to drain charge from C2
  digitalWrite(watchDogPin, HIGH);
  delay(50);                            // Give enough time for C2 to discharge (should discharge in 50 ms)     
  pinMode(watchDogPin, INPUT);          // Return to high impedance
}

void setActivationTimer() {
  activationTimer = 600 * velocityVar;      // 60000 * velocityVar / 100;
  unsigned int dif = 60000 - activationTimer;
  deactivationTimer = velocityVar == 100 ? 0 : dif > 0 ? dif : 10;
}

void showVars() {
  Serial.print(F("> Type: "));
  Serial.println(deviceType == "PC" ? "Central Pivot" : deviceType == "PC" ? "Lineal Pivot" : "Other");
  Serial.print(F("> Status: ")); Serial.println(statusVar);
  Serial.print(F("> Direction: ")); Serial.println(directionVar);
  Serial.print(F("> Auto Reverse: ")); Serial.println(autoreverseVar);
  Serial.print(F("> Position: ")); Serial.print((String)positionVar); Serial.println(F("°"));
  Serial.print(F("> End Gun: ")); Serial.println((String)endGunVar);
  Serial.print(F("> Velocity: ")); Serial.print((String)velocityVar); Serial.println(F("%"));
  Serial.print(F("  ~ ON: ")); Serial.print((String)activationTimer); Serial.println(F("ms"));
  Serial.print(F("  ~ OFF: ")); Serial.print((String)deactivationTimer); Serial.println(F("ms"));
}

void waitFor(int time) {
  unsigned long initialTimer = millis();
  time *= 100;
  while (millis() - initialTimer < time) {
    delay(100);
    systemWatchDog();
  }
}

void apagar() {
  digitalWrite(pinEngGunControl, serie == 0 ? HIGH : LOW);        // Apagado
  digitalWrite(pinMotorFF, HIGH);                                 // Apagado
  digitalWrite(pinMotorRR, HIGH);                                 // Apagado
  digitalWrite(pinActivationTimer, HIGH);                         // Apagado
  statusVar = "OFF";
}

void setDirection() {
  if (directionVar == "FF") {                                     // Activavión FF
    digitalWrite(pinMotorRR, HIGH);                               // Apagado
    delay(500);
    digitalWrite(pinMotorFF, LOW);                                // Encendido
  } 
  if (directionVar == "RR") {                                     // Activavión RR
    digitalWrite(pinMotorFF, HIGH);                               // Apagado
    delay(500);
    digitalWrite(pinMotorRR, LOW);                                // Encendido
  }
}

#pragma endregion Acciones

