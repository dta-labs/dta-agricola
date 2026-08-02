#pragma region Sensores

float readVcc() {
  ADMUX = _BV(REFS0) | _BV(MUX3) | _BV(MUX2) | _BV(MUX1); // Referencia interna 1.1V
  delay(2);
  ADCSRA |= _BV(ADSC); // Inicia conversión
  while (bit_is_set(ADCSRA, ADSC)); // Espera a que termine
  
  long result = ADCL;
  result |= ADCH << 8;
  result = 1126400L / result; // Calcula Vcc en mV
  return result / 1000.0f;    // Devuelve en voltios
}

float median(float arr[], int size) {               // Función para calcular la mediana de un arreglo
  for (int i = 0; i < size-1; i++) {
    for (int j = i+1; j < size; j++) {
      if (arr[j] < arr[i]) {
        float tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
    }
  }
  return arr[size/2];                               // Devuelve el valor central
}

float readAnalogicData() {                          // Lectura analógica filtrada con 30 muestras
  float vcc = readVcc();
  const int N = 30;
  float values[N];
  for (int i = 0; i < N; i++) {
    values[i] = analogRead(ANALOG_PORT);
    delayMicroseconds(30);
  }
  float result = median(values, N);
  return (result / 1024.0f) * vcc;                  // Convierte a voltaje real
}

#pragma endregion Sensores