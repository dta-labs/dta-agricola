void setup() {
  pinMode(A1, OUTPUT);
  analogReference(DEFAULT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(A1, HIGH);
  delay(50);
  int valorAnalogico = analogRead(A0);
  digitalWrite(A1, LOW);
  Serial.println(valorAnalogico);
  delay(500);
}
