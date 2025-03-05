#include <SoftwareSerial.h>

// Configuración de pines para SoftwareSerial
SoftwareSerial espSerial(3, 4); // RX = 3, TX = 4
unsigned long baud[] = {2400, 4800, 9600, 19200, 31250, 38400, 57600, 74880, 115200, 230400, 250000, 460800, 500000};
int i = 0;
bool fin = false;

void setup() {
  // Configuración de la velocidad de comunicación
  Serial.begin(9600);        // Comunicación con el monitor serie
  espSerial.begin(9600);   // Comunicación con el ESP8266 (ajusta si usa otra velocidad)

  Serial.println("Test de ESP8266...");
}

void loop() {

    testAutomatico();
    
  // testMAnual();
}

void testManual() {
  // Reenvío de datos del monitor serie al ESP8266
  if (Serial.available()) {
    String command = Serial.readString();
    espSerial.println(command); // Enviar al ESP8266
    Serial.print("Comando enviado: ");
    Serial.println(command);
  }
  // Reenvío de datos del ESP8266 al monitor serie
  if (espSerial.available()) {
    String response = espSerial.readString();
    Serial.print("Respuesta del ESP8266: ");
    Serial.println(response);
  }
}

void testAutomatico() {
  if (i < 13) {
    espSerial.begin(baud[i]);
    espSerial.println("AT");
    Serial.println("Comando AT enviado a " + String(baud[i]));
    while(!espSerial.available()) delay(1);
    if (espSerial.available()) {
      String response = espSerial.readString();
      Serial.print("Respuesta del ESP8266: ");
      Serial.println(response);
      delay(3000);
    }
    i++;
  } else if(!fin) {
    Serial.println("Test finalizado...");
    fin = true;
  } else {
    while(true) delay(1000);
  }
}
