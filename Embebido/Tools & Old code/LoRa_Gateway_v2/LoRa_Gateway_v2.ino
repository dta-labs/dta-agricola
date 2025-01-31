/*************************************************
 *                 GATEWAY v2                    *
 *************************************************/

#include <SPI.h>
#include <LoRa.h>
#include <SoftwareSerial.h>
#include <EEPROM.h>
#include <avr/wdt.h>

#include "LowPower.h"
#include "miscelaneas.h"
#include "configuracion.h"
#include "analogicSensor.h"
#include "commLoRa.h"
#include "comunicaciones.h"

void setup() {
  Serial.begin(115200);
  wdt_disable();                // Disable WDT
  while (!Serial);  
  Serial.print("\nLoRa Gateway: "); Serial.println(gatewayAddress); Serial.println();
  while (!LoRa.begin(433E6)) {  // 433E6 or 915E6, the MHz speed of module
    Serial.println("Starting LoRa failed!");
    delay(5);
  }
  idx = 0;
  wdt_enable(WDTO_8S);          // Enable WDT with a timeout of 8 seconds
  // comunicaciones(true);
}
 
void loop() {
  newNodeAddress = "0A";
  if (rxDataLoRa()) {
    // float measure = readAnalogicData(sensor);
    // float vcc = readVcc();
    // String data = "DTA," + String(measure) + "," + String(vcc);
    Serial.print("\nDTA,0x" + newNodeAddress +"," + (String)(gatewayAddress) + ":");
    // txData(data);
    // sleepFor(sleepingTime);
    // Serial.println(F("Nuevo ciclo..."));
  }
  // if (iterator == 0) { 
  //   Serial.print(F("\nNode Address: ")); Serial.print("0x" + newNodeAddress);
  //   txDataLora(); 
  // }
  // iterator++;
  // bool result = rxDataLoRa();
  // if (result || iterator > 50) {
  //   iterator = 0;
  //   updateVariables(value);
  // }
  // if (result) Serial.print(" = " + (String)value[0] + " " + (String)value[1]);
  wdt_reset();

  // sendSensorsRequests();
  // readSensorData();
  // restoreLoop();
}

void sendSensorsRequests() {
  newNodeAddress = parse(sensorsID, ',', idx);
  value[0] = -99; value[1] = -99;
  if ("0x" + newNodeAddress == String(gatewayAddress)) {
    Serial.print(F("\nNode Address: ")); Serial.print("0x" + newNodeAddress);
    value[0] = readAnalogicData(sensor);
    value[1] = readVcc();
    updateVariables(value);
    Serial.print(" = " + (String)value[0] + " " + (String)value[1]);
  } else {
    if (iterator == 0) { 
      Serial.print(F("\nNode Address: ")); Serial.print("0x" + newNodeAddress);
      txDataLora(); 
    }
    iterator++;
    wdt_reset();
  }
}

void readSensorData() {
  bool result = false;
  int iter = 0;
  delay(250);
  do {
    iter++;
    result = rxDataLoRa();
    wdt_reset();
  } while (!result && iter < 100);
  if (result || iterator > 10) {
    iterator = 0;
    updateVariables(value);
  }
  if (result) Serial.print(" = " + (String)value[0] + " " + (String)value[1]);
}

void updateVariables(float value[2]) {
  String comma = idx == 0 ? "" : ",";
  measurement += comma + (String)value[0];
  voltages += comma + (String)value[1];
  idx++;
}

void sendDataHTTP() {
  Serial.print("data=["); Serial.print(measurement); Serial.println("]");
  Serial.print("voltage=["); Serial.print(voltages); Serial.println("]");
  comunicaciones(false);
}

void restoreLoop() {
  if (idx >= numSensors) {
    Serial.println();
    idx = 0;
    sendDataHTTP();
    sleepFor(sleepingTime);
    // resetSoftware();
  }
}

void sleepFor(float minutes) {
  Serial.print(F("Sleeping for ")); Serial.print(minutes); Serial.println(F(" minutes..."));
  delay(10);
  int timeToSleep = 15 * minutes;
  for (int i = 0; i <= timeToSleep; i++) {
    LowPower.powerDown(SLEEP_4S, ADC_OFF, BOD_OFF);
    wdt_reset();
  }
}
