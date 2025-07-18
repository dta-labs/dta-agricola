int valAire = 2830; 
int valAgua = 1130;
// int valAire = 564; 
// int valAgua = 223;

void setup() {
  pinMode(A1, OUTPUT);
  analogReference(DEFAULT);
  Serial.begin(19200);
}

void loop() {
  digitalWrite(A1, HIGH);
  delay(50);
  float val = analogRead(A0);
  digitalWrite(A1, LOW);
  float volt = getVcc();
  float value = (val / 1023.0) * volt * 1000; 
  float percent = constrain(map(value, valAire, valAgua, 0.0, 100.0), 0, 100);
  Serial.println(String(volt) + " " + String(val) + " " + String(value) + " " + String(percent, 1) + "%");
  delay(500);
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
