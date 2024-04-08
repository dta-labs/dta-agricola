/*************************************************
 *                   GATEWAY                     *
 *************************************************/

#include <SPI.h>
#include <LoRa.h>

const long frequency = 433E6; // 433E6 or 915E6, the MHz speed of module
String nodos[] = {"DTA_01","DTA_02"};
byte idx = 0;
byte repeat = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial);
  while (!LoRa.begin(frequency)) {
    Serial.println("LoRa init failed. Check your connections.");
    delay(1);
  }
  Serial.println();
  Serial.println(F("LoRa Simple Gateway"));
  Serial.println();
}

void loop() {
  onReceive();
  if (runEvery(10000)) {
    String message = "DTA_FF," + nodos[idx] + ",0";
    LoRa_sendMessage(message);
    Serial.print("\nSend Message to " + nodos[idx]);
    repeat++;
    if (repeat == 3) {
      idx = idx == 0 ? 1 : 0;
      repeat = 0;
    }
  }
}

void LoRa_sendMessage(String message) {
  LoRa.beginPacket(); 
  LoRa.print(message);
  LoRa.endPacket(true);
}

void onReceive() {
  if (LoRa.parsePacket() > 0) {
    String message = "";
    while (LoRa.available()) {
      message += (char)LoRa.read();
    }
    Serial.print(F(" -> ")); Serial.println(message);
    idx = idx == 0 ? 1 : 0;
    repeat = 0;
  } 
}

boolean runEvery(unsigned long interval) {
  static unsigned long previousMillis = 0;
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    return true;
  }
  return false;
}
