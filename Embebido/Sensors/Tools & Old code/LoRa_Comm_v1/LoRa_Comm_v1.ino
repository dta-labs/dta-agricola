#include "LoRaDevice.h"

const String nodeID = "DTA_01";         // DTA_0x - Node | DTA_00 - Gateway
const String nodeToSend = "DTA_00";     // DTA_00 - Node | DTA_FF - Gateway
const int nodeType = 0;                 // 0      - Node | 1      - Gateway

LoRaDevice node(10, 11, nodeID);        // RX, TX, ID

void setup() {
  Serial.begin(115000);
  node.begin();
  node.setNodeType(nodeType);
}

void loop() {
  sendNodeData();
  node.recibeData();
}

void sendNodeData() {
  String txStr = nodeType == 1 ? "Gateway" : "Node";
  node.sendData(nodeToSend, nodeID, txStr);
}