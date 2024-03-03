#include <SPI.h>
#include <LoRa.h> 
int pot = A0;
 
void setup() {
  Serial.begin(115200);
  pinMode(pot,INPUT);
  
  while (!Serial);  
  Serial.println("LoRa Sender");
  if (!LoRa.begin(433E6)) { // or 915E6, the MHz speed of yout module
    Serial.println("Starting LoRa failed!");
    while (1);
  }
}
 
void loop() {
  int val = map(analogRead(pot),0,1024,0,255);
  Serial.println(val);
  LoRa.beginPacket();  
  LoRa.print(val);
  LoRa.endPacket();
  delay(1000);
 
}