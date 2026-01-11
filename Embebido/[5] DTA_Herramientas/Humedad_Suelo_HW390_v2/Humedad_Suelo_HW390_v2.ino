#define sensorPin A0

struct Perfil {
  float vSeco;  // voltaje en suelo seco 
  float vCC;    // voltaje en capacidad de campo 
  float vSat;   // voltaje en saturación 
  int   pSeco;  // % en seco (ej. 25–30) 
  int   pCC;    // % en CC (ej. 35–40) 
  int   pSat;   // % en saturación (ej. 55–60)
};

Perfil arenoso = {2.95, 1.25, 0.70, 28, 35, 55};
Perfil franco = {2.85, 1.15, 0.65, 30, 40, 58};
Perfil arcilloso = {2.75, 1.05, 0.60, 32, 42, 60};

Perfil mezcla(Perfil A, Perfil B, Perfil C, float wA, float wB) {
  float wC = 1 - (wA + wB);
  Perfil m;
  m.vSeco = wA * A.vSeco + wB * B.vSeco + wC * C.vSeco;
  m.vCC   = wA * A.vCC   + wB * B.vCC   + wC * C.vCC;
  m.vSat  = wA * A.vSat  + wB * B.vSat  + wC * C.vSat;
  m.pSeco = (int)(wA * A.pSeco + wB * B.pSeco + wC * C.pSeco);
  m.pCC   = (int)(wA * A.pCC   + wB * B.pCC   + wC * C.pCC);
  m.pSat  = (int)(wA * A.pSat  + wB * B.pSat  + wC * C.pSat);
  return m;
};

Perfil suelo = { 2.82, 1.60, 1.07, 0, 40, 60 };
// Perfil suelo = mezcla(arenoso, franco, arcilloso, 0.3, .1);

#define DESV_EST_UMBRAL 0.3
#define NUM_LECTURAS 30
float hum_hist[NUM_LECTURAS] = {0};
uint8_t index = 0;

void setup() {
  pinMode(A1, OUTPUT);
  analogReference(DEFAULT);   // usa Vcc como referencia (3.3V o 5V)
  Serial.begin(19200);
}

void loop() {
  float lectura, vwc;
  getMoisture(lectura, vwc);
  Serial.println("Lectura: " + String(lectura, 3) + 
                 "V ~> VWC: " + String(vwc) + "%");
}

#pragma region HW390

void getMoisture(float &lectura, float &vwc) {
  static float muestras[NUM_LECTURAS];
  digitalWrite(A1, HIGH);
  delay(50);
  for (byte i = 0; i < NUM_LECTURAS; i++) {
    muestras[i] = analogRead(sensorPin);
    delay(150);
  }
  digitalWrite(A1, LOW);
  int val = estimadorAdaptativo(muestras, NUM_LECTURAS);
  float volt = getVcc(); // mide referencia real
  lectura = (val / 1023.0) * volt; // convierte a voltios
  vwc = map(lectura * 1000, suelo.vSeco * 1000, suelo.vSat * 1000, suelo.pSeco, suelo.pSat);
}

float getVcc() {
  ADMUX = _BV(REFS0) | _BV(MUX3) | _BV(MUX2) | _BV(MUX1);
  delay(2);
  ADCSRA |= _BV(ADSC);
  while (bit_is_set(ADCSRA, ADSC));
  long result = ADCL;
  result |= ADCH << 8;
  result = 1126400L / result; // calcula AVcc en mV
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

