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

void initCaudalSensor(uint16_t baud) {
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

// void setup() {
//   initCaudalSensor(2400);
//   Serial.begin(115200);
// }

// void loop() {
//   instantaneousFlowRate('L');
//   cumulativeFlowInteger();
//   cumulativeFlowDecimal();

//   delay(5000); // Esperar 1 segundo antes de la siguiente lectura
// }

String instantaneousFlowRate(char unit) {
  String msg = "";
  uint8_t result = node.readHoldingRegisters(0x0000, 2);
  if (result == node.ku8MBSuccess) {
    uint16_t data[2];
    data[0] = node.getResponseBuffer(0x00);
    data[1] = node.getResponseBuffer(0x01);
    uint32_t flowRate = (data[0] << 16) | data[1];
    Serial.print(F("Caudal instantáneo: "));
    msg = unit == 'L' ? (String(flowRate) + "L/h") : (String(flowRate / 1000.0) + "m3/h");
    Serial.println(msg);
  }
  return msg;
}

uint32_t cumulativeFlowInteger() {
  uint32_t accumulatedFlow;
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
  uint16_t decimalFlow;
  uint8_t result = node.readHoldingRegisters(0x0007, 1);
  if (result == node.ku8MBSuccess) {
    decimalFlow = node.getResponseBuffer(0x00);
    Serial.print(F("Caudal acumulado (decimal): "));
    Serial.println(decimalFlow / 1000.0);
  }
  return decimalFlow;
}
