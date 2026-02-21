#pragma region HW390

#define sensorPin A0

#define DESV_EST_UMBRAL 0.3
#define NUM_MUESTRAS 30
float hum_hist[NUM_MUESTRAS] = {0};
uint8_t index = 0;

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

Perfil mezcla(Perfil A, const Perfil B, const Perfil C, float wA, float wB) {
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

float VWC_modelado(float VWC_sensor, int arcilla, int limo, int arena, long t_min) {
  float horas = t_min / 60.0;
  // Punto de marchitez permanente según textura
  float PMP = 0.10 * (arena / 100.0) + 0.15 * (limo / 100.0) + 0.20 * (arcilla / 100.0);

  float k = 0.01;      // pendiente más fuerte
  float x0 = 24.0;     // punto de inflexión temprano (≈ 1 día)

  float num = 1.0 / (1.0 + exp(k * (horas - x0)));
  float num0 = 1.0 / (1.0 + exp(k * (0.0 - x0)));

  float VWC = PMP*100.0 + (VWC_sensor - PMP*100.0) * (num / num0);

  return VWC; // devolver en porcentaje
}

float calcularVWC(float humedad_sensor, int arcilla, int limo, int arena, long intervalo_min) {
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
  Serial.print(tiempo_desde_riego / 60); 
  ultima_humedad = humedad_sensor;
  float humedad_final = VWC_modelado(humedad_sensor, arena, limo, arcilla, tiempo_desde_riego);
  return humedad_final;
}

void getMoisture(float &lectura, float &vwc) {
  static float muestras[NUM_MUESTRAS];
  digitalWrite(A1, HIGH);
  delay(50);
  for (byte i = 0; i < NUM_MUESTRAS; i++) {
    muestras[i] = analogRead(sensorPin);
    delay(50);
  }
  digitalWrite(A1, LOW);
  int val = estimadorAdaptativo(muestras, NUM_MUESTRAS);
  float volt = getVcc(); // mide referencia real
  lectura = (val / 1023.0) * volt; // convierte a voltios
  vwc = constrain(map(lectura * 1000, suelo.vSeco * 1000, suelo.vSat * 1000, suelo.pSeco, suelo.pSat), 0, 100);
}

#pragma endregion HW390

#pragma region SHT3

#include <Adafruit_SHT31.h>

#define enableHeater false        // SHT Sensor
#define timer .2                  // Tiempo de espera en minutos
Adafruit_SHT31 sht31 = Adafruit_SHT31();
float shtData[2] = {0, 0};

#define vMax 4.78                 // HW Sensor
#define offset 0

void settupSHT() {
  Wire.begin();
  delay(100);
  while (!sht31.begin(0x44)){ 
    delay(1);
  }
  sht31.heater(enableHeater);
}

void readSHT(float &h, float &t) {
  t = sht31.readTemperature();
  h = sht31.readHumidity();
  shtData[0] = !isnan(t) ? t : -99;
  shtData[1] = !isnan(h) ? h : -99;
}

#pragma endregion SHT3

void setup() {
  pinMode(A1, OUTPUT);
  analogReference(DEFAULT);   // usa Vcc como referencia (3.3V o 5V)
  settupSHT(); 
  Serial.begin(250000);
  Serial.println(F("______________________________________________\n"));
  Serial.println(F("     Comprobador de sensores HW390 & SHT3"));
  Serial.println(F("______________________________________________\n"));
  Serial.println(F("T(h)\t HW(V)\t Med(%)\t Est(%)"));
  // Serial.println(F("HW(V)\t hw(%)\t HW(%)\t Est(%)\t SHT(%)\t T(°C)"));
}

void loop() {
  float vcc_hw390, vwc_hw390, vwc_sht3, temp_sht3;
  getMoisture(vcc_hw390, vwc_hw390);
  readSHT(vwc_sht3, temp_sht3); 

  float vwc_hw390_ajus = constrain(((vwc_hw390 - 10) / 50 * 100), 0, 100);
  float vwc_hw390_estimado = calcularVWC(vwc_hw390, 30, 20, 50, 10);

  Serial.print("\t"); Serial.print(vcc_hw390); 
  Serial.print("\t"); Serial.print(vwc_hw390); 
  // Serial.print("\t"); Serial.print(vwc_hw390_ajus); 
  Serial.print("\t"); Serial.print(vwc_hw390_estimado); 
  // Serial.print("\t"); Serial.print(vwc_sht3); 
  // Serial.print("\t"); Serial.print(temp_sht3); 
  Serial.println(); 

  // delay(50);
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

#pragma region Estadísticas

void agregarALaMedia(float nueva_temp, float nueva_hum) {
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

