#include <SoftwareSerial.h>

SoftwareSerial lora(10, 11); // RX, TX
const int nodeID = 1; // Identificador del nodo
int updateInterval = 1000; // Intervalo de actualización en milisegundos

void setup() {
  Serial.begin(9600);
  lora.begin(9600);

  // Configurar dirección y ID de red
  lora.println("AT+ADDRESS=" + String(nodeID));
  delay(100);
  lora.println("AT+NETWORKID=1");
  delay(100);

  // Configurar parámetros de RF
  lora.println("AT+PARAMETER=9,7,1,12");
  delay(100);

  // Configurar frecuencia
  lora.println("AT+BAND=915000000");
  delay(100);

  // Configurar potencia de salida
  lora.println("AT+CRFOP=22");
  delay(100);

  // Configurar modo repetidor
  lora.println("AT+MODE=0");
  delay(100);
}

void loop() {
  // Leer el valor analógico del pin A0
  int analogValue = analogRead(A0);
  String dataToSend = String(nodeID) + "," + String(analogValue);

  // Enviar el identificador y el valor analógico
  lora.print("AT+SEND=2,");
  lora.print(dataToSend.length());
  lora.print(",");
  lora.println(dataToSend);
  delay(updateInterval); // Esperar el intervalo de actualización

  // Retransmitir los datos recibidos
  if (lora.available()) {
    String receivedData = lora.readString();
    Serial.println(receivedData);

    // Verificar si el mensaje es una actualización del intervalo
    if (receivedData.startsWith("UPDATE_INTERVAL")) {
      int newInterval = receivedData.substring(15).toInt();
      if (newInterval > 0) {
        updateInterval = newInterval;
        Serial.println("Nuevo intervalo de actualización: " + String(updateInterval));
      }
    } else {
      lora.print("AT+SEND=2,");
      lora.print(receivedData.length());
      lora.print(",");
      lora.println(receivedData);
    }
  }
}



===============================

#include <SoftwareSerial.h>

SoftwareSerial lora(10, 11); // RX, TX

void setup() {
  Serial.begin(9600);
  lora.begin(9600);

  // Configurar dirección y ID de red del gateway
  lora.println("AT+ADDRESS=2");
  delay(100);
  lora.println("AT+NETWORKID=1");
  delay(100);

  // Configurar parámetros de RF
  lora.println("AT+PARAMETER=9,7,1,12");
  delay(100);

  // Configurar frecuencia
  lora.println("AT+BAND=915000000");
  delay(100);

  // Configurar potencia de salida
  lora.println("AT+CRFOP=22");
  delay(100);

  // Configurar modo de recepción
  lora.println("AT+MODE=0");
  delay(100);
}

void loop() {
  // Recibir datos de los nodos
  if (lora.available()) {
    String receivedData = lora.readString();
    Serial.println("Datos recibidos: " + receivedData);

    // Enviar comando para actualizar el intervalo de actualización
    String updateCommand = "UPDATE_INTERVAL2000"; // Cambiar a 2000 ms
    lora.print("AT+SEND=1,");
    lora.print(updateCommand.length());
    lora.print(",");
    lora.println(updateCommand);
  }
}
