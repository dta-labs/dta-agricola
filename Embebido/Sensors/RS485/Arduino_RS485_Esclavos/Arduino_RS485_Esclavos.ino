#include <SoftwareSerial.h>

SoftwareSerial RS485(4, 7);   // RX, TX
const int En_WrRd_RS485_5 =  5;
const int En_WrRd_RS485_6 =  6;

char VarChar = ' ';
String BufferIn = "";        

void setup() { 
  Serial.begin(115200);
  Serial.println("\nRS485 Receptor\n");

  BufferIn.reserve(5);  

  RS485.begin(9600);
  pinMode(En_WrRd_RS485_5, OUTPUT);
  pinMode(En_WrRd_RS485_6, OUTPUT);
  digitalWrite(En_WrRd_RS485_5, LOW); 
  digitalWrite(En_WrRd_RS485_6, LOW); 

  pinMode(LED_BUILTIN, OUTPUT);

} 
 
void loop() { 
  if (RS485.available()) { 
    VarChar = RS485.read(); 
    Serial.print(VarChar);
    // BufferIn += VarChar;
    // if (VarChar == '#' && BufferIn.indexOf('B1') >= 0) {
    //   digitalWrite(LED_BUILTIN, HIGH);
    //   delay(500);
    //   digitalWrite(LED_BUILTIN, LOW);
    //   BufferIn = "";
    //   Serial.println();
    // }
    delay(50);
  }
} 
