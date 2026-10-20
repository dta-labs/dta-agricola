#pragma region RS485

void initRS485(int baudRate) {
  RS485.begin(baudRate);
  pinMode(En_WrRd_RS485_4, OUTPUT);
  pinMode(En_WrRd_RS485_5, OUTPUT);
  digitalWrite(En_WrRd_RS485_4, LOW); 
  digitalWrite(En_WrRd_RS485_5, LOW); 
}

String readRS485() { 
  RS485.listen();
  String BufferIn = "";
  bool stop = false;
  while (RS485.available() && !stop) { 
    char VarChar = RS485.read(); 
    Serial.println(VarChar);
    BufferIn += VarChar;
    if (VarChar == '#') {
      // BufferIn = "";
      Serial.println(BufferIn);
      stop = true;
      // Serial.println();
    }
    delay(50);
  }
  stop = false;
  return BufferIn;
} 


#pragma endregion RS485
