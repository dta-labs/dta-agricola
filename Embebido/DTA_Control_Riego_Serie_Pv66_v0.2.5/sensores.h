#pragma region Sensores

bool controlSeguridad1() {
  delay(500);
  return digitalRead(pinSensorSeguridad);
}

bool controlSeguridad2() {
  float Sensibilidad = 0.185;
  float voltajeSensor;
  float corriente = 0;
  float Imax = 0;
  float Imin = 0;
  long tiempo = millis();
  while (millis() - tiempo < 500) {
    voltajeSensor = analogRead(A1) * (5.0 / 1023.0);
    corriente = 0.9 * corriente + 0.1 * ((voltajeSensor - 2.5) / Sensibilidad);
    if (corriente > Imax) { Imax = corriente; }
    if (corriente < Imin) { Imin = corriente; }
  }
  float Irms = (((Imax - Imin) / 2)) * 0.707;
  Serial.print(F("Irms: "));
  Serial.println(Irms, 2);
  return Irms >= 0.1 ? true : false;
}

bool isSequre() {
  return (config[5] == 0) ? controlSeguridad1() : controlSeguridad2();
}

bool controlSeguridad() {
  if (!isSequre()) {
    Serial.println(F("     Sequrity error... try again!"));
    if (!isSequre()) {
      Serial.println(F("     Sequrity error... try again!"));
      return isSequre();
    }
  }
  return true;
}

bool controlVoltaje() {
  return digitalRead(pinSensorVoltaje);
}

float controlPresionAnalogica() {
  float presionActual = 0.0f;
  for (int i = 0; i < 3; i++) {
    float pAnalog = presion.getAnalogValue();
    float temp = presion.fmap(pAnalog, 100, 1023, 0.0, sensorPresionVar);
    presionActual += temp > 0 ? temp : 0;
    // float temp = presion.fmap(pAnalog, 0, 1023, 0.0, sensorPresionVar) - 1.25;
    // temp = (temp + 0.4018) / 0.7373;
    // presionActual += pAnalog > 0 ? pAnalog : 0;
    delay(10);
  }
  presionActual = presionActual / 3;
  Serial.print(F("PresionF: "));
  Serial.println((String)presionActual);
  return presionActual;
}

bool controlPresion() {
  bool result = true;
  if (sensorPresionVar >= 1) {
    result = (controlPresionAnalogica() > 1) ? true : false;
  }
  return result;
}

bool parseGPSData() {
  bool newData = false;
  ssGPS.listen();
  // Se parsean por un segundo los datos del GPSy se reportan algunos valores clave
  for (unsigned long start = millis(); millis() - start < 1000;) {
    while (ssGPS.available()) {
      char c = ssGPS.read();
      // Serial.write(c);   // descomentar para ver el flujo de datos del GPS
      if (gps.encode(c))  // revisa si se completó una nueva cadena
        newData = true;
    }
  }
  return newData;
}

void checkGPSConnection() {
  unsigned long chars;
  unsigned short sentences, failed;
  gps.stats(&chars, &sentences, &failed);
  if (chars == 0) {
    Serial.println("Problema de conectividad con el GPS: revise el cableado");
  }
}

float getPosition() {
  float azimut = positionVar;
  bool newData = parseGPSData();
  lat_central = (lat_central == 0) ? eeVar.lat_central : lat_central;
  lon_central = (lon_central == 0) ? eeVar.lon_central : lon_central;
  if (newData) {
    unsigned long age;
    gps.f_get_position(&lat_actual, &lon_actual, &age);
    azimut = gps.course_to(lat_central, lon_central, lat_actual, lon_actual);
    errorGPS = gps.hdop() == TinyGPS::GPS_INVALID_HDOP ? 0 : gps.hdop();
    // printGPSData(lat_actual, lon_actual, azimut, errorGPS);
  }
  checkGPSConnection();
  return azimut;
}

float printGPSData(float flat, float flon, float azimut, int errorGPS) {
  Serial.print(lat_central, 6);
  Serial.print(F(","));
  Serial.print(lon_central, 6);
  Serial.print(F(" "));
  Serial.print(flat == TinyGPS::GPS_INVALID_F_ANGLE ? 0.0 : flat, 6);
  Serial.print(F(","));
  Serial.print(flon == TinyGPS::GPS_INVALID_F_ANGLE ? 0.0 : flon, 6);
  Serial.print(F(" "));
  Serial.print(gps.satellites() == TinyGPS::GPS_INVALID_SATELLITES ? 0 : gps.satellites());
  Serial.print(F(" "));
  Serial.print((int)azimut);
  Serial.print(F(" "));
  Serial.println(errorGPS);
}

#pragma endregion Sensores