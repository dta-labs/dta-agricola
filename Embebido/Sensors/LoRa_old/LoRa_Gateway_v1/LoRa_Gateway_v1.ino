/*************************************************
 *                   GATEWAY                     *
 *************************************************/

#include <SPI.h>
#include <LoRa.h>
#include <SoftwareSerial.h>
// #include <avr/wdt.h>

#include "LowPower.h"
#include "miscelaneas.h"
#include "analogicSensor.h"
#include "configuracion.h"
#include "comunicaciones.h"

static String dato = "";      //
static int iteracion = 0;     //
static int indice = 0;        //

void setup() {
  // wdt_disable();
  Serial.begin(115200);
  while (!Serial);  
  Serial.print("\n\n>>> LoRa Gateway: "); Serial.println(gatewayAddress);
  while (!LoRa.begin(433E6)) { // 433E6 or 915E6, the MHz speed of module
    Serial.println("Starting LoRa failed!");
    delay(1);
  }
  // wdt_enable(WDTO_8S);
  comunicaciones(false);
}
 
void loop() {
  // sendRequests();
  
  if (iteracion == 0) {
    enviarSolicitud();        //
  }
  iteracion++;
  bool siDato = leerLoRa();   //
  if (siDato) {
    Serial.println(dato);
    // preocesarDato();
    // enviarDato();
    reiniciarCiclo();         //
  }
  if (iteracion >= 1000) {
    reiniciarCiclo();         //
  }
}

void enviarSolicitud() {      //
  String newNodeAddress = nodesID[indice];
  Serial.print(F("nodeAddress: ")); Serial.print(newNodeAddress);
  leerNodo(newNodeAddress);
  Serial.println();
  indice++;
}

void leerNodo(String nodeAddress) { //
  bool result = false;
  if (indice == 0) {
    measurements[idx] = readAnalogicData(sensor);
    voltages[idx] = readVcc();
    mostrarDato(true);
  } else {
    enviarLorRa(nodeAddress);
  }
}

void mostrarDato(bool show) { //
  Serial.print(F(" = ")); Serial.print((String)measurements[indice]);  Serial.print(",");  Serial.print((String)voltages[indice]); 
}

void enviarLorRa(String nodeAddress) {  //
  String solicitud = String(gatewayAddress) + "," + String(nodeAddress) + "," + String(sleepingTime);
  Serial.println("  " + solicitud);
  LoRa.beginPacket();
  LoRa.print(solicitud);  
  LoRa.endPacket();
}

bool leerLoRa() {             //
  if (!LoRa.parsePacket()) return false; 
  dato = "";
  while (LoRa.available()) {
    dato += (char)LoRa.read();
  } 
  bool result = dato.indexOf("DTA_") != -1 ? true : false;
  if (result) dato = dato.substring(dato.indexOf("DTA_"));
  return result;
}

void preocesarDato() {

}

void enviarDato() {

}

void reiniciarCiclo() {       //
  if (indice >= numSensors) {
    indice = 0;
    // sendDataHTTP();
    sleepFor(sleepingTime);
    Serial.println(F("\nNuevo ciclo..."));
    // resetSoftware();
  }
}

#pragma region Cógio base

// void sendRequests() {
//   String newNodeAddress = nodeAddress + String(idx + 1);
//   Serial.print(F("nodeAddress: ")); Serial.print(newNodeAddress);
//   requestNode(newNodeAddress);
//   Serial.println();
//   idx++;
//   if (idx >= numSensors) {
//     idx = 0;
//     sendDataHTTP();
//     sleepFor(sleepingTime);
//     Serial.println(F("\nNuevo ciclo..."));
//     // resetSoftware();
//   }
// }

// void requestNode(String nodeAddress) {
//   // float value = 0;
//   bool result = false;
//   if (nodeAddress == String(baseNodeAddress) + "1") {
//     measurements[idx] = readAnalogicData(sensor);
//     voltages[idx] = readVcc();
//     showData(true);
//   } else {
//     sendSingleRequest(nodeAddress);
//     delay(3000);
//     // int iter = 1;
//     // do { 
//       String data = receiveData();
//       // Serial.println(data);
//       result = getDataValue(data, nodeAddress); 
//     //   iter++;
//     //   // delay(5);
//     // } while (!result && iter <= 10);
//     showData(result);
//   }
// }

// void showData(bool show) {
//   Serial.print(F(" = ")); Serial.print((String)measurements[idx]);  Serial.print(",");  Serial.print((String)voltages[idx]); 
// }

// void sendSingleRequest(String nodeAddress) {
//   String data = String(gatewayAddress) + "," + String(nodeAddress) + "," + String(sleepingTime);
//   LoRa.beginPacket();
//   LoRa.print(data);  
//   LoRa.endPacket();
// }

// String receiveData() {
//   String inString = "";
//   for (int loop = 1; loop < 500; loop++) {
//     int packetSize = LoRa.parsePacket();
//     if (packetSize) { 
//       while (LoRa.available()) {
//         int inChar = LoRa.read();
//         inString += (char)inChar;
//       }
//       LoRa.packetRssi(); 
//     }
//     delay(10);
//     // wdt_reset();
//   }
//   return inString;   
// }

// bool getDataValue(String data, String nodeAddres) {
//   measurements[idx] = -99;
//   voltages[idx] = -99;
//   bool result = false;
//   Serial.print(data);
//   int strIdx = data.indexOf("DTA_");
//   if (strIdx != -1) {
//     data = data.substring(strIdx);
//     byte i = data.indexOf(',');
//     String from = data.substring(0, i);
//     String to = data.substring(i + 1, data.indexOf(',', i + 1));
//     result = from == nodeAddres && to == (String)gatewayAddress ? true : false;
//     // Serial.print(" -> " + from + "=" + nodeAddres + " | " + to + "=" + (String)gatewayAddress + " | " + idx + " | " + result);
//     if (result) {
//       i = data.indexOf(',', i + 1);
//       measurements[idx] = data.substring(i + 1, data.length()).toFloat();
//       i = data.indexOf(',', i + 1);
//       voltages[idx] = data.substring(i + 1, data.length()).toFloat();
//     }
//   } 
//   return result;
// }

// void sendDataHTTP() {
//   showResult(measurements);
//   showResult(voltages);
//   comunicaciones(true);
// }

// void showResult(float list[maxNumSensors]) {
//   Serial.print(F("["));
//   for (int j = 0; j < numSensors; j++) {
//     Serial.print(list[j]); 
//     if (j < numSensors - 1) Serial.print(F(", ")); 
//   } 
//   Serial.println(F("]")); 
// }

void sleepFor(float minutes) {
  Serial.print(F("Sleeping for ")); Serial.print(minutes); Serial.println(F(" minutes..."));
  int time = 15 * minutes;
  for (int i = 0;  i  <= time ; i++) {
    LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
    // wdt_reset();
  }
  // while (!LoRa.begin(433E6)) { // 433E6 or 915E6, the MHz speed of module
  //   Serial.println("Starting LoRa failed!");
  //   delay(1);
  // }
}
#pragma endregion Cógio base