/************************************************************************************ 
*                                                                                   *
*      nodeTo,nodeFrom,length,data                                                  *
*         |       |      |     |                                                    *
*         |       |      |     +--- Dato -> INTERVAL:<< valor >>                    *
*         |       |      |     +--- Dato -> DATA:<< dato >>                         *
*         |       |      +--------- Longitud del dato                               *
*         |       +---------------- Nodo transmisor (DTA_01)                        *
*         +------------------------ Nodo destino (DTA_00 | DTA_FF para todos)       *
*                                                                                   *
*************************************************************************************/

#ifndef SoftwareSerial_h
#include <SoftwareSerial.h>
#endif

class LoRaDevice {

  private:

    SoftwareSerial lora;
    String nodeID;                // Identificador del nodo
    int nodeType = 0;             // 0 - Nodo | 1 - Gateway
    int frequence = 433;          // Frecuencia de trabajo del módulo
    int updateInterval = 5000;    // Intervalo de actualización en milisegundos

  public:

    LoRaDevice(int rxPin, int txPin, String id): lora(rxPin, txPin) {
      nodeID = id;
    }

    void begin() {
      lora.begin(9600);
      sendCommand("AT+ADDRESS=" + nodeID);                    // Configurar dirección y ID de red
      sendCommand("AT+NETWORKID=1");
      sendCommand("AT+PARAMETER=9,7,1,12");                   // Configurar parámetros de RF (expansión 7~12*, ancho de banda 7*~9, corrección de errores 1~4*, preámbulo)
      sendCommand("AT+BAND=" + String(frequence) + "000000"); // Configurar frecuencia
      sendCommand("AT+CRFOP=22");                             // Configurar potencia de salida
      sendCommand("AT+MODE=0");                               // Configurar modo repetidor
    }

    String readData() {
      String receivedData = "";
      if (lora.available()) {
        receivedData = lora.readString();
        if (receivedData.indexOf("INTERVAL:") != -1) {            // Verificar si el mensaje es una actualización del intervalo
          setUpdateInterval(receivedData);
        } else if (receivedData.startsWith(nodeID)) {             // Verificar si el mensaje es para el nodo
          String myData = receivedData.substring(nodeID.length() + 1);
          Serial.println("Lectura: " + myData);
          if (nodeType == 1) { responseToEmiter(receivedData); }
        } else {                                              // Retransmisión del mensaje
          sendData(receivedData);
        }
      }
      return receivedData;
    }

    void sendData(String dataToSend) {
      sendCommand("AT+SEND=2," + String(dataToSend.length()) + "," + dataToSend);
    }

    void setNodeID(String newID) {
      nodeID = newID;
      sendCommand("AT+ADDRESS=" + nodeID);
      delay(updateInterval); // Esperar el intervalo de actualización
    }

    void setFrequence(int newFrequence) {
      frequence = newFrequence;
      sendCommand("AT+BAND=" + String(frequence) + "000000");
    }

    void setNodeType(int newNodeType) {
      nodeType = newNodeType;
    }

  private:

    void responseToEmiter(String receivedData) {

    }

    void sendCommand(String command) {
      lora.println(command);
      delay(100);
    }

    void setUpdateInterval(String receivedData) {
      int newInterval = receivedData.substring(9).toInt();
      if (newInterval > 0) {
        updateInterval = newInterval;
        Serial.println("Nuevo intervalo de actualización: " + String(updateInterval));
      }
    }

};
