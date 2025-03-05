#pragma region commLoRa

bool isValidAddress(String nodeAddress, String inString, float value[2]) {
  int index = inString.indexOf(",");
  String control = inString.substring(0, index);
  index++;
  String from = inString.substring(index, inString.indexOf(",", index)); 
  index = inString.indexOf(",", index);
  String to = inString.substring(index + 1, inString.indexOf(",", index + 1)); 
  Serial.println("└>  Rx: " + inString + "");   // DTA,0x0A,0xFF,value,volt
  Serial.println(" + Control: " + control);
  Serial.println(" + From: " + from);
  Serial.println(" + To: " + to);
  Serial.println(control == "DTA" && from == "0x" + (String)nodeAddress && to == (String)gatewayAddress);
  if (control == "DTA" && from == "0x" + (String)nodeAddress && to == (String)gatewayAddress) {
    // index = inString.indexOf(",", index + 1);
    value[0] = inString.substring(index + 1, inString.indexOf(",", index + 1)).toFloat(); 
    // Serial.println(" + Value: " + (String)value[0]);
    index = inString.indexOf(",", index + 1);
    value[1] = inString.substring(index + 1, inString.indexOf(",", index + 1)).toFloat(); 
    // Serial.println(" + Volt: " + (String)value[1]);
    return true;
  }
  return false;
} 

bool rxDataLoRa() {
  // Serial.print(".");
  if (LoRa.parsePacket() == 0) return false;
  String inString = "";
  while (LoRa.available()) {
    inString += (char)LoRa.read();
  }
  Serial.println(inString);
  return true;
  // return isValidAddress(newNodeAddress, inString, value);   
}

void txDataLora() {
  String data = "DTA," + (String)gatewayAddress + ",0x" + newNodeAddress + "," + sleepingTime;
  // Serial.print("<< Tx: " + data + ">>");
  LoRa.beginPacket();
  LoRa.print(data); 
  LoRa.endPacket();
  wdt_reset();
}

#pragma endregion commLoRa
