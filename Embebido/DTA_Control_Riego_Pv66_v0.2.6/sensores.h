#pragma region Sensores

#pragma region <<Seguridad>>

// bool controlSeguridad1() {
//   return digitalRead(pinSensorSeguridad);
// }

// bool controlSeguridad2() {
//   float Sensibilidad = .185;       // 5A = 0.185; 20A = 0.100; 30A = 0.66
//   float voltajeSensor;
//   float corriente = 0;
//   float Imax = 0;
//   float Imin = 0;
//   long tiempo = millis();
//   while (millis() - tiempo < 500) {
//     voltajeSensor = analogRead(A1) * (5.0 / 1023.0);
//     corriente = 0.9 * corriente + 0.1 * ((voltajeSensor - 2.5) / Sensibilidad);
//     Imax = corriente > Imax ? corriente : Imax;
//     Imin = corriente < Imin ? corriente : Imin;
//   }
//   float Irms = (((Imax - Imin) / 2)) * 0.707;
//   Serial.print(F("Irms: "));
//   Serial.println(Irms, 2);
//   return Irms >= 0.1 ? true : false;
// }

// bool isSequre2() {
//   return (config[5] == 0) ? controlSeguridad1() : controlSeguridad2();
// }

bool isSequre() {
  return digitalRead(pinSensorSeguridad);
}

bool controlSeguridad() {
  if (!isSequre()) {
    Serial.println(F("  * Sequrity error... try again!"));
    delay(500);
    if (!isSequre()) {
      Serial.println(F("  * Sequrity error... try again!"));
      delay(500);
      return isSequre();
    }
  }
  return true;
}

#pragma endregion <<Seguridad>>

#pragma region <<Voltaje>>

bool controlVoltaje() {
  return digitalRead(pinSensorVoltaje);
}

#pragma endregion <<Voltaje>>

#pragma region <<Presión>>

float controlPresionAnalogica() {
  float presionActual = 0.0f;
  for (int i = 0; i < 3; i++) {
    float pAnalog = analogRead(A0);
    float temp = map(pAnalog, 100, 1023, 0.0, sensorPresionVar);
    presionActual += temp > 0 ? temp : 0;
    delay(10);
  }
  presionActual = presionActual / 3;
  Serial.print(F("  ~ Presion: "));
  Serial.println((String)presionActual);
  return presionActual;
}

bool controlPresion() {
  if (sensorPresionVar > 0) { 
    actualPresure = controlPresionAnalogica();
    return actualPresure >= 1;
  }
  return true;
  // return (sensorPresionVar == 0) || (sensorPresionVar > 0 && actualPresure >= 1) ? true : false;
}

#pragma endregion <<Presión>>

#pragma region <<Posición>>

bool parseGPSData() {
  bool newData = false;
  // Se parsean por un segundo los datos del GPS y se reportan algunos valores clave
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
    Serial.println(F("  * Problema de conectividad con el GPS: revise el cableado"));
  }
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

float getPosition() {
  float azimut = positionVar;
  bool newData = parseGPSData();
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

bool controlPosicion() {
  // return true; 
  ssGPS.begin(9600);
  ssGPS.listen();
  positionVar = getPosition();
  ssGPS.end();
  return (lat_actual == 0.0f && lon_actual == 0.0f) ? false : 
         (positionIni <= positionVar && positionVar < positionEnd) ? true : false;
}

#pragma endregion <<Posición>>

bool getSensors() {
  isVoltage = controlVoltaje();
  isPresure = controlPresion(); 
  isPosition = controlPosicion();
  isSequrity = controlSeguridad();
  return isVoltage && isSequrity;
}

#pragma endregion Sensores