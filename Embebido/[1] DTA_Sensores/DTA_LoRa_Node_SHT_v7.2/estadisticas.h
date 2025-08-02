#pragma region Estadísticas

#define DESV_EST_UMBRAL 0.3
#define NUM_MUESTRAS 10
// #define NUM_LECTURAS 6
float hum_hist[NUM_MUESTRAS] = {0};
float temp_hist[NUM_MUESTRAS] = {0};
uint8_t index = 0;
bool calentado = false;

void agregarALaMedia(float nueva_temp, float nueva_hum) {
  temp_hist[index] = nueva_temp;
  hum_hist[index] = nueva_hum;
  index = (index + 1) % NUM_MUESTRAS;
}

float promedio(float *hist) {
  float suma = 0;
  for (int i = 0; i < NUM_MUESTRAS; i++) suma += hist[i];
  return suma / NUM_MUESTRAS;
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

