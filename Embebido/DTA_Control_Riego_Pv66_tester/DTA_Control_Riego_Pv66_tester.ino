/****************************************************************
 *                                                              *
 *                 Sistemas DTA Serie Pv66 v0.2.x               *
 *                                                              *
 *            Tester de sistemas de Movimiento Continuo         *
 *                                                              *
 *   ~ Salidas x 5                                              *
 *   ~ Entradas digitales x 2                                   *
 *   ~ Entradas analógicas x 2                                  *
 *   ~ Comunicación GSM                                         *
 *   ~ Geoposicionamiento (GPS)                                 *
 *   ~ Watchdog                                                 *
 *                                                              *
 ****************************************************************/

#include <SoftwareSerial.h>
#include <avr/wdt.h>
#include <TinyGPS.h>

SoftwareSerial gprs(2, 3);              // Rx, Tx: (2, 3) ~ Azul | (3, 2) ~ Rojo
TinyGPS gps;
SoftwareSerial ssGPS(12, 11);           // (12, 11) Tarjetas blancas | (13, 12) Tarjetas amarillas <<viejas>>
static byte plots = 5;
#define watchDogPin A3
#define offSet 4

void setup() {
  wdt_disable();
  Serial.begin(115200);
  for (byte i = 0; i < plots; i++) {
    pinMode(i + offSet, OUTPUT);
    digitalWrite(i + offSet, HIGH);
  }
  Serial.println(F(">>> DTA-Agrícola: Serie Pv66 v0.2.x"));
  Serial.println(F("    «Programa de prueba»"));
  wdt_enable(WDTO_8S);
}

void loop() {
  testActuadores();
  testSensores();
  testComunicaciones();
  testGeoposicionamiento();  
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
  systemWatchDog();
}

void testSensores() {
  delay(3000);
  Serial.println(F("» Sensores digitales (Entradas x 2):"));
  Serial.print(F("  ~ Sensor D9 (Seguridad): ")); Serial.println(digitalRead(9));
  delay(500);
  Serial.print(F("  ~ Sensor D10 (Voltaje 1): ")); Serial.println(digitalRead(10));
  delay(3000);
  Serial.println(F("» Sensores analógicos (Entradas x 2):"));
  Serial.print(F("  ~ Sensor A0 (Presión): ")); Serial.println(analogRead(A0));
  delay(500);
  Serial.print(F("  ~ Sensor A1 (Voltaje 2): ")); Serial.println(analogRead(A1));
  delay(500);
  Serial.println();
  systemWatchDog();
}

void testComunicaciones() {
  delay(3000);
  Serial.println(F("» Comunicaciones (GSM):"));
  gprs.begin(9600);
  gprs.listen();
  gprs.println(F("AT+IPR=9600"));      // Velocidad en baudios?
  getResponse(15, true, "AT+IPR=9600"); 
  gprs.println(F("AT"));               // Tarjeta SIM Lista? OK
  getResponse(15, true, "AT"); 
  gprs.println(F("AT+CGMI"));          // Fabricante del dispositivo?
  getResponse(15, true, "AT+CGMI"); 
  gprs.println(F("ATI"));              // Información del producto?
  getResponse(15, true, "ATI"); 
  gprs.println(F("AT+CGSN"));          // Número de serie?
  getResponse(15, true, "AT+CGSN"); 
  gprs.println(F("AT+IPR?"));          // Velocidad en baudios?
  getResponse(15, true, "AT+IPR?"); 
  gprs.println(F("AT+CBC"));           // Estado de la batería
  getResponse(15, true, "AT+CBC"); 
  gprs.println(F("AT+CFUN?"));         // Funcionalidad 0 mínima 1 máxima
  getResponse(15, true, "AT+CFUN?"); 
  gprs.println(F("AT+CGATT=1"));       // Tarjeta SIM insetada? +CPIN: READY OK
  getResponse(15, true, "AT+CGATT=1"); 
  gprs.println(F("AT+CPIN?"));         // Tarjeta SIM insetada? +CPIN: READY OK
  getResponse(15, true, "AT+CPIN?"); 
  gprs.println(F("AT+WIND=1"));        // Indicación de tarjeta SIM insetada? +CPIN: READY OK
  getResponse(15, true, "AT+WIND=1"); 
  gprs.println(F("AT+CREG?"));         // Tarjeta SIM registrada? +CREG: 0,1 OK 
  getResponse(15, true, "AT+CREG?"); 
  gprs.println(F("AT+CGATT?"));        // Tiene GPRS? +CGATT: 1 OK
  getResponse(15, true, "AT+CGATT?"); 
  gprs.println(F("AT+CSQ"));           // Calidad de la señal -  debe ser 9 o superior: +CSQ: 14,0 OK
  getResponse(15, true, "AT+CSQ"); 
  gprs.println(F("AT+CCLK?"));         // Fecha y Hora?
  getResponse(15, true, "AT+CCLK?"); 
  gprs.println(F("AT+COPS?"));         // Comañía telefónica?
  getResponse(15, true, "AT+COPS?"); 
  gprs.println(F("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\""));
  getResponse(15, true, "AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\""); 
  gprs.println(F("AT+SAPBR=3,1,\"APN\",\"internet.itelcel.com\""));
  getResponse(15, true, "AT+SAPBR=3,1,\"APN\",\"internet.itelcel.com\""); 
  gprs.println(F("AT+SAPBR=3,1,\"USER\",\"webgpr\""));
  getResponse(15, true, "AT+SAPBR=3,1,\"USER\",\"webgpr\""); 
  gprs.println(F("AT+SAPBR=3,1,\"PWD\",\"webgprs2002\""));
  getResponse(15, true, "AT+SAPBR=3,1,\"PWD\",\"webgprs2002\""); 
  gprs.println(F("AT+CFUN=1"));        // Funcionalidad 0 mínima 1 máxima
  getResponse(15, true, "AT+CFUN=1"); 
  gprs.println(F("AT+SAPBR=1,1"));
  getResponse(15, true, "AT+SAPBR=1,1"); 
  gprs.println(F("AT+SAPBR=2,1"));
  getResponse(15, true, "AT+SAPBR=2,1"); 
  gprs.println(F("AT+HTTPINIT"));
  getResponse(15, true, "AT+HTTPINIT"); 
  gprs.println(F("http://pprsar.com/cosme/commj_v2.php?id=111111111111&st=OFF&tm=0&po=0&rx=Er&si=19"));
  // gprs.println(F("http://dtaamerica.com/ws/commj_v2.php?id=111111111111&st=OFF&tm=0&po=0&rx=Er&si=19"));
  getResponse(25, true, "http://pprsar.com/cosme/commj_v2.php?id=111111111111&st=OFF&tm=0&po=0&rx=Er&si=19"); 
  gprs.println(F("AT+HTTPACTION=0"));
  getResponse(4000, true, "AT+HTTPACTION=0"); 
  gprs.println(F("AT+HTTPREAD"));
  getResponse(0, true, "AT+HTTPREAD");
  gprs.println(F("AT+HTTPTERM"));
  getResponse(30, true, "AT+HTTPTERM"); 
}

