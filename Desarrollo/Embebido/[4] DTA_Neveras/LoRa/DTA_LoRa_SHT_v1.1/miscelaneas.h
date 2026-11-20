#pragma region Miscelaneas

int calculateSum(const char* str, uint8_t len) {
  int sum = 0;
  for (uint8_t i = 0; i < len; i++) sum += str[i];
  return sum;
}

float getVcc() {
  ADMUX = _BV(REFS0) | _BV(MUX3) | _BV(MUX2) | _BV(MUX1);   // Referencia AVcc, mide la interna de 1.1 V
  delay(2);
  long result = 0;
  for (uint8_t i = 0; i < 2; i++) {                         // La primera conversión se descarta
    ADCSRA |= _BV(ADSC);
    while (bit_is_set(ADCSRA, ADSC));
    result = ADCL;
    result |= ADCH << 8;
  }
  if (result == 0) return 0;
  return (1126400L / result) / 1000.0;                      // AVcc en V
}

#pragma endregion Miscelaneas
