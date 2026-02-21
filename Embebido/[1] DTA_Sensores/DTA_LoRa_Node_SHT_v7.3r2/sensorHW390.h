#pragma region Sensor HW390

float VWC_modelado(float VWC_sensor, byte arcilla, byte limo, byte arena, long t_min) {
  float horas = t_min / 60.0;
  float PMP = 0.10 * (arena / 100.0) + 0.15 * (limo / 100.0) + 0.20 * (arcilla / 100.0);  // Punto de marchitez permanente según textura
  float k = 0.01;                                                                         // Pendiente más fuerte
  float x0 = 24.0;                                                                        // Punto de inflexión temprano (≈ 1 día)
  float num = 1.0 / (1.0 + exp(k * (horas - x0)));
  float num0 = 1.0 / (1.0 + exp(k * (0.0 - x0)));
  float VWC = PMP*100.0 + (VWC_sensor - PMP*100.0) * (num / num0);
  return VWC;                                                                             // Devolver en porcentaje
}

float calcularVWC(float humedad_sensor, byte arena, byte limo, byte arcilla, long intervalo_min) {
  static bool riego_detectado = false;
  static unsigned long tiempo_desde_riego = 0;
  static float humedad_inicial = 0;
  static float ultima_humedad = 0;
  if (humedad_sensor - ultima_humedad > 3.0) {      // Detectar riego
    riego_detectado = true;
    tiempo_desde_riego = 0;
    humedad_inicial = humedad_sensor;               // Guardar el valor inicial
  } else if (riego_detectado) {
    tiempo_desde_riego += intervalo_min;
  }
  // Serial.print(tiempo_desde_riego / 60); 
  ultima_humedad = humedad_sensor;
  float humedad_final = VWC_modelado(humedad_sensor, arena, limo, arcilla, tiempo_desde_riego);
  return humedad_final;
}

float getMoisture() {
  static float muestras[NUM_MUESTRAS];
  digitalWrite(A1, HIGH);
  delay(50);
  for (byte i = 0; i < NUM_MUESTRAS; i++) {
    muestras[i] = analogRead(sensorPin);
    delay(150);
  }
  digitalWrite(A1, LOW);
  int val = estimadorAdaptativo(muestras, NUM_MUESTRAS);
  float volt = getVcc();                            // mide referencia real
  float lectura = (val / 1023.0) * volt;            // convierte a voltios
  float vwc = constrain(map(lectura * 1000, suelo.vSeco * 1000, suelo.vSat * 1000, suelo.pSeco, suelo.pSat), 0, 100);
  return calcularVWC(vwc, 30, 20, 50, TIMER);
}


#pragma endregion Sensor HW390

