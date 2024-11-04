#include "LoRaDevice.h"

const String nodeID = "DTA_00";
LoRaDevice node(10, 11, nodeID); // RX, TX, ID

void setup() {
  Serial.begin(115000);
  node.begin();
  // node.setNodeType(1);          // Gateway
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
}

void loop() {
  sendAnalogData();
  if (node.readData() != "") {
    blink(3);
  }
}

void sendAnalogData() {
  int analogValue = analogRead(A0);
  String dataToSend = "DTA_01," + nodeID + "," + String(analogValue);
  node.sendData(dataToSend);
}

void blink(int seconds) {
  for (int i = 0; i < seconds; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(500);
    digitalWrite(LED_BUILTIN, LOW);
    delay(500);
  }
}