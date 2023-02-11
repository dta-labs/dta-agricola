/****************************************************************
 *                                                              *
 *                 Sistemas DTA Serie AGxx v0.2 A               *
 *                                                              *
 *          Tester de sistemas de Jardinería y Paisajismo       *
 *                                                              *
 *   ~ Salidas x 8                                              *
 *   ~ Entradas x 5                                             *
 *   ~ Comunicación GSM                                         *
 *   ~ Watchdog                                                 *
 *                                                              *
 ****************************************************************/

#include <SoftwareSerial.h>
#include <avr/wdt.h>

SoftwareSerial gprs(2, 3);             // Rx, Tx: (2, 3) ~ Azul | (3, 2) ~ Rojo
static byte plots = 8;
#define watchDogPin A5
#define offSet 4

void setup() {
  wdt_disable();
  Serial.begin(115200);
  for (byte i = 0; i < plots; i++) {
    pinMode(i + offSet, OUTPUT);
    digitalWrite(i + offSet, HIGH);
  }
  Serial.println(F(">>> DTA-Agrícola: Serie AGxx v0.2 A"));
  Serial.println(F("    «Programa de prueba»"));
}

void loop() {
  testActuadores();
  testSensores();
  testComunicaciones();
  testWatchdog();
}

void testActuadores() {
  delay(3000);
  Serial.println(F("» Actuadores (Salidas x 8):"));
  for (byte i = 0; i < plots; i++) {
    byte idx = i + 1;
    Serial.print(F("  ~ Actuador : ")); Serial.println(idx);
    digitalWrite(i + offSet, LOW);
    delay(500);
  }
  Serial.println();
}

void testSensores() {
  delay(3000);
  Serial.println(F("» Sensores (Entradas x 5):"));
  for (byte i = 0; i < 5; i++) {
    byte idx = i + 1;
    int val = analogRead(i);
    Serial.print(F("  ~ Sensor ")); Serial.print(idx); Serial.print(F(": ")); Serial.println(val);
    delay(500);
  }
  Serial.println();
}

void testComunicaciones() {
  delay(3000);
  Serial.println(F("» Comunicaciones (GSM):"));
  gprs.begin(9600);
  gprs.println(F("AT+IPR=9600"));      // Velocidad en baudios?
  getResponse(15, true); 
  gprs.println(F("AT"));               // Tarjeta SIM Lista? OK
  getResponse(15, true); 
  gprs.println(F("AT+CGMI"));          // Fabricante del dispositivo?
  getResponse(15, true); 
  gprs.println(F("ATI"));              // Información del producto?
  getResponse(15, true); 
  gprs.println(F("AT+CGSN"));          // Número de serie?
  getResponse(15, true); 
  gprs.println(F("AT+IPR?"));          // Velocidad en baudios?
  getResponse(15, true); 
  gprs.println(F("AT+CBC"));           // Estado de la bateriía
  getResponse(15, true); 
  gprs.println(F("AT+CFUN?"));         // Funcionalidad 0 mínima 1 máxima
  getResponse(15, true); 
  gprs.println(F("AT+CGATT=1"));       // Tarjeta SIM insetada? +CPIN: READY OK
  getResponse(15, true); 
  gprs.println(F("AT+CPIN?"));         // Tarjeta SIM insetada? +CPIN: READY OK
  getResponse(15, true); 
  gprs.println(F("AT+WIND=1"));        // Indicación de tarjeta SIM insetada? +CPIN: READY OK
  getResponse(15, true); 
  gprs.println(F("AT+CREG?"));         // Tarjeta SIM registrada? +CREG: 0,1 OK 
  getResponse(15, true); 
  gprs.println(F("AT+CGATT?"));        // Tiene GPRS? +CGATT: 1 OK
  getResponse(15, true); 
  gprs.println(F("AT+CSQ"));           // Calidad de la señal -  debe ser 9 o superior: +CSQ: 14,0 OK
  getResponse(15, true); 
  gprs.println(F("AT+CCLK?"));         // Fecha y Hora?
  getResponse(15, true); 
  gprs.println(F("AT+COPS?"));         // Comañía telefónica?
  getResponse(15, true); 
  gprs.println(F("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\""));
  getResponse(15, true); 
  gprs.println(F("AT+SAPBR=3,1,\"APN\",\"internet.itelcel.com\""));
  getResponse(15, true); 
  gprs.println(F("AT+SAPBR=3,1,\"USER\",\"webgpr\""));
  getResponse(15, true); 
  gprs.println(F("AT+SAPBR=3,1,\"PWD\",\"webgprs2002\""));
  getResponse(15, true); 
  gprs.println(F("AT+CFUN=1"));        // Funcionalidad 0 mínima 1 máxima
  getResponse(15, true); 
  gprs.println(F("AT+SAPBR=1,1"));
  getResponse(15, true); 
  gprs.println(F("AT+SAPBR=2,1"));
  getResponse(15, true); 
  gprs.println(F("AT+HTTPINIT"));
  getResponse(15, true); 
  gprs.println(F("http://pprsar.com/cosme/commj_v2.php?id=111111111111&st=OFF&tm=0&po=0&rx=Er&si=19"));
  // gprs.println(F("http://dtaamerica.com/ws/commj_v2.php?id=111111111111&st=OFF&tm=0&po=0&rx=Er&si=19"));
  getResponse(25, true); 
  gprs.println(F("AT+HTTPACTION=0"));
  getResponse(4000, true); 
  gprs.println(F("AT+HTTPREAD"));
  getResponse(0, true);
  gprs.println(F("AT+HTTPTERM"));
  getResponse(30, true); 
}

String getResponse(int wait, bool response){
  String result = "";
  delay(wait);
  unsigned long iTimer = millis();
  while(!gprs.available() && (millis() - iTimer) <= 1000) {
    delay(5);    
  }
  while(gprs.available() > 0) {
    result += (char)gprs.read();
    delay(1.5);
  }
  if (response) {
    Serial.println(result);
  }
  return result;
}

void testWatchdog() {
  delay(3000);
  Serial.println(F("» Bloqueos del procesador (Watchdog):"));
  wdt_enable(WDTO_8S);
  for (byte i = 0; i < 4; i++) {
    Serial.println(F("  ~ Demora de 4 segundos"));
    delay(4000);
    systemWatchDog();
  }
  Serial.print(F("\n    -> El sistema se reiniciará en 8 segundos"));
  for (byte i = 0; i < 8; i++) {
    Serial.print(F("."));
    delay(1000);
  }
}

void systemWatchDog() {
  wdt_reset();
  pinMode(watchDogPin, OUTPUT);         // Sink current to drain charge from C2
  digitalWrite(watchDogPin, LOW);
  delay(100);                           // Give enough time for C2 to discharge (should discharge in 50 ms)     
  pinMode(watchDogPin, INPUT);          // Return to high impedance
}