String getResponse(int wait, bool response, String smg){
  systemWatchDog();
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
    result += result != "" ? "" : smg;
    Serial.println(result);
  }
  systemWatchDog();
  return result;
}

void testGeoposicionamiento() {
  delay(3000);
  Serial.println(F("» Geoposicionamiento:"));
  ssGPS.begin(9600);
  ssGPS.listen();
  getPosition();  
}

float getPosition() {
  float lat_central = 28.67390757286584;                        // Parque tecnológico PIT3 
  float lon_central = -106.07978511264639;                      // Tec Monterrey Chihuahua
  float lat_actual = 0.0f;
  float lon_actual = 0.0f;
  float azimut = 0.0f;
  float errorGPS = 0.0f;
  if (parseGPSData()) {
    unsigned long age;
    gps.f_get_position(&lat_actual, &lon_actual, &age);
    azimut = gps.course_to(lat_central, lon_central, lat_actual, lon_actual);
    errorGPS = gps.hdop() == TinyGPS::GPS_INVALID_HDOP ? 0 : gps.hdop();
    printGPSData(lat_central, lon_central, lat_actual, lon_actual, azimut, errorGPS);
  }
  checkGPSConnection();
  return azimut;
}

bool parseGPSData() {
  bool newData = false;
  ssGPS.listen();
  // Se parsean por un segundo los datos del GPSy se reportan algunos valores clave
  for (unsigned long start = millis(); millis() - start < 10000;) {
    while (ssGPS.available()) {
      char c = ssGPS.read();
      Serial.write(c);                      // descomentar para ver el flujo de datos del GPS
      if (gps.encode(c)) newData = true;    // revisa si se completó una nueva cadena
    }
    systemWatchDog();
  }
  return newData;
}

float printGPSData(float lat_central, float lon_central, float flat, float flon, float azimut, int errorGPS) {
  Serial.print(lat_central, 6);
  Serial.print(F(","));
  Serial.print(lon_central, 6);
  Serial.print(F(" "));
  Serial.print(flat == TinyGPS::GPS_INVALID_F_ANGLE ? 0.0 : flat, 6);
  Serial.print(F(","));
  Serial.print(flon == TinyGPS::GPS_INVALID_F_ANGLE ? 0.0 : flon, 6);
  Serial.print(F(" "));
  Serial.print(gps.satellites() == TinyGPS::GPS_INVALID_SATELLITES ? 0 : gps.satellites());
  Serial.print(F(" "));
  Serial.print((int)azimut);
  Serial.print(F(" "));
  Serial.println(errorGPS);
}

void checkGPSConnection() {
  unsigned long chars;
  unsigned short sentences, failed;
  gps.stats(&chars, &sentences, &failed);
  if (chars == 0) {
    Serial.println(F("     Problema de conectividad con el GPS: revise el cableado"));
  }
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
  Serial.print(F("\n    -> El sistema se reiniciará en 12 segundos"));
  for (byte i = 0; i < 15; i++) {
    Serial.print(F("."));
    delay(1000);
  }
}

void systemWatchDog() {
  wdt_reset();
  pinMode(watchDogPin, OUTPUT);         // Sink current to drain charge from C2
  digitalWrite(watchDogPin, HIGH);
  delay(50);                            // Give enough time for C2 to discharge (should discharge in 50 ms)     
  // digitalWrite(watchDogPin, HIGH);
  pinMode(watchDogPin, INPUT);          // Return to high impedance
}
