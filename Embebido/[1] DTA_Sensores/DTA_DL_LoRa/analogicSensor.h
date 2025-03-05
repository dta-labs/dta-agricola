#pragma region Sensores

int cmp_desc(const void *c1, const void *c2) {  
  return *((int *)c2) - *((int *)c1);
}

int cmp_asc(const void *c1, const void *c2) {  
  return *((int *)c1) - *((int *)c2);
}

float meanArray(float arr[]) {
  float result = 0;
  for (int i = 1; i < 99; i++) {
    result += arr[i];
  }
  return result / 98;
}
 
long readVcc() {
  ADMUX = _BV(REFS0) | _BV(MUX3) | _BV(MUX2) | _BV(MUX1);
  delay(2);
  ADCSRA |= _BV(ADSC);
  while (bit_is_set(ADCSRA, ADSC));
  
  long result = ADCL;
  result |= ADCH << 8;
  result = 1126400L / result; // Back-calculate AVcc in mV
  return result / 1000.0;
}

float readAnalogicData() {
  float vcc = readVcc();
  float values[100];
  for (int i = 0; i < 100; i++) {
    values[i] = analogRead(ANALOG_PORT);
    delayMicroseconds(30);
  }
  qsort(values, 100, sizeof(float), cmp_asc);
  float result = meanArray(values);
  return (result / 1024.0) * vcc;
}

#pragma endregion Sensores