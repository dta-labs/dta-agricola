#pragma region Sensores

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
  float vcc = getVcc();
  const int N = 30;
  float values[N];
  for (int i = 0; i < N; i++) {
    values[i] = analogRead(sensorPin);
    delayMicroseconds(30);
  }
  float result = median(values, N);
  Serial.print("A1: "); Serial.print(result); 
  // result = (result / 1024.0f) * vcc;
  // Serial.print(" volt: "); Serial.print(result); 
  float psi = constrain(map(result, 157, 170.0, 40.0, 50.0), 0, 500);   // 0x0001 [ ]
  // float psi = constrain(map(result, 157, 170.0, 40.0, 50.0), 0, 500);   // 0x0002 [Ok]
  Serial.print("v psi: "); Serial.println(psi); 
  return psi;                  // Convierte a voltaje real
}

#pragma endregion Sensores