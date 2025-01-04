#include <ModbusMaster.h>
#include <SoftwareSerial.h>

// Configuración de los pines
#define RX_PIN 4
#define DE_PIN 5
#define RE_PIN 6
#define TX_PIN 7

SoftwareSerial rs485Serial(RX_PIN, TX_PIN); // Software Serial para RS485
ModbusMaster node;

void preTransmission() {
  digitalWrite(DE_PIN, HIGH);
  digitalWrite(RE_PIN, HIGH);
}

void postTransmission() {
  digitalWrite(DE_PIN, LOW);
  digitalWrite(RE_PIN, LOW);
}

void setupRS485Comm(uint16_t baud) {
  pinMode(DE_PIN, OUTPUT);
  pinMode(RE_PIN, OUTPUT);
  digitalWrite(DE_PIN, LOW);
  digitalWrite(RE_PIN, LOW);

  // Configuración del puerto serie
  rs485Serial.begin(baud); // Baud rate por defecto
  node.begin(1, rs485Serial); // ID del dispositivo
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);
}

void setup() {
  setupRS485Comm(2400);
  Serial.begin(115200);
}

void loop() {
  instantaneousFlowRate();
  cumulativeFlowInteger();
  cumulativeFlowDecimal();

  delay(5000); // Esperar 1 segundo antes de la siguiente lectura
}

void instantaneousFlowRate() {
  uint8_t result;
  uint16_t data[2];
  result = node.readHoldingRegisters(0x0000, 2);
  if (result == node.ku8MBSuccess) {
    data[0] = node.getResponseBuffer(0x00);
    data[1] = node.getResponseBuffer(0x01);
    uint32_t flowRate = (data[0] << 16) | data[1];
    Serial.print(F("Caudal instantáneo: "));
    Serial.print(flowRate);
    Serial.println(F(" L/h"));
    Serial.print(F("Caudal instantáneo: "));
    Serial.print(flowRate / 1000.0);
    Serial.println(F(" m^3/h"));
  }
}

void cumulativeFlowInteger() {
  uint8_t result;
  uint16_t data[2];
  result = node.readHoldingRegisters(0x0005, 2);
  if (result == node.ku8MBSuccess) {
    data[0] = node.getResponseBuffer(0x00);
    data[1] = node.getResponseBuffer(0x01);
    uint32_t accumulatedFlow = (data[0] << 16) | data[1];
    Serial.print(F("Caudal acumulado (entero): "));
    Serial.println(accumulatedFlow);
  }
}

void cumulativeFlowDecimal() {
  uint8_t result;
  result = node.readHoldingRegisters(0x0007, 1);
  if (result == node.ku8MBSuccess) {
    uint16_t decimalFlow = node.getResponseBuffer(0x00);
    Serial.print(F("Caudal acumulado (decimal): "));
    Serial.println(decimalFlow / 1000.0);
  }
}
