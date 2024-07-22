#pragma region Sensores

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

float readAnalogicData(int port) {
  long reads = 0;
  float vcc = readVcc();
  float value = 0;
  unsigned long startMillis = millis();
  while (millis() - startMillis < 1000) {
    value += analogRead(port);
    reads++;
    delayMicroseconds(33);
  }
  value /= reads;
  return (value / 1024.0) * vcc;
}


#pragma endregion Sensores