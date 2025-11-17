// ACS712 AC RMS + detección de pico y presencia de corriente
// Ajusta SENSITIVITY a tu modelo: 185.0 (05A), 100.0 (20A), 66.0 (30A)

const float sensibilidad = .185;  // 5A = 185 | 20A = 100 | 30A = 66
const int sensorIntensidad = A1;

float getVcc() {
  ADMUX = _BV(REFS0) | _BV(MUX3) | _BV(MUX2) | _BV(MUX1);
  delay(2);
  ADCSRA |= _BV(ADSC);
  while (bit_is_set(ADCSRA, ADSC));
  long result = ADCL;
  result |= ADCH << 8;
  result = 1126400L / result;             // Back-calculate AVcc in mV
  return result / 1000.0;
  // return result;
}

bool leerCorriente(bool mostrar = false) {
  const float ruido = 0.00;
  float intensidadMaxima = 0;
  float intensidadMinima = 0;
  float Vcc = 5.0;
  long tiempo = millis();
  while (millis() - tiempo < 250) {   // Medio segundo
    float valorVoltajeSensor = analogRead(sensorIntensidad) * (Vcc / 1023.0);
    float corriente = .9 * corriente + .1 * ((valorVoltajeSensor - (Vcc / 2)) / sensibilidad);
    if (corriente > intensidadMaxima) intensidadMaxima = corriente;
    if (corriente < intensidadMinima) intensidadMinima = corriente;
  }
  float intensidadPico = (((intensidadMaxima - intensidadMinima) / 2) - ruido);
  if (mostrar) {
    Serial.print("Ipico: "); Serial.print(intensidadPico, 3); Serial.print("A ");
    float Irms = intensidadPico * .707;   // Intensidad RMS = Ipico / (2^1/2)
    Serial.print("Irms: "); Serial.print(Irms, 3); Serial.print("A -> ");
  } 
  return intensidadPico > .1;
}

void setup() {
  Serial.begin(115200);
}

void loop() {
  Serial.println(leerCorriente(true) ? "Conectado ~" : " ");
  delay(500);
}
