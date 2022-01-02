/*
 * 
 * Sistemas DTA-J0008-1_v0.01 
 * 
 * Automatización de sistemas de Jardinería y Paisajismo
 * ~ Salidas:
 *   - 7 canales de 24V alterna
 *   - 1 interruptor multipropósito 110V 10A
 * ~ Entradas:
 *   - N/A
 * ~ Comunicación GSM
 * 
 */

#include <SoftwareSerial.h>

#pragma region Variables

// Comunicación GSM/GPRS
SoftwareSerial gprs(3, 4);                  // RX, TX
//String telefono = "526251477680";
String telefono = "111111111111";
String dataValue = "";
String httpServer = "AT+HTTPPARA=\"URL\",\"http://pprsar.com/cosme/commj.php?id=" + telefono;

//Actuadores y variables
int pinBomba = 5;
int pinRiego1 = 6;
int pinRiego2 = 7;
int pinRiego3 = 8;
int pinRiego4 = 9;
int pinRiego5 = 10;
int pinRiego6 = 11;
int pinRiego7 = 12;
String statusVar = "OFF";
String irrigationVar = "m";
int plots = 7;
int velocityVar = 0;
int position = 0;

#pragma endregion Variables

void setup() {
  Serial.begin(9600);
  pinMode(pinBomba, OUTPUT);
  pinMode(pinRiego1, OUTPUT);
  pinMode(pinRiego2, OUTPUT);
  pinMode(pinRiego3, OUTPUT);
  pinMode(pinRiego4, OUTPUT);
  pinMode(pinRiego5, OUTPUT);
  pinMode(pinRiego6, OUTPUT);
  pinMode(pinRiego7, OUTPUT);
  apagar();
  Serial.println("*************** Configurando el equipo ****************");
}

void loop()
{
  Serial.println("********************* Nuevo ciclo *********************");
  setupGSM();
  comunicaciones();
  acciones();
}

#pragma region Acciones

void acciones() {
  if ((irrigationVar == "s" || irrigationVar == "a") && statusVar == "ON") {
    digitalWrite(pinBomba, LOW);                        // Bomba de agua encendida
    for ( int i = position; i < plots; i++) {
      Serial.println("Encendiendo el lote No: " + (String)(i + 1));
      position = i;
      digitalWrite(i + 6, LOW);                         // Encendido
      for (int t = 0; t < velocityVar; t++) { 
        delay(60000);
        setupGSM();
        comunicaciones();
        if (statusVar == "OFF") {
          return;
        }
      }
      digitalWrite(i + 6, HIGH);                        // Apagado
    }
  } else {
    apagar();
    delay(60000);
  }
}

void apagar() {
  digitalWrite(pinBomba, HIGH);  // Apagado
  digitalWrite(pinRiego1, HIGH); // Apagado
  digitalWrite(pinRiego2, HIGH); // Apagado
  digitalWrite(pinRiego3, HIGH); // Apagado
  digitalWrite(pinRiego4, HIGH); // Apagado
  digitalWrite(pinRiego5, HIGH); // Apagado
  digitalWrite(pinRiego6, HIGH); // Apagado
  digitalWrite(pinRiego7, HIGH); // Apagado
}

#pragma endregion Acciones

#pragma region Comunicaciones

void setupGSM() {
  gprs.begin(9600);
  dataValue.reserve(500);
  gprs.println("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"");
  getResponse(50, false); 
  gprs.println("AT+SAPBR=3,1,\"internet.itelcel.com\",\"webgpr\",\"webgprs2002\"");
  getResponse(50, false); 
  gprs.println("AT+SAPBR=1,1");
  getResponse(50, false); 
  gprs.println("AT+HTTPINIT");
  getResponse(50, false); 
}

void comunicaciones() {
  Serial.println("Comunicación con el servidor");
  httpRequest("");                                                // Get Settings from HTTP
  String aux = "";
  aux = parse(dataValue, '"', 1);                                 // > irrigation
  irrigationVar = (aux == "m" || aux == "s" || aux == "a") ? aux : irrigationVar;
  aux = parse(dataValue, '"', 2);                                 // > status
  statusVar = (aux == "ON" || aux == "OFF") ? aux : statusVar;
  aux = parse(dataValue, '"', 3);                                 // > plots
  plots = (aux != "") ? aux.toInt() : plots;
  aux = parse(dataValue, '"', 4);                                 // > velocity
  velocityVar = (aux != "") ? aux.toInt() : velocityVar;
  aux = parse(dataValue, '"', 5);                                 // > position
  position = (aux != "") ? aux.toInt() : position;
  String iVal = irrigationVar == "a" ? "automático" : irrigationVar == "s" ? "semiautomático" : "manual";
  Serial.println("> irrigation: " + iVal);
  Serial.println("> status: " + statusVar);
  Serial.println("> fields: " + plots);
  Serial.println("> velocity: " + (String)velocityVar + " min");
  Serial.println("> position: " + (String)position);
}

void httpRequest(String var) {
  Serial.print(httpServer);
  Serial.print("&status=" + statusVar + "&plots=" + (String)plots);
  Serial.println("&velocity=" + (String)velocityVar + "&position=" + (String)position);
  gprs.print(httpServer);
  gprs.print("&status=" + statusVar + "&plots=" + (String)plots);
  gprs.print("&velocity=" + (String)velocityVar + "&position=" + (String)position);
  gprs.println("\"");
  getResponse(50, false); 
  gprs.println("AT+HTTPACTION=0");
  getResponse(4000, true); 
  gprs.println("AT+HTTPREAD");
  getResponse(150, true); 
}

void getResponse(int wait, bool response) {
  dataValue = "";
  delay(wait);
  while(gprs.available()) {
    if (response) {
      if (gprs.available() > 0) {
        dataValue += (char)gprs.read();
      }
    } else {
      if (gprs.find("OK")){
        return;
      }
    }
  }
  // dataValue = "\"s\"ON\"3\"1\"";
  if (response) {
      Serial.println(dataValue);
  }
}

String parse(String data, char separator, int index) {
  int found = 0;
  int strIndex[] = {0, -1};
  int maxIndex = data.length()-1;

  for(int i=0; i<=maxIndex && found<=index; i++) {
    if(data.charAt(i)==separator || i==maxIndex) {
        found++;
        strIndex[0] = strIndex[1]+1;
        strIndex[1] = (i == maxIndex) ? i+1 : i;
    }
  }
  return found>index ? data.substring(strIndex[0], strIndex[1]) : "";
}

#pragma endregion Comunicaciones
