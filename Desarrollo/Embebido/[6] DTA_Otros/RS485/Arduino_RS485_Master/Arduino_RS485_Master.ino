#include <SoftwareSerial.h>

SoftwareSerial RS485(4, 7);   // RX, TX
const int En_WrRd_RS485_5 =  5;
const int En_WrRd_RS485_6 =  6;

char VarChar = ' ';
String BufferIn = "";     
int i = 0;   

void setup() { 
  Serial.begin(115200);

  RS485.begin(9600);
  pinMode(En_WrRd_RS485_5, OUTPUT);
  pinMode(En_WrRd_RS485_6, OUTPUT);
  digitalWrite(En_WrRd_RS485_5, LOW); 
  digitalWrite(En_WrRd_RS485_6, LOW); 

  pinMode(LED_BUILTIN, OUTPUT);

} 
 
void loop() {  
  digitalWrite(En_WrRd_RS485_5, HIGH); 
  digitalWrite(En_WrRd_RS485_6, HIGH); 
  String data = "Prueba" + String(i);
  RS485.print(data);
  Serial.println(data);
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(30000);
  i++;
} 


