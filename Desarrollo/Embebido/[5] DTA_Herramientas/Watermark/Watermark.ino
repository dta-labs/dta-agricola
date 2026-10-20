/*
  Sensor de humedad del suelo Irrometer Watermark (15')

  Vcc (3.3V o 5V) ----[R = 10kΩ]----+----[Sensor Watermark]---- GND
                                    |
                                    +---- A0 (Arduino)
*/

const int sensorPin = A0;
const int fixedResistor = 10000; // 10kΩ
const int samples = 15;          // número de lecturas por ciclo
const int discardFraction = 5;   // descartar 1/3 de lecturas extremas

// --- Función: calcular resistencia del sensor ---
float calculateResistance(int rawValue) {
  float voltageRatio = rawValue / 1023.0;
  return (fixedResistor * voltageRatio) / (1 - voltageRatio);
}

// --- Función: polinomio cúbico ajustado (válido 2–30 kΩ) ---
float polynomialVWC(float Rk) {
  return -0.0033 * pow(Rk, 3) + 0.2331 * pow(Rk, 2) - 7.3372 * Rk + 109.56;
}

// --- Función: interpolación lineal ---
float interpolate(float x, float x0, float y0, float x1, float y1) {
  return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
}

// Conversión de resistencia (ohmios) a centibares (kPa)
float resistanceToCentibars(float R) {
  float Rk = R / 1000.0; // convertir a kΩ
  // Ejemplo de curva aproximada (válida 2–30 kΩ):
  // Estos coeficientes deben ajustarse con datos reales del fabricante
  return 0.1 * pow(Rk, 2) + 2.0 * Rk + 5.0;
}

// --- Función: convertir resistencia a VWC con híbrido ---
float resistanceToVWC_Normalyzed(float R) {
  float Rk = R / 1000.0; // convertir a kΩ
  if (Rk < 2) return interpolate(Rk, 0, 100, 2, 95);        // extrapolación baja
  else if (Rk <= 30) return polynomialVWC(Rk);              // polinomio dentro del rango
  else if (Rk <= 40) return interpolate(Rk, 30, 10, 40, 5); // extrapolación alta
  else return 0;                                            // suelo extremadamente seco
}

float resistanceToVWC(float R, float vwcMax) {
  float Rk = R / 1000.0; // kΩ
  float cb = resistanceToCentibars(R); // función que ya tienes o defines
  
  // Conversión aproximada: VWC = vwcMax * exp(-cb / factor)
  // factor depende del tipo de suelo (ej. 50 para franco)
  float factor = 50.0;
  float vwc = vwcMax * exp(-cb / factor);
  
  return vwc;
}

// --- Función: promedio filtrado ---
float filteredAverageResistance() {
  float values[samples];
  for (int i = 0; i < samples; i++) {               // Tomar lecturas
    values[i] = calculateResistance(analogRead(sensorPin));
    delay(10);                                      // pequeña pausa entre lecturas
  }
  for (int i = 0; i < samples - 1; i++) {           // Ordenar (burbuja simple)
    for (int j = i + 1; j < samples; j++) {
      if (values[j] < values[i]) {
        float temp = values[i];
        values[i] = values[j];
        values[j] = temp;
      }
    }
  }
  int end = samples - discardFraction;
  float sum = 0;
  for (int i = discardFraction; i < end; i++) {
    sum += values[i];
  }
  return sum / discardFraction;
}

void setup() {
  Serial.begin(250000);
  Serial.println("Sensor de humedad del suelo Irrometer Watermark");
  Serial.println("_______________________________________________\n");
  Serial.println("R(ohms)\t c(cb)\t VWC(%)");
  Serial.println("_______________________________________________");
}

void loop() {
  float sensorResistance = filteredAverageResistance();
  float vwc = constrain(resistanceToVWC(sensorResistance, 60), 0, 100);
  float centibars = resistanceToCentibars(sensorResistance);
  Serial.print(sensorResistance); Serial.print("\t"); Serial.print(centibars); Serial.print("\t"); Serial.println(vwc);
  delay(2000);
}
