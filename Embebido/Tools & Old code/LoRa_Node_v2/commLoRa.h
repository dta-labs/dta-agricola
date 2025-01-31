#pragma region commLoRa

bool isValidAddress(String inString) {
  // Serial.println("<< Rx: " + inString + " >>");   // DTA,0xFF,0x0A,sleep
  int index = inString.indexOf(",");
  String control = inString.substring(0, index);
  // Serial.println(" + Control: " + control);
  index++;
  String from = inString.substring(index, inString.indexOf(",", index)); 
  // Serial.println(" + From: " + from);
  index = inString.indexOf(",", index);
  String to = inString.substring(index + 1, inString.indexOf(",", index + 1)); 
  // Serial.println(" + To: " + to);
  index = inString.indexOf(",", index + 1);
  String sleep = inString.substring(index + 1, inString.indexOf(",", index + 1)); 
  // Serial.println(" + Sleep: " + sleep);
  Serial.println(control == "DTA" && to == (String)nodeAddress && from == (String)gatewayAddress);
  if (control == "DTA" && to == (String)nodeAddress && from == (String)gatewayAddress) {
    sleepingTime = sleep.toInt();
    return true;
  }
  return false;
} 

bool rxData() {
  if (LoRa.parsePacket() == 0) return false;
  Serial.println(".");
  String inString = "";
  while (LoRa.available()) {  // read packet
    inString += (char)LoRa.read();
  }
  Serial.println(inString);
  return isValidAddress(inString);   
}

void txData(String data) {
  data = "DTA,0x0A,0xFF,123,456";
  LoRa.beginPacket();
  LoRa.print(data);           // outgoing message
  LoRa.endPacket();
  Serial.println("└> " + data);
}

#pragma endregion commLoRa
