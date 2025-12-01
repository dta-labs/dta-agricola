#define sensorPin A0
#define valAire 2330
#define valAgua 1025

#define DESV_EST_UMBRAL 0.3
#define NUM_LECTURAS 30
float hum_hist[NUM_LECTURAS] = {0};
uint8_t index = 0;
bool calentado = false;

void setup() {
  pinMode(A1, OUTPUT);
  analogReference(DEFAULT);
  Serial.begin(19200);
}

void loop() {
  getMoisture();
}

#pragma region HW390

void getMoisture() {
  static float muestras[NUM_LECTURAS];
  digitalWrite(A1, HIGH);
  delay(50);
  for (byte i = 0; i < NUM_LECTURAS; i++) {
    muestras[i] = analogRead(sensorPin); // Leer el valor del sensor
    delay(150);
  }
  digitalWrite(A1, LOW);
  float val = estimadorAdaptativo(muestras, NUM_LECTURAS);
  float volt = getVcc();
  float value = (val / 1023.0) * volt * 1000; 
  float percent = constrain(map(value, valAire, valAgua, 0.0, 100.0), 0, 100);
  Serial.println(String(volt) + " " + String(val) + " " + String(value) + " " + String(percent, 1) + "%");
}

float getVcc() {
  ADMUX = _BV(REFS0) | _BV(MUX3) | _BV(MUX2) | _BV(MUX1);
  delay(2);
  ADCSRA |= _BV(ADSC);
  while (bit_is_set(ADCSRA, ADSC));
  long result = ADCL;
  result |= ADCH << 8;
  result = 1126400L / result;             // Back-calculate AVcc in mV
  return result / 1000.0;
}

#pragma endregion HW390

#pragma region Estadísticas

void agregarALaMedia(float nueva_temp, float nueva_hum) {
  hum_hist[index] = nueva_hum;
  index = (index + 1) % NUM_LECTURAS;
}

float promedio(float *hist) {
  float suma = 0;
  for (int i = 0; i < NUM_LECTURAS; i++) suma += hist[i];
  return suma / NUM_LECTURAS;
}

float moda(float *valores, byte n) {
  float moda = valores[0];
  int maxCount = 0;
  for (int i = 0; i < n; i++) {
    int count = 0;
    for (int j = 0; j < n; j++) {
      if (abs(valores[j] - valores[i]) < 0.1) count++;  // tolerancia de 0.1
    }
    if (count > maxCount) {
      maxCount = count;
      moda = valores[i];
    }
  }
  return moda;
}

float mediana(float *valores, byte n) {
  float copia[n];
  memcpy(copia, valores, n * sizeof(float));
  for (int i = 0; i < n - 1; i++) {
    for (int j = 0; j < n - i - 1; j++) {
      if (copia[j] > copia[j + 1]) {
        float temp = copia[j];
        copia[j] = copia[j + 1];
        copia[j + 1] = temp;
      }
    }
  }
  if (n % 2 == 0)
    return (copia[n / 2 - 1] + copia[n / 2]) / 2.0;
  else
    return copia[n / 2];
}

float desviacionEstandar(float *valores, int n) {
  float suma = 0, media = 0, varianza = 0;
  for (int i = 0; i < n; i++) suma += valores[i];
  media = suma / n;
  for (int i = 0; i < n; i++) varianza += pow(valores[i] - media, 2);
  return sqrt(varianza / n);
}

float estimadorAdaptativo(float *valores, int n) {
  float desviacion = desviacionEstandar(valores, n);
  if (desviacion < DESV_EST_UMBRAL) {                 // Umbral ajustable según sensor
    return moda(valores, n);
  } else {
    return mediana(valores, n);
  }
}

#pragma endregion Estadísticas

