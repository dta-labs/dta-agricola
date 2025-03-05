#include <ModbusMaster.h>
#include <SoftwareSerial.h>

// Configuración de los pines
#define RX_PIN 3
#define DE_PIN 4
#define RE_PIN 4
#define TX_PIN 5

SoftwareSerial rs485Serial(RX_PIN, TX_PIN);     // Software Serial para RS485
ModbusMaster node;

void preTransmission() {
  digitalWrite(DE_PIN, HIGH);
  digitalWrite(RE_PIN, HIGH);
}

void postTransmission() {
  digitalWrite(DE_PIN, LOW);
  digitalWrite(RE_PIN, LOW);
}

void initCaudalSensor(uint16_t baud) {
  pinMode(DE_PIN, OUTPUT);
  pinMode(RE_PIN, OUTPUT);
  digitalWrite(DE_PIN, LOW);
  digitalWrite(RE_PIN, LOW);

  // Configuración del puerto serie
  rs485Serial.begin(baud); // Baud rate por defecto 2400
  node.begin(1, rs485Serial); // ID del dispositivo
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);
}

float instantaneousFlowRate() {
  float caudal = -1;
  rs485Serial.listen();
  uint8_t result = node.readHoldingRegisters(0x0000, 2);
  if (result == node.ku8MBSuccess) {
    uint16_t data[2];
    data[0] = node.getResponseBuffer(0x00);
    data[1] = node.getResponseBuffer(0x01);
    caudal = (data[0] << 16) | data[1];
  }
  return caudal * 1.0;
}

uint32_t cumulativeFlowInteger() {
  rs485Serial.listen();
  uint32_t accumulatedFlow = -1;
  uint8_t result = node.readHoldingRegisters(0x0005, 2);
  if (result == node.ku8MBSuccess) {
    uint16_t data[2];
    data[0] = node.getResponseBuffer(0x00);
    data[1] = node.getResponseBuffer(0x01);
    accumulatedFlow = (data[0] << 16) | data[1];
    Serial.print(F("Caudal acumulado (entero): "));
    Serial.println(accumulatedFlow);
  }
  return accumulatedFlow;
}

uint16_t cumulativeFlowDecimal() {
  rs485Serial.listen();
  uint16_t decimalFlow = -1;
  uint8_t result = node.readHoldingRegisters(0x0007, 1);
  if (result == node.ku8MBSuccess) {
    decimalFlow = node.getResponseBuffer(0x00);
    Serial.print(F("Caudal acumulado (decimal): "));
    Serial.println(decimalFlow / 1000.0);
  }
  return decimalFlow;
}
