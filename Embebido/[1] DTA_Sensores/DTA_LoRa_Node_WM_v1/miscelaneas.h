#pragma region Miscelaneas

int calculateSum(String str) {
  int sum = 0;
  for (int i = 0; i < str.length(); i++) sum += str[i];
  return sum;
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

#pragma endregion Miscelaneas

