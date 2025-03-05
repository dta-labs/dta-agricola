
const int En_WrRd_RS485 =  2;

const int Led_1 =  7; 
const int Led_2 =  6; 
const int Led_3 =  5;  

char VarChar = ' ';
String BufferIn = "";        
boolean StringCompleta = false; 

void setup() 
{ 
  Serial.begin(9600);
  BufferIn.reserve(5);  
    
  pinMode(En_WrRd_RS485, OUTPUT);
  
  pinMode(Led_1, OUTPUT);
  pinMode(Led_2, OUTPUT);
  pinMode(Led_3, OUTPUT);
  
  digitalWrite(En_WrRd_RS485, LOW); 
  digitalWrite(Led_1, LOW);
  digitalWrite(Led_2, LOW);
  digitalWrite(Led_3, LOW); 
} 
 
void loop() 
{ 
  if (StringCompleta) 
  {     
      Serial.print(BufferIn);  
     
      //if ((BufferIn.indexOf('A')) >= 0)
      //if ((BufferIn.indexOf('B')) >= 0)
      if ((BufferIn.indexOf('C')) >= 0)
      {
          if (BufferIn.indexOf('1' ) >= 0){digitalWrite(Led_1, HIGH);delay(1000);digitalWrite(Led_1, LOW);delay(1000);}
          if (BufferIn.indexOf('2' ) >= 0){digitalWrite(Led_2, HIGH);delay(1000);digitalWrite(Led_2, LOW);delay(1000);}
          if (BufferIn.indexOf('3' ) >= 0){digitalWrite(Led_3, HIGH);delay(1000);digitalWrite(Led_3, LOW);delay(1000);}

          digitalWrite(En_WrRd_RS485, HIGH); 
          delay(100);
          //Serial.print("PRIMER DISPOSITIVO");
          //Serial.print("SEGUNDO DISPOSITIVO");
          Serial.print("TERCER DISPOSITIVO");
          delay(100);
          digitalWrite(En_WrRd_RS485, LOW); 
      }
    
      StringCompleta = false;
      BufferIn = "";
  }
  
  delay(500);
} 

void serialEvent() {
  while (Serial.available()) 
  {
    VarChar = (char)Serial.read();
    BufferIn += VarChar;
    if (VarChar == '#') { StringCompleta = true; }   
  }
}



