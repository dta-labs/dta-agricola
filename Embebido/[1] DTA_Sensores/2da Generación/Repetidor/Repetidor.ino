/*
 * Repetidor LoRa half-duplex store-and-forward.
 * Escanea SF7..SF12, retransmite DATA hacia el gateway y devuelve su ACK al nodo.
 * RadioLib: https://github.com/jgromes/RadioLib
 */
#include <Arduino.h>
#include <RadioLib.h>

static const uint8_t PIN_NSS = 10;
static const uint8_t PIN_DIO0 = 2;
static const uint8_t PIN_RST = 9;
static const uint8_t PIN_DIO1 = 3;
static const float FREQUENCY_MHZ = 915.0;
static const float BANDWIDTH_KHZ = 125.0;
static const uint8_t REPEATER_ID = 100;
static const uint16_t SCAN_WINDOW_MS = 900;
static const uint16_t ACK_TIMEOUT_MS = 1800;

enum FrameType : uint8_t { DATA = 1, ACK = 2 };
struct __attribute__((packed)) DataFrame {
  uint8_t version, type, source, destination;
  uint16_t sequence;
  uint8_t ttl, spreadingFactor;
  int16_t batteryMilliVolts, sensorValue;
};
struct __attribute__((packed)) AckFrame {
  uint8_t version, type, source, destination;
  uint16_t sequence;
  uint8_t ttl, nextSpreadingFactor;
  int8_t nextPowerDbm;
  uint32_t sleepSeconds;
};

SX1276 radio = new Module(PIN_NSS, PIN_DIO0, PIN_RST, PIN_DIO1);
uint8_t scanSf = 7;

// Evita repetir inmediatamente una copia directa y otra retransmitida.
uint8_t lastSource = 0;
uint16_t lastSequence = 0;
uint32_t lastForwardedAt = 0;

static void fatalBlink() {
  pinMode(LED_BUILTIN, OUTPUT);
  while (true) {
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    delay(150);
  }
}

static bool recentlyForwarded(const DataFrame &f) {
  return f.source == lastSource && f.sequence == lastSequence &&
         millis() - lastForwardedAt < 15000UL;
}

void setup() {
  Serial.begin(9600);
  int16_t state = radio.begin(
    FREQUENCY_MHZ, BANDWIDTH_KHZ, scanSf, 7,
    RADIOLIB_SX127X_SYNC_WORD, 17, 8
  );
  if (state != RADIOLIB_ERR_NONE) fatalBlink();
  radio.setCRC(true);
}

void loop() {
  radio.setSpreadingFactor(scanSf);
  uint8_t raw[sizeof(DataFrame)] = {0};
  int16_t state = radio.receive(raw, sizeof(raw), SCAN_WINDOW_MS);

  if (state == RADIOLIB_ERR_NONE) {
    DataFrame data = {};
    memcpy(&data, raw, sizeof(data));
    if (data.version == 1 && data.type == DATA && data.ttl > 0 &&
        !recentlyForwarded(data)) {
      lastSource = data.source;
      lastSequence = data.sequence;
      lastForwardedAt = millis();
      data.ttl--;

      // Conserva el SF original: el gateway y el nodo esperan respuesta en él.
      radio.setSpreadingFactor(data.spreadingFactor);
      delay((uint16_t)random(30, 180)); // Reduce colisiones entre repetidores.
      if (radio.transmit((uint8_t *)&data, sizeof(data)) == RADIOLIB_ERR_NONE) {
        uint8_t ackRaw[sizeof(AckFrame)] = {0};
        state = radio.receive(ackRaw, sizeof(ackRaw), ACK_TIMEOUT_MS);
        if (state == RADIOLIB_ERR_NONE) {
          AckFrame ack = {};
          memcpy(&ack, ackRaw, sizeof(ack));
          if (ack.version == 1 && ack.type == ACK &&
              ack.destination == data.source &&
              ack.sequence == data.sequence && ack.ttl > 0) {
            ack.ttl--;
            radio.transmit((uint8_t *)&ack, sizeof(ack));
          }
        }
      }
    }
  }

  scanSf = (scanSf >= 12) ? 7 : scanSf + 1;
}
