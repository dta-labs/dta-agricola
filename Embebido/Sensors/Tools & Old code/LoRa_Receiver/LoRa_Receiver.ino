#include <SPI.h>
#include <LoRa.h> 
String inString = "";    // string to hold input
int val = 0;
int valAnt = 0;
 
void setup() {
  Serial.begin(115200);
  
  while (!Serial);
  Serial.println("LoRa Receiver");
  if (!LoRa.begin(433E6)) { // or 915E6
    Serial.println("Starting LoRa failed!");
    while (1);
  }
}
 
void loop() {
  if (onReceive()) {
    Serial.println(inString);  
  }
  // delay(1000);
}

bool onReceive() {
  inString = "";    
  String pre =""; 
  String de;
  String para;
  int packetSize = LoRa.parsePacket();
  if (packetSize == 0) return false;
  if (packetSize) { 
    // read packet    
    pre += (char)LoRa.read();
    pre += (char)LoRa.read();
    pre += (char)LoRa.read();
    de += String(LoRa.read(), HEX);
    para += String(LoRa.read(), HEX);
    inString += (char)LoRa.read();
    inString += (char)LoRa.read();
    inString += (char)LoRa.read();
    LoRa.packetRssi();    
  }
  bool result = pre == "DTA" && de == "2" && para == "ff";
  Serial.println(pre + "== DTA && " + de + "== q &&" + para + "== ff => " + result);
  return result;
}

bool onReceive2() {
  int packetSize = LoRa.parsePacket();
  if (packetSize == 0) return false;
  if (packetSize) { 
    // read packet    
    while (LoRa.available())
    {
      int inChar = LoRa.read();
      inString += (char)inChar;
      val = inString.toInt();       
    }
    inString = "";     
    LoRa.packetRssi();    
  }
  return true;
}