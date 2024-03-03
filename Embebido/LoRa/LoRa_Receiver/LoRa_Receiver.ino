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
  
  // try to parse packet
  int packetSize = LoRa.parsePacket();
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
      
  if (valAnt != val) {
    valAnt = val;
    Serial.println(val);  
  }
}