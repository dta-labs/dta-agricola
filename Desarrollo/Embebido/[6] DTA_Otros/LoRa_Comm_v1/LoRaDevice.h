/************************************************************************ 
*                                                                       *
*      nodeTo,nodeFrom,length,data                                      *
*         |       |      |     |                                        *
*         |       |      |     +--- Dato -> INTERVAL:<< valor >>        *
*         |       |      |     +--- Dato -> DATA:<< dato >>             *
*         |       |      +--------- Longitud del dato                   *
*         |       +---------------- Nodo transmisor                     *
*         +------------------------ Nodo destino                        *
*                                                                       *
*      Nodos:                                                           *
*      - DTA_00: Servidor                                               *
*      - DTA_01: Nodo                                                   *
*      - DTA_FF: Todos los nodos (Broadcasting)                         *
*                                                                       *
*************************************************************************/

#ifndef SoftwareSerial_h
#include <SoftwareSerial.h>
#endif

class LoRaDevice {

  private:

    #define GATEWAY_ID 1987
    #define NODO_ID 1655
    #define BROADCAST_ID 65535

    SoftwareSerial lora;
    String nodeID = "";                                       // 'DTA_00' - Gateway | 'DTA_0x' - Nodes | 'DTA_FF' - Broadcast
    int realID = NODO_ID;                                     // Nodo por defecto
    int nodeType = 0;                                         // 0 - Nodo | 1 - Gateway
    int frequence = 433;                                      // Frecuencia de trabajo del módulo
    unsigned long updateInterval = 5000;                      // Intervalo de actualización en milisegundos (5s por defecto)

  public:

    LoRaDevice(int rxPin, int txPin, String id): lora(rxPin, txPin) {
      nodeID = id;
    }

    void begin() {
      lora.begin(9600);
      Serial.println("\nInitializing LoRa device...\n");
      sendCommand("AT+ADDRESS=" + String(realID));            // Configurar ID del nodo
      sendCommand("AT+NETWORKID=2011");                       // Configurar ID de red
      sendCommand("AT+BAND=" + String(frequence) + "000000"); // Configurar frecuencia
      sendCommand("AT+PARAMETER=12,7,4,12");                  // Configurar parámetros de RF (expansión 7~12*, ancho de banda 7*~9, corrección de errores 1~4*, preámbulo <9,7,1,12>)
      sendCommand("AT+CRFOP=22");                             // Configurar potencia de salida
      sendCommand("AT+MODE=1");                               // Configurar modo { 0: Tx, 1: Rx, 2: Ahorro energía }
      sendCommand("AT+RX=5000");                              // Repetir los datos recidos
      sendCommand("AT+SLEEP=" + String(updateInterval));      // Configurar modo de ahorro de energía cuando no esté transmitiendo en ms
      Serial.println("\nLoRa device ready...\n");
    }

    String recibeData() {
      String receivedData = "";
      Serial.print("Receibing: ");
      if (lora.available()) {
        receivedData = lora.readString();
        Serial.println(receivedData);
        if (receivedData.indexOf("INTERVAL:") != -1) {
          setUpdateInterval(receivedData);                    // Actualizar intervalo
        } else if (receivedData.startsWith(nodeID) || (receivedData.startsWith("DTA_FF") && nodeType == 0)) {
          setNodeData(receivedData);                          // Recibir mensaje del nodo
        } else {
          txData(receivedData);                               // Retransmisión del mensaje
        }
      }
      if (receivedData != "") Serial.print(receivedData);
      Serial.println();
      delay(updateInterval);                                  // Esperar el intervalo de actualización en milisegundos
      return receivedData;
    }

    void sendInterval(int interval) {
      sendData("DTA_FF", "DTA_00", String(interval), "INTERVAL:");
      delay(updateInterval);              // Esperar el intervalo de actualización en segundos
    }

    void sendData(String nodeToSend, String nodeID, String dataToSend, String dataType = "DATA:") {
      dataToSend = nodeToSend + "," + nodeID + "," + String(dataToSend.length()) + "," + dataType + dataToSend;
      txData(dataToSend);
    }

    void setNodeID(String newID) {
      nodeID = newID;
      sendCommand("AT+ADDRESS=" + nodeID);
    }

    void setFrequence(int newFrequence) {
      frequence = newFrequence;
      sendCommand("AT+BAND=" + String(frequence) + "000000");
    }

    void setNodeType(int newNodeType) {
      nodeType = newNodeType;
      Serial.println("Node type: " + (nodeType == 0) ? "Repeater" : "Gateway");
    }

  private:

    void sendCommand(String command) {
      lora.println(command);
      Serial.println("Sending: " + command);
      delay(100);
    }

    void txData(String receivedData) {
      String sendingNodeID = receivedData.substring(0, 6) == "DTA_00" ? String(GATEWAY_ID) : String(NODO_ID);
      sendCommand("AT+MODE=0");
      sendCommand("AT+SEND=" + sendingNodeID + "," + receivedData);
      sendCommand("AT+MODE=1");
      delay(updateInterval);                                  // Esperar el intervalo de actualización en milisegundos
    }

    void setUpdateInterval(String receivedData) {
      unsigned long newInterval = receivedData.substring(9).toInt();
      if (newInterval > 0) {
        updateInterval = newInterval;
        sendInterval(updateInterval);
        Serial.println("Setting new update interval: " + String(updateInterval));
      }
      txData(receivedData);
    }

    void setNodeData(String receivedData) {
      int index = receivedData.indexOf("DATA:");
      String myData = index != -1 ? receivedData.substring(index) : "";
      Serial.println("Read: " + myData);
      if (nodeType == 1) { responseToEmiter(receivedData); }
    }

    void responseToEmiter(String receivedData) {
      String fromNode = receivedData.substring(0, 6);
      String toNode = receivedData.substring(7, 13);
      String data = "Done!";
      sendData(toNode, fromNode, String(data.length()), data);
    }

};
